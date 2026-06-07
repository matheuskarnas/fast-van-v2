process.env.USE_MOCK_DB = "true";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../index");
const { clearChatDatabase } = require("../services/chatService");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

describe("RF13 API HTTP: Chat", () => {
  const passengerToken = createToken({ id: "passenger-1", role: "PASSENGER" });
  const driverToken = createToken({ id: "driver-owner", role: "DRIVER" });
  const outsiderToken = createToken({ id: "outsider-1", role: "PASSENGER" });

  beforeEach(async () => {
    await clearChatDatabase();
  });

  test("deve criar conversa privada entre passageiro e motorista", async () => {
    const response = await request(app)
      .post("/api/v1/chat/private/conversations")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        passengerId: "passenger-1",
        driverId: "driver-owner",
        context: "marketplace",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.conversation.type).toBe("private");
  });

  test("deve enviar e listar mensagens privadas", async () => {
    const createConversation = await request(app)
      .post("/api/v1/chat/private/conversations")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        passengerId: "passenger-1",
        driverId: "driver-owner",
      });

    const conversationId = createConversation.body.conversation.id;

    const sendMessage = await request(app)
      .post(`/api/v1/chat/private/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ text: "Chego em 10 minutos" });

    expect(sendMessage.status).toBe(201);
    expect(sendMessage.body.success).toBe(true);

    const listMessages = await request(app)
      .get(`/api/v1/chat/private/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(listMessages.status).toBe(200);
    expect(listMessages.body.success).toBe(true);
    expect(listMessages.body.messages).toHaveLength(1);
    expect(listMessages.body.messages[0].text).toBe("Chego em 10 minutos");
  });

  test("deve criar grupo, adicionar passageiro e permitir mensagens", async () => {
    const createGroup = await request(app)
      .post("/api/v1/chat/groups")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        lineId: "line-chat-1",
      });

    expect(createGroup.status).toBe(201);
    expect(createGroup.body.success).toBe(true);

    const addMember = await request(app)
      .post("/api/v1/chat/groups/line-chat-1/members")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        userId: "passenger-1",
        role: "PASSENGER",
      });

    expect(addMember.status).toBe(200);
    expect(addMember.body.success).toBe(true);

    const sendGroupMessage = await request(app)
      .post("/api/v1/chat/groups/line-chat-1/messages")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ text: "Bom dia, pessoal" });

    expect(sendGroupMessage.status).toBe(201);
    expect(sendGroupMessage.body.success).toBe(true);

    const getGroupMessages = await request(app)
      .get("/api/v1/chat/groups/line-chat-1/messages")
      .set("Authorization", `Bearer ${driverToken}`);

    expect(getGroupMessages.status).toBe(200);
    expect(getGroupMessages.body.success).toBe(true);
    expect(getGroupMessages.body.messages).toHaveLength(1);
  });

  test("deve bloquear acesso ao grupo para usuário sem vínculo", async () => {
    await request(app)
      .post("/api/v1/chat/groups")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ lineId: "line-chat-2" });

    const response = await request(app)
      .get("/api/v1/chat/groups/line-chat-2/messages")
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
