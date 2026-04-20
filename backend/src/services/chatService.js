/**
 * Serviço de Chat (RF13)
 * Suporta chat privado no marketplace e chat em grupo da linha com entrega realtime.
 */

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

async function sendGroupMessage(payload) {
  const { lineId, senderId, text, isAuthenticated } = payload || {};

  const authError = ensureAuthenticated(isAuthenticated);
  if (authError) return authError;

  const group = findGroupChat(lineId);
  if (!group) {
    return {
      success: false,
      error: "Grupo não encontrado",
    };
  }

  if (!canAccessGroup(group, senderId)) {
    return {
      success: false,
      error: "Você não tem permissão para enviar neste grupo",
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

  const group = findGroupChat(lineId);
  if (!group) {
    return {
      success: false,
      error: "Grupo não encontrado",
    };
  }

  if (!canAccessGroup(group, userId)) {
    return {
      success: false,
      error: "Você não tem permissão para acessar este grupo",
    };
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
  clearChatDatabase,
};
