/**
 * RF9 HTTP: Painel de Decisão
 */

process.env.USE_MOCK_DB = "true";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../index");
const { clearDecisionDatabase } = require("../services/vanDecisionService");
const { createPresenceLine } = require("../services/presenceService");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const token = (p) => jwt.sign(p, JWT_SECRET, { expiresIn: "1h" });

describe("RF9 API HTTP: Painel de Decisão", () => {
  const ownerToken = token({ id: "driver-owner-rf9-http", role: "DRIVER" });
  const linkedToken = token({ id: "driver-linked-rf9-http", role: "DRIVER" });
  const passengerToken = token({ id: "passenger-rf9-http", role: "PASSENGER" });
  const lineId = "line-rf9-http-1";
  const date = "2026-07-15";

  beforeEach(async () => {
    await clearDecisionDatabase();
    await createPresenceLine({ lineId, ownerDriverId: "driver-owner-rf9-http", capacity: 16 });
  });

  it("Cenário 9.3 HTTP: deve registrar decisão single_van", async () => {
    const res = await request(app)
      .post(`/api/v1/operations/lines/${lineId}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ date, decision: "single_van" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.decision.decision).toBe("single_van");
  });

  it("Cenário 9.4 HTTP: deve registrar decisão double_van_fleet", async () => {
    const res = await request(app)
      .post(`/api/v1/operations/lines/${lineId}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ date, decision: "double_van_fleet", vehicleId: "vehicle-extra" });

    expect(res.status).toBe(201);
    expect(res.body.decision.decision).toBe("double_van_fleet");
    expect(res.body.decision.vehicleId).toBe("vehicle-extra");
  });

  it("Cenário 9.5 HTTP: deve registrar decisão double_van_app", async () => {
    const res = await request(app)
      .post(`/api/v1/operations/lines/${lineId}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ date, decision: "double_van_app" });

    expect(res.status).toBe(201);
    expect(res.body.decision.decision).toBe("double_van_app");
  });

  it("Cenário 9.6 HTTP: deve atualizar decisão existente (upsert)", async () => {
    await request(app)
      .post(`/api/v1/operations/lines/${lineId}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ date, decision: "single_van" });

    const res = await request(app)
      .post(`/api/v1/operations/lines/${lineId}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ date, decision: "double_van_app" });

    expect(res.status).toBe(201);
    expect(res.body.decision.decision).toBe("double_van_app");
  });

  it("deve consultar decisão do dia", async () => {
    await request(app)
      .post(`/api/v1/operations/lines/${lineId}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ date, decision: "single_van" });

    const res = await request(app)
      .get(`/api/v1/operations/lines/${lineId}/decision?date=${date}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.decision.decision).toBe("single_van");
  });

  it("deve retornar null quando não há decisão", async () => {
    const res = await request(app)
      .get(`/api/v1/operations/lines/${lineId}/decision?date=${date}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.decision).toBeNull();
  });

  it("Cenário 9.7 HTTP: deve bloquear passageiro", async () => {
    const res = await request(app)
      .post(`/api/v1/operations/lines/${lineId}/decision`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ date, decision: "single_van" });

    expect(res.status).toBe(403);
  });

  it("Cenário 9.9 HTTP: deve bloquear data inválida", async () => {
    const res = await request(app)
      .post(`/api/v1/operations/lines/${lineId}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ date: "15/07/2026", decision: "single_van" });

    expect(res.status).toBe(400);
  });

  it("Cenário 9.8 HTTP: deve bloquear sem autenticação", async () => {
    const res = await request(app)
      .post(`/api/v1/operations/lines/${lineId}/decision`)
      .send({ date, decision: "single_van" });

    expect(res.status).toBe(401);
  });
});
