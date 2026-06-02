/**
 * RF14 HTTP: Avaliação de Viagens
 */

process.env.USE_MOCK_DB = "true";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../index");
const { clearRatingsDatabase } = require("../services/ratingService");
const { createPresenceLine, addPassengerToLine } = require("../services/presenceService");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const tok = (p) => jwt.sign(p, JWT_SECRET, { expiresIn: "1h" });

describe("RF14 API HTTP: Avaliação de Viagens", () => {
  const passengerToken = tok({ id: "p-rf14-http", role: "PASSENGER" });
  const driverToken = tok({ id: "d-rf14-http", role: "DRIVER" });
  const outsiderToken = tok({ id: "p-rf14-outsider", role: "PASSENGER" });
  const lineId = "line-rf14-http";

  const body = {
    lineId,
    driverId: "d-rf14-http",
    vehicleId: "v-rf14",
    month: "2026-07",
    punctuality: 5, driving: 4, friendliness: 5,
    comfort: 4, vehicleQuality: 5, hygiene: 4,
    comment: "Muito bom!",
  };

  beforeEach(async () => {
    await clearRatingsDatabase();
    await createPresenceLine({ lineId, ownerDriverId: "d-rf14-http", capacity: 10 });
    await addPassengerToLine(lineId, "p-rf14-http", null);
  });

  it("Cenário 14.1/14.2 HTTP: deve registrar avaliação com sucesso", async () => {
    const res = await request(app)
      .post("/api/v1/ratings")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send(body);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.rating.punctuality).toBe(5);
  });

  it("Cenário 14.4 HTTP: deve bloquear segunda avaliação no mesmo mês", async () => {
    await request(app).post("/api/v1/ratings").set("Authorization", `Bearer ${passengerToken}`).send(body);
    const res = await request(app).post("/api/v1/ratings").set("Authorization", `Bearer ${passengerToken}`).send(body);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("Cenário 14.6 HTTP: deve bloquear passageiro não matriculado", async () => {
    const res = await request(app)
      .post("/api/v1/ratings")
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ ...body, lineId });
    expect(res.status).toBe(403);
  });

  it("Cenário 14.7 HTTP: deve bloquear nota inválida", async () => {
    const res = await request(app)
      .post("/api/v1/ratings")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ ...body, punctuality: 6 });
    expect(res.status).toBe(400);
  });

  it("Cenário 14.8 HTTP: deve bloquear motorista de avaliar", async () => {
    const res = await request(app)
      .post("/api/v1/ratings")
      .set("Authorization", `Bearer ${driverToken}`)
      .send(body);
    expect(res.status).toBe(403);
  });

  it("Cenário 14.3 HTTP: deve retornar médias do motorista", async () => {
    await request(app).post("/api/v1/ratings").set("Authorization", `Bearer ${passengerToken}`).send(body);
    const res = await request(app)
      .get(`/api/v1/ratings/driver/d-rf14-http`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.averages.punctuality).toBe(5);
    expect(res.body.totalRatings).toBe(1);
  });

  it("deve retornar avaliação já feita pelo passageiro", async () => {
    await request(app).post("/api/v1/ratings").set("Authorization", `Bearer ${passengerToken}`).send(body);
    const res = await request(app)
      .get(`/api/v1/ratings/me?lineId=${lineId}&month=2026-07`)
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.rating).not.toBeNull();
  });

  it("deve bloquear sem autenticação", async () => {
    const res = await request(app).post("/api/v1/ratings").send(body);
    expect(res.status).toBe(401);
  });
});
