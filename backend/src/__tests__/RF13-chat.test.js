/**
 * RF13: Chat Integrado entre Aluno e Motorista
 * Testes automatizados para chat privado (marketplace) e chat em grupo da linha.
 */

process.env.USE_MOCK_DB = "true";

const {
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
} = require("../services/chatService");

describe("RF13: Chat Integrado entre Aluno e Motorista", () => {
  const passengerId = "passenger-1";
  const driverId = "driver-1";
  const otherPassengerId = "passenger-2";
  const outsiderId = "user-outsider";
  const lineId = "line-chat-1";

  let privateConversationId;

  beforeEach(async () => {
    await clearChatDatabase();

    const privateConversation = await createPrivateConversation({
      passengerId,
      driverId,
      context: "marketplace",
      isAuthenticated: true,
    });

    privateConversationId = privateConversation.conversation.id;

    await createLineGroupChat({
      lineId,
      ownerDriverId: driverId,
      driverIds: [driverId],
      passengerIds: [passengerId],
    });
  });

  describe("Cenários de Sucesso", () => {
    it("Cenário 13.1: passageiro deve iniciar chat privado no marketplace", async () => {
      const result = await createPrivateConversation({
        passengerId: otherPassengerId,
        driverId,
        context: "marketplace",
        isAuthenticated: true,
      });

      expect(result.success).toBe(true);
      expect(result.conversation.type).toBe("private");
    });

    it("Cenário 13.2: chat privado deve entregar mensagens em tempo real", async () => {
      const liveMessages = [];
      const unsubscribe = subscribeToPrivateConversation(
        privateConversationId,
        driverId,
        (message) => {
          liveMessages.push(message);
        },
      );

      await sendPrivateMessage({
        conversationId: privateConversationId,
        senderId: passengerId,
        text: "Quero negociar o valor da linha",
        isAuthenticated: true,
      });

      unsubscribe();

      expect(liveMessages.length).toBeGreaterThan(0);
      expect(liveMessages[0].text).toContain("negociar");
    });

    it("Cenário 13.3: motorista deve iniciar ou responder chat privado", async () => {
      const result = await sendPrivateMessage({
        conversationId: privateConversationId,
        senderId: driverId,
        text: "Podemos combinar pontos e valores",
        isAuthenticated: true,
      });

      expect(result.success).toBe(true);
      expect(result.message.senderId).toBe(driverId);
    });

    it("Cenário 13.4: membro da linha deve acessar chat em grupo", async () => {
      const result = await getGroupMessages({
        lineId,
        userId: passengerId,
        isAuthenticated: true,
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.messages)).toBe(true);
    });

    it("Cenário 13.5: mensagem no grupo deve chegar em tempo real para membros ativos", async () => {
      const liveMessages = [];
      const unsubscribe = subscribeToGroupConversation(
        lineId,
        passengerId,
        (message) => {
          liveMessages.push(message);
        },
      );

      await sendGroupMessage({
        lineId,
        senderId: driverId,
        text: "Pessoal, saída no horário normal",
        isAuthenticated: true,
      });

      unsubscribe();

      expect(liveMessages.length).toBeGreaterThan(0);
      expect(liveMessages[0].text).toContain("saída");
    });

    it("Cenário 13.6: deve registrar visualização de mensagem privada", async () => {
      await sendPrivateMessage({
        conversationId: privateConversationId,
        senderId: passengerId,
        text: "Mensagem para visualizar",
        isAuthenticated: true,
      });

      const result = await markPrivateMessagesAsRead({
        conversationId: privateConversationId,
        userId: driverId,
        isAuthenticated: true,
      });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBeGreaterThan(0);
    });

    it("Cenário 13.7: deve registrar visualização de mensagem no grupo", async () => {
      await sendGroupMessage({
        lineId,
        senderId: driverId,
        text: "Mensagem no grupo",
        isAuthenticated: true,
      });

      const result = await getGroupMessages({
        lineId,
        userId: passengerId,
        isAuthenticated: true,
        markAsRead: true,
      });

      expect(result.success).toBe(true);
      expect(result.readReceiptUpdated).toBe(true);
    });

    it("Cenário 13.8: histórico deve ser retornado em ordem cronológica", async () => {
      await sendPrivateMessage({
        conversationId: privateConversationId,
        senderId: passengerId,
        text: "primeira",
        isAuthenticated: true,
      });

      await sendPrivateMessage({
        conversationId: privateConversationId,
        senderId: driverId,
        text: "segunda",
        isAuthenticated: true,
      });

      const result = await getPrivateMessages({
        conversationId: privateConversationId,
        userId: passengerId,
        isAuthenticated: true,
      });

      expect(result.success).toBe(true);
      expect(result.messages[0].text).toBe("primeira");
      expect(result.messages[1].text).toBe("segunda");
    });

    it("Cenário 13.9: usuário adicionado à linha deve ganhar acesso ao grupo", async () => {
      await addUserToGroupChat({
        lineId,
        userId: otherPassengerId,
        role: "PASSENGER",
        actorId: driverId,
      });

      const result = await getGroupMessages({
        lineId,
        userId: otherPassengerId,
        isAuthenticated: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Cenários de Erro", () => {
    it("Cenário 13.10: usuário não autenticado não deve acessar chat", async () => {
      const result = await getPrivateMessages({
        conversationId: privateConversationId,
        userId: passengerId,
        isAuthenticated: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("autentic");
    });

    it("Cenário 13.11: usuário sem vínculo não deve acessar grupo da linha", async () => {
      const result = await getGroupMessages({
        lineId,
        userId: outsiderId,
        isAuthenticated: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("permissão");
    });

    it("Cenário 13.12: usuário removido da linha não deve enviar no grupo", async () => {
      await addUserToGroupChat({
        lineId,
        userId: otherPassengerId,
        role: "PASSENGER",
        actorId: driverId,
      });

      await removeUserFromGroupChat({
        lineId,
        userId: otherPassengerId,
        actorId: driverId,
      });

      const result = await sendGroupMessage({
        lineId,
        senderId: otherPassengerId,
        text: "Ainda consigo mandar?",
        isAuthenticated: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("permissão");
    });

    it("Cenário 13.13: deve bloquear envio de mensagem vazia", async () => {
      const result = await sendPrivateMessage({
        conversationId: privateConversationId,
        senderId: passengerId,
        text: "   ",
        isAuthenticated: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("vazia");
    });

    it("Cenário 13.14: deve falhar para conversa inexistente", async () => {
      const result = await sendPrivateMessage({
        conversationId: "conversation-inexistente",
        senderId: passengerId,
        text: "Mensagem teste",
        isAuthenticated: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("conversa");
    });

    it("Cenário 13.15: falha realtime deve manter mensagem pendente para reentrega", async () => {
      const result = await sendPrivateMessage({
        conversationId: privateConversationId,
        senderId: passengerId,
        text: "Mensagem com falha realtime",
        isAuthenticated: true,
        forceRealtimeFailure: true,
      });

      expect(result.success).toBe(true);
      expect(result.message.status).toBe("pending-delivery");
      expect(result.message.retryScheduled).toBe(true);
    });
  });
});
