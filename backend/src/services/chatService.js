/**
 * Serviço de Chat (RF13) + RF29 (Enquetes)
 * Suporta chat privado no marketplace e chat em grupo da linha com entrega realtime.
 * Membership do grupo = line_enrollments (automático).
 */

const { query, shouldUseDatabase } = require("../config/database");

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
    message,
  };
}

async function getPrivateMessages(payload) {
  const { conversationId, userId, isAuthenticated } = payload || {};

  const authError = ensureAuthenticated(isAuthenticated);
  if (authError) return authError;

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
    messages: [...conversation.messages],
  };
}

async function markPrivateMessagesAsRead(payload) {
  const { conversationId, userId, isAuthenticated } = payload || {};

  const authError = ensureAuthenticated(isAuthenticated);
  if (authError) return authError;

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
    message,
  };
}

async function getGroupMessages(payload) {
  const { lineId, userId, isAuthenticated, markAsRead } = payload || {};

  const authError = ensureAuthenticated(isAuthenticated);
  if (authError) return authError;

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
    messages: [...group.messages],
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
  const group = findGroupChat(lineId);
  if (!group || !group.polls) return { success: false, error: "Enquete não encontrada" };
  const poll = group.polls.find((p) => p.id === pollId);
  if (!poll) return { success: false, error: "Enquete não encontrada" };
  return { success: true, poll };
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
  clearChatDatabase,
};
