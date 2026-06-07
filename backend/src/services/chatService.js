/**
 * Serviço de Chat (RF13) + RF29 (Enquetes)
 * Suporta chat privado no marketplace e chat em grupo da linha com entrega realtime.
 * Membership do grupo = line_enrollments (automático).
 */

const { query, shouldUseDatabase } = require("../config/database");
const { getUserById } = require("./userService");
const { listPassengerLinesByDate, listDriverOperationalLines } = require("./presenceService");
const { randomUUID } = require("crypto");

let privateConversations = [];
let groupChats = [];
let privateConversationSubscribers = {};
let groupConversationSubscribers = {};
let messageCounter = 0;
let conversationCounter = 0;

function nextMessageId() {
  messageCounter += 1;
  return `msg-${messageCounter}`;
}

function nextConversationId() {
  conversationCounter += 1;
  return `conv-${conversationCounter}`;
}

function nextPersistentId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function timestampToISOString(value) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function normalizeJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapDbConversation(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: "private",
    context: row.context || "marketplace",
    participantIds: [row.passenger_id, row.driver_id],
    messages: [],
    createdAt: timestampToISOString(row.created_at),
  };
}

function mapDbMessage(row) {
  return {
    id: row.id,
    conversationId: row.private_conversation_id || undefined,
    lineId: row.line_id || undefined,
    senderId: row.sender_id,
    type: row.type || "text",
    pollId: row.poll_id || undefined,
    text: row.text,
    status: row.status,
    retryScheduled: Boolean(row.retry_scheduled),
    readBy: normalizeJsonArray(row.read_by),
    timestamp: timestampToISOString(row.created_at),
  };
}

function mapDbPoll(row) {
  return {
    id: row.id,
    lineId: row.line_id,
    creatorId: row.creator_id,
    question: row.question,
    options: normalizeJsonArray(row.options),
    createdAt: timestampToISOString(row.created_at),
    closed: Boolean(row.closed),
  };
}

function findPrivateConversation(conversationId) {
  return (
    privateConversations.find(
      (conversation) => conversation.id === conversationId,
    ) || null
  );
}

function findGroupChat(lineId) {
  return groupChats.find((chat) => chat.lineId === lineId) || null;
}

async function findPrivateConversationDB(conversationId) {
  const result = await query(
    "SELECT * FROM private_conversations WHERE id = $1 LIMIT 1",
    [conversationId],
  );
  return mapDbConversation(result.rows[0]);
}

async function findPrivateConversationByParticipantsDB(passengerId, driverId) {
  const result = await query(
    `SELECT * FROM private_conversations
     WHERE passenger_id = $1 AND driver_id = $2
     LIMIT 1`,
    [passengerId, driverId],
  );
  return mapDbConversation(result.rows[0]);
}

async function listPrivateMessagesDB(conversationId) {
  const result = await query(
    `SELECT * FROM chat_messages
     WHERE private_conversation_id = $1
     ORDER BY created_at ASC`,
    [conversationId],
  );
  return result.rows.map(mapDbMessage);
}

async function listGroupMessagesDB(lineId) {
  const result = await query(
    `SELECT * FROM chat_messages
     WHERE line_id = $1
     ORDER BY created_at ASC`,
    [lineId],
  );
  return result.rows.map(mapDbMessage);
}

async function getGroupMembersDB(lineId) {
  const result = await query(
    `SELECT owner_driver_id, driver_id, NULL::text AS passenger_id
       FROM lines
      WHERE id = $1
     UNION ALL
     SELECT NULL::text AS owner_driver_id, NULL::text AS driver_id, passenger_id
       FROM line_enrollments
      WHERE line_id = $1`,
    [lineId],
  );
  const members = new Set();
  result.rows.forEach((row) => {
    if (row.owner_driver_id) members.add(row.owner_driver_id);
    if (row.driver_id) members.add(row.driver_id);
    if (row.passenger_id) members.add(row.passenger_id);
  });
  return [...members];
}

async function listPollsDB(lineId) {
  const result = await query(
    "SELECT * FROM chat_polls WHERE line_id = $1 ORDER BY created_at ASC",
    [lineId],
  );
  return result.rows.map(mapDbPoll);
}

function ensureAuthenticated(isAuthenticated) {
  if (!isAuthenticated) {
    return {
      success: false,
      error: "Usuário não autenticado",
    };
  }

  return null;
}

function isBlankMessage(text) {
  return !text || text.trim() === "";
}

function canAccessPrivateConversation(conversation, userId) {
  return conversation.participantIds.includes(userId);
}

async function createPrivateConversationDB(payload) {
  const { passengerId, driverId, context } = payload || {};

  if (!passengerId || !driverId) {
    return {
      success: false,
      error: "Dados da conversa inválidos",
    };
  }

  const existingConversation = await findPrivateConversationByParticipantsDB(
    passengerId,
    driverId,
  );

  if (existingConversation) {
    return {
      success: true,
      conversation: existingConversation,
    };
  }

  const id = nextPersistentId("conv");
  const result = await query(
    `INSERT INTO private_conversations (id, passenger_id, driver_id, context)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id, passengerId, driverId, context || "marketplace"],
  );

  return {
    success: true,
    conversation: mapDbConversation(result.rows[0]),
  };
}

async function sendPrivateMessageDB(payload) {
  const {
    conversationId,
    senderId,
    text,
    forceRealtimeFailure,
  } = payload || {};

  const conversation = await findPrivateConversationDB(conversationId);
  if (!conversation) {
    return {
      success: false,
      error: "Erro de conversa: conversa não encontrada",
    };
  }

  if (!canAccessPrivateConversation(conversation, senderId)) {
    return {
      success: false,
      error: "Você não tem permissão para enviar nesta conversa",
    };
  }

  if (isBlankMessage(text)) {
    return {
      success: false,
      error: "Mensagem vazia não é permitida",
    };
  }

  const result = await query(
    `INSERT INTO chat_messages (
       id, private_conversation_id, sender_id, text, status, retry_scheduled, read_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      nextPersistentId("msg"),
      conversationId,
      senderId,
      text.trim(),
      forceRealtimeFailure ? "pending-delivery" : "delivered",
      Boolean(forceRealtimeFailure),
      JSON.stringify([senderId]),
    ],
  );

  const message = mapDbMessage(result.rows[0]);

  if (!forceRealtimeFailure) {
    notifyPrivateConversation(conversation.id, message);
  }

  return {
    success: true,
    message: await enrichMessageWithSenderName(message),
  };
}

async function getPrivateMessagesDB(payload) {
  const { conversationId, userId } = payload || {};

  const conversation = await findPrivateConversationDB(conversationId);
  if (!conversation) {
    return {
      success: false,
      error: "Erro de conversa: conversa não encontrada",
    };
  }

  if (!canAccessPrivateConversation(conversation, userId)) {
    return {
      success: false,
      error: "Você não tem permissão para acessar esta conversa",
    };
  }

  return {
    success: true,
    messages: await enrichMessagesWithSenderNames(
      await listPrivateMessagesDB(conversationId),
    ),
  };
}

async function markPrivateMessagesAsReadDB(payload) {
  const { conversationId, userId } = payload || {};

  const conversation = await findPrivateConversationDB(conversationId);
  if (!conversation) {
    return {
      success: false,
      error: "Erro de conversa: conversa não encontrada",
    };
  }

  if (!canAccessPrivateConversation(conversation, userId)) {
    return {
      success: false,
      error: "Você não tem permissão para acessar esta conversa",
    };
  }

  const messages = await listPrivateMessagesDB(conversationId);
  let updatedCount = 0;

  await Promise.all(
    messages.map(async (message) => {
      if (message.senderId === userId || message.readBy.includes(userId)) return;
      updatedCount += 1;
      await query(
        `UPDATE chat_messages
            SET read_by = $2, status = 'visualized'
          WHERE id = $1`,
        [message.id, JSON.stringify([...message.readBy, userId])],
      );
    }),
  );

  return {
    success: true,
    updatedCount,
  };
}

async function sendGroupMessageDB(payload) {
  const { lineId, senderId, text } = payload || {};

  const hasAccess = await canAccessGroupDB(lineId, senderId);
  if (!hasAccess) {
    return { success: false, error: "Você não tem permissão para enviar neste grupo" };
  }

  if (isBlankMessage(text)) {
    return {
      success: false,
      error: "Mensagem vazia não é permitida",
    };
  }

  const result = await query(
    `INSERT INTO chat_messages (id, line_id, sender_id, text, read_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [nextPersistentId("msg"), lineId, senderId, text.trim(), JSON.stringify([senderId])],
  );

  const message = mapDbMessage(result.rows[0]);
  notifyGroupConversation(lineId, message, await getGroupMembersDB(lineId));

  return {
    success: true,
    message: await enrichMessageWithSenderName(message),
  };
}

async function getGroupMessagesDB(payload) {
  const { lineId, userId, markAsRead } = payload || {};

  const hasAccess = await canAccessGroupDB(lineId, userId);
  if (!hasAccess) {
    return { success: false, error: "Você não tem permissão para acessar este grupo" };
  }

  const messages = await listGroupMessagesDB(lineId);
  let readReceiptUpdated = false;

  if (markAsRead) {
    await Promise.all(
      messages.map(async (message) => {
        if (message.readBy.includes(userId)) return;
        readReceiptUpdated = true;
        await query(
          `UPDATE chat_messages
              SET read_by = $2,
                  status = CASE WHEN status = 'delivered' THEN 'visualized' ELSE status END
            WHERE id = $1`,
          [message.id, JSON.stringify([...message.readBy, userId])],
        );
      }),
    );
  }

  return {
    success: true,
    messages: await enrichMessagesWithSenderNames(messages),
    polls: await listPollsDB(lineId),
    readReceiptUpdated,
  };
}

async function createPollDB(lineId, creatorId, question, options) {
  if (!question || !question.trim()) return { success: false, error: "Pergunta é obrigatória" };
  if (!Array.isArray(options) || options.length < 2 || options.length > 4) {
    return { success: false, error: "Informe entre 2 e 4 opções" };
  }

  const isDriver = await isDriverOfLineDB(lineId, creatorId);
  if (!isDriver) return { success: false, error: "Somente o motorista pode criar enquetes" };

  const poll = {
    id: nextPersistentId("poll"),
    lineId,
    creatorId,
    question: question.trim(),
    options: options.map((text, i) => ({ id: `opt_${i}`, text: String(text).trim(), votes: [] })),
    closed: false,
  };

  const result = await query(
    `INSERT INTO chat_polls (id, line_id, creator_id, question, options, closed)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [poll.id, lineId, creatorId, poll.question, JSON.stringify(poll.options), false],
  );

  const pollMessageResult = await query(
    `INSERT INTO chat_messages (id, line_id, sender_id, type, poll_id, text, read_by)
     VALUES ($1, $2, $3, 'poll', $4, $5, $6)
     RETURNING *`,
    [
      nextPersistentId("msg"),
      lineId,
      creatorId,
      poll.id,
      `Enquete: ${poll.question}`,
      JSON.stringify([creatorId]),
    ],
  );

  notifyGroupConversation(
    lineId,
    mapDbMessage(pollMessageResult.rows[0]),
    await getGroupMembersDB(lineId),
  );

  return { success: true, poll: mapDbPoll(result.rows[0]) };
}

async function votePollDB(lineId, pollId, optionId, userId) {
  const hasAccess = await canAccessGroupDB(lineId, userId);
  if (!hasAccess) return { success: false, error: "Você não tem permissão" };

  const result = await query(
    "SELECT * FROM chat_polls WHERE line_id = $1 AND id = $2 LIMIT 1",
    [lineId, pollId],
  );
  const poll = mapDbPoll(result.rows[0]);
  if (!poll) return { success: false, error: "Enquete não encontrada" };
  if (poll.closed) return { success: false, error: "Enquete encerrada" };

  const option = poll.options.find((opt) => opt.id === optionId);
  if (!option) return { success: false, error: "Opção inválida" };

  const updatedOptions = poll.options.map((opt) => ({
    ...opt,
    votes: opt.id === optionId
      ? [...new Set([...normalizeJsonArray(opt.votes), userId])]
      : normalizeJsonArray(opt.votes).filter((voteUserId) => voteUserId !== userId),
  }));

  const update = await query(
    `UPDATE chat_polls
        SET options = $3
      WHERE line_id = $1 AND id = $2
      RETURNING *`,
    [lineId, pollId, JSON.stringify(updatedOptions)],
  );

  return { success: true, poll: mapDbPoll(update.rows[0]) };
}

async function getPollDB(lineId, pollId) {
  const result = await query(
    "SELECT * FROM chat_polls WHERE line_id = $1 AND id = $2 LIMIT 1",
    [lineId, pollId],
  );
  const poll = mapDbPoll(result.rows[0]);
  if (!poll) return { success: false, error: "Enquete não encontrada" };
  return { success: true, poll };
}

async function getInboxDB(userId, role) {
  const nameCache = new Map();
  const items = [];
  let totalUnread = 0;
  const accessibleLines = await getAccessibleLinesForUser(userId, role);
  const privateKeys = new Set();

  for (const line of accessibleLines) {
    const messages = await listGroupMessagesDB(line.lineId);
    const unreadCount = countUnreadInMessages(messages, userId);
    totalUnread += unreadCount;
    const { lastMessage, lastMessageAt } = getLastMessageInfo(messages);

    items.push({
      type: "group",
      lineId: line.lineId,
      title: line.name,
      subtitle: "Chat da linha",
      unreadCount,
      lastMessage,
      lastMessageAt,
    });

    if (role === "PASSENGER" && line.ownerDriverId) {
      const existingPrivate = await findPrivateConversationByParticipantsDB(
        userId,
        line.ownerDriverId,
      );
      const driverName = line.driverName || await resolveUserName(line.ownerDriverId, nameCache);
      const privateMessages = existingPrivate
        ? await listPrivateMessagesDB(existingPrivate.id)
        : [];
      const privateUnread = countUnreadInMessages(privateMessages, userId);
      totalUnread += privateUnread;
      const privateLast = getLastMessageInfo(privateMessages);

      items.push({
        type: "private",
        conversationId: existingPrivate?.id || null,
        otherUserId: line.ownerDriverId,
        otherUserName: driverName,
        lineId: line.lineId,
        lineName: line.name,
        subtitle: line.name,
        unreadCount: privateUnread,
        lastMessage: privateLast.lastMessage,
        lastMessageAt: privateLast.lastMessageAt,
        isNew: !existingPrivate,
      });

      if (existingPrivate) {
        privateKeys.add(existingPrivate.id);
      }
    }
  }

  const privateResult = await query(
    `SELECT * FROM private_conversations
     WHERE passenger_id = $1 OR driver_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );

  for (const row of privateResult.rows) {
    const conversation = mapDbConversation(row);
    if (privateKeys.has(conversation.id)) continue;

    const otherUserId = conversation.participantIds.find((id) => id !== userId);
    const otherUserName = await resolveUserName(otherUserId, nameCache);
    const messages = await listPrivateMessagesDB(conversation.id);
    const unreadCount = countUnreadInMessages(messages, userId);
    totalUnread += unreadCount;
    const { lastMessage, lastMessageAt } = getLastMessageInfo(messages);

    items.push({
      type: "private",
      conversationId: conversation.id,
      otherUserId,
      otherUserName,
      subtitle: "Chat privado",
      unreadCount,
      lastMessage,
      lastMessageAt,
      isNew: false,
    });
  }

  items.sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });

  return {
    success: true,
    totalUnread,
    items,
  };
}

function notifyPrivateConversation(conversationId, message) {
  const subscribers =
    privateConversationSubscribers[conversationId] || new Set();
  subscribers.forEach((subscriber) => {
    subscriber(message);
  });
}

function notifyGroupConversation(lineId, message, allowedUsers) {
  const subscribers = groupConversationSubscribers[lineId] || new Set();
  subscribers.forEach((subscriber) => {
    if (allowedUsers.includes(subscriber.userId)) {
      subscriber.callback(message);
    }
  });
}

async function createPrivateConversation(payload) {
  const { passengerId, driverId, context, isAuthenticated } = payload || {};

  const authError = ensureAuthenticated(isAuthenticated);
  if (authError) return authError;

  if (shouldUseDatabase()) {
    return createPrivateConversationDB(payload);
  }

  if (!passengerId || !driverId) {
    return {
      success: false,
      error: "Dados da conversa inválidos",
    };
  }

  const existingConversation = privateConversations.find((conversation) => {
    const participants = conversation.participantIds;
    return (
      participants.includes(passengerId) && participants.includes(driverId)
    );
  });

  if (existingConversation) {
    return {
      success: true,
      conversation: existingConversation,
    };
  }

  const newConversation = {
    id: nextConversationId(),
    type: "private",
    context: context || "marketplace",
    participantIds: [passengerId, driverId],
    messages: [],
    createdAt: new Date().toISOString(),
  };

  privateConversations.push(newConversation);

  return {
    success: true,
    conversation: newConversation,
  };
}

async function sendPrivateMessage(payload) {
  const {
    conversationId,
    senderId,
    text,
    isAuthenticated,
    forceRealtimeFailure,
  } = payload || {};

  const authError = ensureAuthenticated(isAuthenticated);
  if (authError) return authError;

  if (shouldUseDatabase()) {
    return sendPrivateMessageDB(payload);
  }

  const conversation = findPrivateConversation(conversationId);
  if (!conversation) {
    return {
      success: false,
      error: "Erro de conversa: conversa não encontrada",
    };
  }

  if (!canAccessPrivateConversation(conversation, senderId)) {
    return {
      success: false,
      error: "Você não tem permissão para enviar nesta conversa",
    };
  }

  if (isBlankMessage(text)) {
    return {
      success: false,
      error: "Mensagem vazia não é permitida",
    };
  }

  const message = {
    id: nextMessageId(),
    senderId,
    text: text.trim(),
    status: forceRealtimeFailure ? "pending-delivery" : "delivered",
    retryScheduled: Boolean(forceRealtimeFailure),
    readBy: [senderId],
    timestamp: new Date().toISOString(),
  };

  conversation.messages.push(message);

  if (!forceRealtimeFailure) {
    notifyPrivateConversation(conversation.id, message);
  }

  return {
    success: true,
    message: await enrichMessageWithSenderName(message),
  };
}

async function getPrivateMessages(payload) {
  const { conversationId, userId, isAuthenticated } = payload || {};

  const authError = ensureAuthenticated(isAuthenticated);
  if (authError) return authError;

  if (shouldUseDatabase()) {
    return getPrivateMessagesDB(payload);
  }

  const conversation = findPrivateConversation(conversationId);
  if (!conversation) {
    return {
      success: false,
      error: "Erro de conversa: conversa não encontrada",
    };
  }

  if (!canAccessPrivateConversation(conversation, userId)) {
    return {
      success: false,
      error: "Você não tem permissão para acessar esta conversa",
    };
  }

  return {
    success: true,
    messages: await enrichMessagesWithSenderNames([...conversation.messages]),
  };
}

async function markPrivateMessagesAsRead(payload) {
  const { conversationId, userId, isAuthenticated } = payload || {};

  const authError = ensureAuthenticated(isAuthenticated);
  if (authError) return authError;

  if (shouldUseDatabase()) {
    return markPrivateMessagesAsReadDB(payload);
  }

  const conversation = findPrivateConversation(conversationId);
  if (!conversation) {
    return {
      success: false,
      error: "Erro de conversa: conversa não encontrada",
    };
  }

  if (!canAccessPrivateConversation(conversation, userId)) {
    return {
      success: false,
      error: "Você não tem permissão para acessar esta conversa",
    };
  }

  let updatedCount = 0;
  conversation.messages.forEach((message) => {
    if (message.senderId !== userId && !message.readBy.includes(userId)) {
      message.readBy.push(userId);
      message.status = "visualized";
      updatedCount += 1;
    }
  });

  return {
    success: true,
    updatedCount,
  };
}

function subscribeToPrivateConversation(conversationId, userId, callback) {
  if (shouldUseDatabase()) {
    if (!privateConversationSubscribers[conversationId]) {
      privateConversationSubscribers[conversationId] = new Set();
    }
    privateConversationSubscribers[conversationId].add(callback);

    return () => {
      privateConversationSubscribers[conversationId].delete(callback);
    };
  }

  const conversation = findPrivateConversation(conversationId);
  if (!conversation || !canAccessPrivateConversation(conversation, userId)) {
    return () => {};
  }

  if (!privateConversationSubscribers[conversationId]) {
    privateConversationSubscribers[conversationId] = new Set();
  }

  privateConversationSubscribers[conversationId].add(callback);

  return () => {
    privateConversationSubscribers[conversationId].delete(callback);
  };
}

async function createLineGroupChat(payload) {
  const {
    lineId,
    ownerDriverId,
    driverIds = [],
    passengerIds = [],
  } = payload || {};

  if (!lineId || !ownerDriverId) {
    return {
      success: false,
      error: "Dados do grupo inválidos",
    };
  }

  if (shouldUseDatabase()) {
    const members = await getGroupMembersDB(lineId);
    if (!members.includes(ownerDriverId)) {
      return {
        success: false,
        error: "Você não tem permissão para gerenciar este grupo",
      };
    }
    return {
      success: true,
      group: {
        lineId,
        ownerDriverId,
        memberRoles: Object.fromEntries(
          members.map((memberId) => [memberId, memberId === ownerDriverId ? "DRIVER" : "PASSENGER"]),
        ),
        messages: [],
        polls: [],
        createdAt: new Date().toISOString(),
      },
    };
  }

  const existing = findGroupChat(lineId);
  if (existing) {
    return {
      success: true,
      group: existing,
    };
  }

  const memberRoles = {
    [ownerDriverId]: "DRIVER",
  };

  driverIds.forEach((driverId) => {
    memberRoles[driverId] = "DRIVER";
  });

  passengerIds.forEach((passengerId) => {
    memberRoles[passengerId] = "PASSENGER";
  });

  const group = {
    lineId,
    ownerDriverId,
    memberRoles,
    messages: [],
    polls: [],
    createdAt: new Date().toISOString(),
  };

  groupChats.push(group);

  return {
    success: true,
    group,
  };
}

function canAccessGroup(group, userId) {
  return Boolean(group.memberRoles[userId]);
}

function canManageGroup(group, actorId) {
  return group.memberRoles[actorId] === "DRIVER";
}

// RF29/RF13: verifica acesso via line_enrollments (DB path)
async function canAccessGroupDB(lineId, userId) {
  const res = await query(
    `SELECT 1 FROM line_enrollments WHERE line_id = $1 AND passenger_id = $2
     UNION
     SELECT 1 FROM lines WHERE id = $1 AND (owner_driver_id = $2 OR driver_id = $2)
     LIMIT 1`,
    [lineId, userId],
  );
  return res.rows.length > 0;
}

async function isDriverOfLineDB(lineId, userId) {
  const res = await query(
    `SELECT 1 FROM lines WHERE id = $1 AND (owner_driver_id = $2 OR driver_id = $2) LIMIT 1`,
    [lineId, userId],
  );
  return res.rows.length > 0;
}

// Auto-cria grupo em memória a partir dos membros da linha (DB ou mock)
async function getOrCreateGroup(lineId, ownerDriverId) {
  const existing = findGroupChat(lineId);
  if (existing) return existing;

  let memberRoles = {};
  if (ownerDriverId) memberRoles[ownerDriverId] = "DRIVER";

  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT l.owner_driver_id, l.driver_id, e.passenger_id
       FROM lines l LEFT JOIN line_enrollments e ON e.line_id = l.id
       WHERE l.id = $1`,
      [lineId],
    );
    if (!res.rows[0]) return null;
    const r0 = res.rows[0];
    memberRoles[r0.owner_driver_id] = "DRIVER";
    if (r0.driver_id) memberRoles[r0.driver_id] = "DRIVER";
    res.rows.forEach((r) => { if (r.passenger_id) memberRoles[r.passenger_id] = "PASSENGER"; });
  }

  const group = {
    lineId,
    ownerDriverId: ownerDriverId || Object.keys(memberRoles).find((k) => memberRoles[k] === "DRIVER"),
    memberRoles,
    messages: [],
    polls: [],
    createdAt: new Date().toISOString(),
  };
  groupChats.push(group);
  return group;
}

async function sendGroupMessage(payload) {
  const { lineId, senderId, text, isAuthenticated } = payload || {};

  const authError = ensureAuthenticated(isAuthenticated);
  if (authError) return authError;

  if (shouldUseDatabase()) {
    return sendGroupMessageDB(payload);
  }

  let group = await getOrCreateGroup(lineId, null);
  if (!group) {
    return { success: false, error: "Grupo não encontrado" };
  }

  const hasAccess = canAccessGroup(group, senderId)
    || (shouldUseDatabase() && await canAccessGroupDB(lineId, senderId));

  if (!hasAccess) {
    return { success: false, error: "Você não tem permissão para enviar neste grupo" };
  }

  if (isBlankMessage(text)) {
    return {
      success: false,
      error: "Mensagem vazia não é permitida",
    };
  }

  const message = {
    id: nextMessageId(),
    senderId,
    text: text.trim(),
    status: "delivered",
    readBy: [senderId],
    timestamp: new Date().toISOString(),
  };

  group.messages.push(message);

  const allowedUsers = Object.keys(group.memberRoles);
  notifyGroupConversation(lineId, message, allowedUsers);

  return {
    success: true,
    message: await enrichMessageWithSenderName(message),
  };
}

async function getGroupMessages(payload) {
  const { lineId, userId, isAuthenticated, markAsRead } = payload || {};

  const authError = ensureAuthenticated(isAuthenticated);
  if (authError) return authError;

  if (shouldUseDatabase()) {
    return getGroupMessagesDB(payload);
  }

  let group = await getOrCreateGroup(lineId, null);
  if (!group) {
    return { success: false, error: "Grupo não encontrado" };
  }

  const hasAccess = canAccessGroup(group, userId)
    || (shouldUseDatabase() && await canAccessGroupDB(lineId, userId));

  if (!hasAccess) {
    return { success: false, error: "Você não tem permissão para acessar este grupo" };
  }

  let readReceiptUpdated = false;

  if (markAsRead) {
    group.messages.forEach((message) => {
      if (!message.readBy.includes(userId)) {
        message.readBy.push(userId);
        if (message.status === "delivered") {
          message.status = "visualized";
        }
      }
    });

    readReceiptUpdated = true;
  }

  return {
    success: true,
    messages: await enrichMessagesWithSenderNames([...group.messages]),
    polls: group.polls ? [...group.polls] : [],
    readReceiptUpdated,
  };
}

async function addUserToGroupChat(payload) {
  const { lineId, userId, role, actorId } = payload || {};

  const group = findGroupChat(lineId);
  if (!group) {
    return {
      success: false,
      error: "Grupo não encontrado",
    };
  }

  if (!canManageGroup(group, actorId)) {
    return {
      success: false,
      error: "Você não tem permissão para gerenciar este grupo",
    };
  }

  group.memberRoles[userId] = role || "PASSENGER";

  return {
    success: true,
  };
}

async function removeUserFromGroupChat(payload) {
  const { lineId, userId, actorId } = payload || {};

  const group = findGroupChat(lineId);
  if (!group) {
    return {
      success: false,
      error: "Grupo não encontrado",
    };
  }

  if (!canManageGroup(group, actorId)) {
    return {
      success: false,
      error: "Você não tem permissão para gerenciar este grupo",
    };
  }

  delete group.memberRoles[userId];

  return {
    success: true,
  };
}

function subscribeToGroupConversation(lineId, userId, callback) {
  if (shouldUseDatabase()) {
    if (!groupConversationSubscribers[lineId]) {
      groupConversationSubscribers[lineId] = new Set();
    }

    const subscriber = {
      userId,
      callback,
    };

    groupConversationSubscribers[lineId].add(subscriber);

    return () => {
      groupConversationSubscribers[lineId].delete(subscriber);
    };
  }

  const group = findGroupChat(lineId);
  if (!group || !canAccessGroup(group, userId)) {
    return () => {};
  }

  if (!groupConversationSubscribers[lineId]) {
    groupConversationSubscribers[lineId] = new Set();
  }

  const subscriber = {
    userId,
    callback,
  };

  groupConversationSubscribers[lineId].add(subscriber);

  return () => {
    groupConversationSubscribers[lineId].delete(subscriber);
  };
}

// RF29 — Enquetes
async function createPoll(lineId, creatorId, question, options) {
  if (shouldUseDatabase()) {
    return createPollDB(lineId, creatorId, question, options);
  }

  if (!question || !question.trim()) return { success: false, error: "Pergunta é obrigatória" };
  if (!Array.isArray(options) || options.length < 2 || options.length > 4) {
    return { success: false, error: "Informe entre 2 e 4 opções" };
  }

  let group = await getOrCreateGroup(lineId, null);
  if (!group) return { success: false, error: "Grupo não encontrado" };

  const isDriver = shouldUseDatabase()
    ? await isDriverOfLineDB(lineId, creatorId)
    : group.memberRoles[creatorId] === "DRIVER";
  if (!isDriver) return { success: false, error: "Somente o motorista pode criar enquetes" };

  if (!group.polls) group.polls = [];

  const poll = {
    id: `poll_${Date.now()}`,
    lineId,
    creatorId,
    question: question.trim(),
    options: options.map((text, i) => ({ id: `opt_${i}`, text: String(text).trim(), votes: [] })),
    createdAt: new Date().toISOString(),
    closed: false,
  };
  group.polls.push(poll);

  // Publica como mensagem especial no grupo
  const pollMessage = {
    id: nextMessageId(),
    senderId: creatorId,
    type: "poll",
    pollId: poll.id,
    text: `📊 Enquete: ${poll.question}`,
    status: "delivered",
    readBy: [creatorId],
    timestamp: new Date().toISOString(),
  };
  group.messages.push(pollMessage);
  const allowedUsers = Object.keys(group.memberRoles);
  notifyGroupConversation(lineId, pollMessage, allowedUsers);

  return { success: true, poll };
}

async function votePoll(lineId, pollId, optionId, userId) {
  if (shouldUseDatabase()) {
    return votePollDB(lineId, pollId, optionId, userId);
  }

  let group = await getOrCreateGroup(lineId, null);
  if (!group) return { success: false, error: "Grupo não encontrado" };

  const hasAccess = shouldUseDatabase()
    ? await canAccessGroupDB(lineId, userId)
    : canAccessGroup(group, userId);
  if (!hasAccess) return { success: false, error: "Você não tem permissão" };

  if (!group.polls) return { success: false, error: "Enquete não encontrada" };
  const poll = group.polls.find((p) => p.id === pollId);
  if (!poll) return { success: false, error: "Enquete não encontrada" };
  if (poll.closed) return { success: false, error: "Enquete encerrada" };

  // Remove voto anterior do usuário em qualquer opção
  poll.options.forEach((opt) => {
    opt.votes = opt.votes.filter((v) => v !== userId);
  });

  const option = poll.options.find((o) => o.id === optionId);
  if (!option) return { success: false, error: "Opção inválida" };
  option.votes.push(userId);

  return { success: true, poll };
}

async function getPoll(lineId, pollId) {
  if (shouldUseDatabase()) {
    return getPollDB(lineId, pollId);
  }

  const group = findGroupChat(lineId);
  if (!group || !group.polls) return { success: false, error: "Enquete não encontrada" };
  const poll = group.polls.find((p) => p.id === pollId);
  if (!poll) return { success: false, error: "Enquete não encontrada" };
  return { success: true, poll };
}

function countUnreadInMessages(messages, userId) {
  return messages.filter(
    (message) => message.senderId !== userId && !message.readBy.includes(userId),
  ).length;
}

function getLastMessageInfo(messages) {
  if (!messages.length) return { lastMessage: null, lastMessageAt: null };
  const last = messages[messages.length - 1];
  return {
    lastMessage: last.type === "poll" ? last.text : last.text,
    lastMessageAt: last.timestamp,
  };
}

async function resolveUserName(userId, cache) {
  if (cache.has(userId)) return cache.get(userId);
  const user = await getUserById(userId);
  const name = user?.name || userId;
  cache.set(userId, name);
  return name;
}

async function enrichMessagesWithSenderNames(messages) {
  const nameCache = new Map();
  const uniqueIds = [
    ...new Set(messages.map((message) => message.senderId).filter(Boolean)),
  ];

  await Promise.all(
    uniqueIds.map(async (senderId) => {
      await resolveUserName(senderId, nameCache);
    }),
  );

  return messages.map((message) => ({
    ...message,
    senderName: nameCache.get(message.senderId) || message.senderId,
  }));
}

async function enrichMessageWithSenderName(message) {
  if (!message?.senderId) return message;
  const [enriched] = await enrichMessagesWithSenderNames([message]);
  return enriched;
}

async function getAccessibleLinesForUser(userId, role) {
  const today = new Date().toISOString().slice(0, 10);

  if (role === "DRIVER") {
    const result = await listDriverOperationalLines(userId);
    if (!result.success) return [];
    return (result.lines || []).map((line) => ({
      lineId: line.lineId,
      name: line.name || line.lineId,
      ownerDriverId: line.ownerDriverId,
    }));
  }

  const result = await listPassengerLinesByDate(userId, today);
  if (!result.success) return [];
  return (result.lines || []).map((line) => ({
    lineId: line.lineId,
    name: line.name || line.lineId,
    ownerDriverId: line.ownerDriverId,
    driverName: line.driverName,
  }));
}

async function getInbox(userId, role) {
  const authError = ensureAuthenticated(true);
  if (authError) return authError;

  if (!userId) {
    return { success: false, error: "Usuário inválido" };
  }

  if (shouldUseDatabase()) {
    return getInboxDB(userId, role);
  }

  const nameCache = new Map();
  const items = [];
  let totalUnread = 0;
  const accessibleLines = await getAccessibleLinesForUser(userId, role);
  const privateKeys = new Set();

  for (const line of accessibleLines) {
    let group = findGroupChat(line.lineId);
    if (!group) {
      group = await getOrCreateGroup(line.lineId, line.ownerDriverId || null);
    }

    const messages = group?.messages || [];
    const unreadCount = countUnreadInMessages(messages, userId);
    totalUnread += unreadCount;
    const { lastMessage, lastMessageAt } = getLastMessageInfo(messages);

    items.push({
      type: "group",
      lineId: line.lineId,
      title: line.name,
      subtitle: "Chat da linha",
      unreadCount,
      lastMessage,
      lastMessageAt,
    });

    if (role === "PASSENGER" && line.ownerDriverId) {
      const existingPrivate = privateConversations.find((conversation) => {
        const participants = conversation.participantIds;
        return (
          participants.includes(userId) && participants.includes(line.ownerDriverId)
        );
      });

      const driverName = line.driverName || await resolveUserName(line.ownerDriverId, nameCache);
      const privateMessages = existingPrivate?.messages || [];
      const privateUnread = countUnreadInMessages(privateMessages, userId);
      totalUnread += privateUnread;
      const privateLast = getLastMessageInfo(privateMessages);

      items.push({
        type: "private",
        conversationId: existingPrivate?.id || null,
        otherUserId: line.ownerDriverId,
        otherUserName: driverName,
        lineId: line.lineId,
        lineName: line.name,
        subtitle: line.name,
        unreadCount: privateUnread,
        lastMessage: privateLast.lastMessage,
        lastMessageAt: privateLast.lastMessageAt,
        isNew: !existingPrivate,
      });

      if (existingPrivate) {
        privateKeys.add(existingPrivate.id);
      }
    }
  }

  for (const conversation of privateConversations) {
    if (!conversation.participantIds.includes(userId)) continue;
    if (privateKeys.has(conversation.id)) continue;

    const otherUserId = conversation.participantIds.find((id) => id !== userId);
    const otherUserName = await resolveUserName(otherUserId, nameCache);
    const unreadCount = countUnreadInMessages(conversation.messages, userId);
    totalUnread += unreadCount;
    const { lastMessage, lastMessageAt } = getLastMessageInfo(conversation.messages);

    items.push({
      type: "private",
      conversationId: conversation.id,
      otherUserId,
      otherUserName,
      subtitle: "Chat privado",
      unreadCount,
      lastMessage,
      lastMessageAt,
      isNew: false,
    });
  }

  items.sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });

  return {
    success: true,
    totalUnread,
    items,
  };
}

async function getUnreadCount(userId, role) {
  const inbox = await getInbox(userId, role);
  if (!inbox.success) return inbox;
  return {
    success: true,
    count: inbox.totalUnread,
  };
}

async function clearChatDatabase() {
  privateConversations = [];
  groupChats = [];
  privateConversationSubscribers = {};
  groupConversationSubscribers = {};
  messageCounter = 0;
  conversationCounter = 0;
}

module.exports = {
  createPrivateConversation,
  sendPrivateMessage,
  getPrivateMessages,
  markPrivateMessagesAsRead,
  subscribeToPrivateConversation,
  createLineGroupChat,
  sendGroupMessage,
  getGroupMessages,
  addUserToGroupChat,
  removeUserFromGroupChat,
  subscribeToGroupConversation,
  createPoll,
  votePoll,
  getPoll,
  getInbox,
  getUnreadCount,
  clearChatDatabase,
};
