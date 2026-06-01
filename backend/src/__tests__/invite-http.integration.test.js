process.env.USE_MOCK_DB = "true";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../index");
const lineService = require("../services/lineService");
const presenceService = require("../services/presenceService");
const { createUser } = require("../services/authService");
const { clearDatabase: clearUserDatabase } = require("../services/userService");
const { createVehicle, clearVehicleDatabase } = require("../services/vehicleService");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

describe("Line Invite HTTP: Endpoints de Convite para Linhas", () => {
  let driverAuthId;
  let driverToken;
  const passengerAuthId = "passenger-test-1";
  const passengerToken = createToken({ id: passengerAuthId, role: "PASSENGER" });

  let lineId;

  beforeAll(async () => {
    await lineService.clearLineDatabase();
    await clearVehicleDatabase();
    await clearUserDatabase();

    const driverResult = await createUser({
      name: "Motorista Invite HTTP",
      cpf: "123.456.789-09",
      cnh: "12345678901",
      birthDate: "1988-01-01T00:00:00.000Z",
      email: "invite.http@example.com",
      password: "Driver@123",
      role: "DRIVER",
    });
    driverAuthId = driverResult.user.id;
    driverToken = createToken({ id: driverAuthId, role: "DRIVER" });

    const vehicleResult = await createVehicle(driverAuthId, {
      plate: "HTP1X23",
      model: "Sprinter",
      year: 2020,
      capacity: 16,
    });

    const lineRes = await lineService.createLine(
      { originCity: "City A", destinationPlace: "Place B", vehicleId: vehicleResult.vehicle.id },
      driverAuthId,
    );

    if (!lineRes.success) throw new Error(lineRes.error);
    lineId = lineRes.line.id;

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
    const inviteRes = await request(app)
      .post(`/api/v1/lines/${lineId}/invite`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(inviteRes.status).toBe(201);
    const { token } = inviteRes.body.data;

    const acceptRes = await request(app)
      .post("/api/v1/lines/invite/accept")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ token });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
  });

  test("POST /api/v1/lines/invite/accept - deve bloquear aceitação de invite para motorista", async () => {
    const inviteRes = await request(app)
      .post(`/api/v1/lines/${lineId}/invite`)
      .set("Authorization", `Bearer ${driverToken}`);

    const { token } = inviteRes.body.data;

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
