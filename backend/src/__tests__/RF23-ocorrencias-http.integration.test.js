/**
 * RF23 HTTP: Registro de Ocorrências
 */

process.env.USE_MOCK_DB = "true";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../index");
const { clearOccurrenceDatabase } = require("../services/occurrenceService");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const tok = (p) => jwt.sign(p, JWT_SECRET, { expiresIn: "1h" });

describe("RF23 API HTTP: Registro de Ocorrências", () => {
  const driverToken = tok({ id: "driver-rf23-http", role: "DRIVER" });
  const passengerToken = tok({ id: "p-rf23-http", role: "PASSENGER" });
  const lineId = "line-rf23-http";

  beforeEach(async () => { await clearOccurrenceDatabase(); });

  it("Cenário 23.1 HTTP: deve registrar ocorrência com sucesso", async () => {
    const res = await request(app)
      .post(`/api/v1/lines/${lineId}/occurrences`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ type: "slow_traffic", notes: "Congestionamento", latitude: -23.5, longitude: -46.6 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.occurrence.type).toBe("slow_traffic");
  });

  it("Cenário 23.3 HTTP: deve registrar passenger_no_show com passageiro", async () => {
    const res = await request(app)
      .post(`/api/v1/lines/${lineId}/occurrences`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ type: "passenger_no_show", passengerId: "p-ausente", notes: "Não apareceu no ponto" });

    expect(res.status).toBe(201);
    expect(res.body.occurrence.passengerId).toBe("p-ausente");
  });

  it("Cenário 23.4 HTTP: deve listar ocorrências por data", async () => {
    await request(app).post(`/api/v1/lines/${lineId}/occurrences`).set("Authorization", `Bearer ${driverToken}`).send({ type: "slow_traffic" });
    await request(app).post(`/api/v1/lines/${lineId}/occurrences`).set("Authorization", `Bearer ${driverToken}`).send({ type: "other", notes: "Desvio" });

    const date = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .get(`/api/v1/lines/${lineId}/occurrences?date=${date}`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.occurrences.length).toBe(2);
  });

  it("Cenário 23.6 HTTP: deve rejeitar tipo inválido", async () => {
    const res = await request(app)
      .post(`/api/v1/lines/${lineId}/occurrences`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ type: "tipo_inexistente" });

    expect(res.status).toBe(400);
  });

  it("Cenário 23.7 HTTP: deve bloquear passageiro", async () => {
    const res = await request(app)
      .post(`/api/v1/lines/${lineId}/occurrences`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ type: "slow_traffic" });

    expect(res.status).toBe(403);
  });

  it("deve bloquear sem autenticação", async () => {
    const res = await request(app)
      .post(`/api/v1/lines/${lineId}/occurrences`)
      .send({ type: "slow_traffic" });

    expect(res.status).toBe(401);
  });
});
