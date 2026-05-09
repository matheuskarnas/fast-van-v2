process.env.USE_MOCK_DB = "true";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../index");
const lineService = require("../services/lineService");
const presenceService = require("../services/presenceService");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

describe("Line Invite HTTP: Endpoints de Convite para Linhas", () => {
  const driverAuthId = "driver-test-1";
  const passengerAuthId = "passenger-test-1";
  const driverToken = createToken({ id: driverAuthId, role: "DRIVER" });
  const passengerToken = createToken({ id: passengerAuthId, role: "PASSENGER" });

  let lineId;

  beforeAll(async () => {
    // Limpar base de dados mock
    await lineService.clearLineDatabase();

    // Criar linha
    const lineRes = await lineService.createLine(
      { originCity: "City A", destinationPlace: "Place B", vehicleId: "veh-1" },
      driverAuthId,
    );

    if (!lineRes.success) throw new Error(lineRes.error);
    lineId = lineRes.line.id;

    // Registrar presença (mock)
    await presenceService.createPresenceLine({
      lineId,
      driverId: driverAuthId,
      ownerDriverId: driverAuthId,
      capacity: 16,
      nextDate: "2026-05-10",
      points: [],
    });
  });

  test("POST /api/v1/lines/:lineId/invite - deve criar invite com sucesso para motorista dono", async () => {
    const response = await request(app)
      .post(`/api/v1/lines/${lineId}/invite`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.url).toMatch(/invite/);
    expect(response.body.data.expiresAt).toBeDefined();
  });

  test("POST /api/v1/lines/:lineId/invite - deve bloquear criação de invite para passageiro", async () => {
    const response = await request(app)
      .post(`/api/v1/lines/${lineId}/invite`)
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  test("POST /api/v1/lines/:lineId/invite - deve bloquear sem autenticação", async () => {
    const response = await request(app).post(`/api/v1/lines/${lineId}/invite`);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("POST /api/v1/lines/invite/accept - deve aceitar invite com sucesso", async () => {
    // Criar invite primeiro
    const inviteRes = await request(app)
      .post(`/api/v1/lines/${lineId}/invite`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(inviteRes.status).toBe(201);
    const { token } = inviteRes.body.data;

    // Aceitar invite
    const acceptRes = await request(app)
      .post("/api/v1/lines/invite/accept")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ token });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
  });

  test("POST /api/v1/lines/invite/accept - deve bloquear aceitação de invite para motorista", async () => {
    // Criar invite
    const inviteRes = await request(app)
      .post(`/api/v1/lines/${lineId}/invite`)
      .set("Authorization", `Bearer ${driverToken}`);

    const { token } = inviteRes.body.data;

    // Tentar aceitar com motorista
    const acceptRes = await request(app)
      .post("/api/v1/lines/invite/accept")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ token });

    expect(acceptRes.status).toBe(403);
    expect(acceptRes.body.success).toBe(false);
  });

  test("POST /api/v1/lines/invite/accept - deve validar presença de token", async () => {
    const response = await request(app)
      .post("/api/v1/lines/invite/accept")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("POST /api/v1/lines/invite/accept - deve rejeitar invite inválido", async () => {
    const response = await request(app)
      .post("/api/v1/lines/invite/accept")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ token: "invalid-token-12345" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("POST /api/v1/lines/invite/accept - deve bloquear sem autenticação", async () => {
    const response = await request(app)
      .post("/api/v1/lines/invite/accept")
      .send({ token: "some-token" });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
