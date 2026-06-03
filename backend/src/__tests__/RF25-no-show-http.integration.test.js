/**
 * RF25 HTTP: Passageiro Não Embarcou
 */

process.env.USE_MOCK_DB = "true";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../index");
const {
  createPresenceLine,
  addPassengerToLine,
  markPassengerPresence,
  clearPresenceDatabase,
} = require("../services/presenceService");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const tok = (p) => jwt.sign(p, JWT_SECRET, { expiresIn: "1h" });

describe("RF25 API HTTP: Passageiro Não Embarcou", () => {
  const driverToken = tok({ id: "driver-rf25-http", role: "DRIVER" });
  const passengerToken = tok({ id: "p-rf25-http", role: "PASSENGER" });
  const lineId = "line-rf25-http";
  const date = new Date().toISOString().slice(0, 10);

  beforeEach(async () => {
    await clearPresenceDatabase();
    await createPresenceLine({ lineId, ownerDriverId: "driver-rf25-http", capacity: 10 });
    await addPassengerToLine(lineId, "p-rf25-confirmado", null);
    await addPassengerToLine(lineId, "p-rf25-ausente", null);
    await markPassengerPresence(lineId, "p-rf25-ausente", date, "não vai e nem volta", { isAuthenticated: true });
  });

  it("Cenário 25.2 HTTP: deve registrar no-show com sucesso", async () => {
    const res = await request(app)
      .post(`/api/v1/lines/${lineId}/no-show`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ passengerId: "p-rf25-confirmado", segment: "ida", date, latitude: -23.5, longitude: -46.6 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.occurrence.type).toBe("passenger_no_show");
  });

  it("Cenário 25.4 HTTP: deve bloquear passageiro ausente", async () => {
    const res = await request(app)
      .post(`/api/v1/lines/${lineId}/no-show`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ passengerId: "p-rf25-ausente", segment: "ida", date });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("Cenário 25.7 HTTP: deve bloquear passageiro", async () => {
    const res = await request(app)
      .post(`/api/v1/lines/${lineId}/no-show`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ passengerId: "p-rf25-confirmado", segment: "ida", date });

    expect(res.status).toBe(403);
  });

  it("Cenário 25.8 HTTP: deve bloquear sem passengerId", async () => {
    const res = await request(app)
      .post(`/api/v1/lines/${lineId}/no-show`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ segment: "ida", date });

    expect(res.status).toBe(400);
  });

  it("deve bloquear sem autenticação", async () => {
    const res = await request(app)
      .post(`/api/v1/lines/${lineId}/no-show`)
      .send({ passengerId: "p-rf25-confirmado", segment: "ida", date });

    expect(res.status).toBe(401);
  });
});
