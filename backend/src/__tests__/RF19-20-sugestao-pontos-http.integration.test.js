/**
 * RF19/20 HTTP: Sugestão de Pontos
 */

process.env.USE_MOCK_DB = "true";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../index");
const { clearSuggestionDatabase } = require("../services/pointSuggestionService");
const { createPresenceLine, addPassengerToLine } = require("../services/presenceService");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const tok = (p) => jwt.sign(p, JWT_SECRET, { expiresIn: "1h" });

describe("RF19/20 API HTTP: Sugestão de Pontos", () => {
  const driverToken = tok({ id: "driver-rf19-http", role: "DRIVER" });
  const passengerToken = tok({ id: "p-rf19-http", role: "PASSENGER" });
  const outsiderToken = tok({ id: "p-rf19-outsider", role: "PASSENGER" });
  const lineId = "line-rf19-http";

  const body = {
    address: "Av. Brasil, 500, Caçapava",
    type: "pickup",
    segment: "ida",
    latitude: -23.1,
    longitude: -45.7,
  };

  beforeEach(async () => {
    await clearSuggestionDatabase();
    await createPresenceLine({ lineId, ownerDriverId: "driver-rf19-http", capacity: 10 });
    await addPassengerToLine(lineId, "p-rf19-http", null);
  });

  it("Cenário 19.1 HTTP: deve criar sugestão com sucesso", async () => {
    const res = await request(app)
      .post(`/api/v1/lines/${lineId}/point-suggestions`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send(body);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.suggestion.status).toBe("pending");
  });

  it("Cenário 19.3 HTTP: motorista lista sugestões pendentes", async () => {
    await request(app).post(`/api/v1/lines/${lineId}/point-suggestions`).set("Authorization", `Bearer ${passengerToken}`).send(body);

    const res = await request(app)
      .get(`/api/v1/lines/${lineId}/point-suggestions`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.suggestions.length).toBe(1);
  });

  it("Cenário 19.4 HTTP: motorista aprova sugestão", async () => {
    const created = await request(app).post(`/api/v1/lines/${lineId}/point-suggestions`).set("Authorization", `Bearer ${passengerToken}`).send(body);
    const suggId = created.body.suggestion.id;

    const res = await request(app)
      .patch(`/api/v1/lines/${lineId}/point-suggestions/${suggId}`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ decision: "approved" });

    expect(res.status).toBe(200);
    expect(res.body.suggestion.status).toBe("approved");
  });

  it("Cenário 19.5 HTTP: motorista rejeita sugestão", async () => {
    const created = await request(app).post(`/api/v1/lines/${lineId}/point-suggestions`).set("Authorization", `Bearer ${passengerToken}`).send(body);
    const suggId = created.body.suggestion.id;

    const res = await request(app)
      .patch(`/api/v1/lines/${lineId}/point-suggestions/${suggId}`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ decision: "rejected", rejectionReason: "Fora da rota" });

    expect(res.status).toBe(200);
    expect(res.body.suggestion.status).toBe("rejected");
    expect(res.body.suggestion.rejectionReason).toBe("Fora da rota");
  });

  it("Cenário 20.1 HTTP: passageiro lista suas sugestões", async () => {
    await request(app).post(`/api/v1/lines/${lineId}/point-suggestions`).set("Authorization", `Bearer ${passengerToken}`).send(body);

    const res = await request(app)
      .get(`/api/v1/lines/${lineId}/point-suggestions/me`)
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.suggestions.length).toBe(1);
  });

  it("Cenário E1 HTTP: passageiro não matriculado não pode sugerir", async () => {
    const res = await request(app)
      .post(`/api/v1/lines/${lineId}/point-suggestions`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send(body);

    expect(res.status).toBe(403);
  });

  it("Cenário E3 HTTP: endereço obrigatório", async () => {
    const res = await request(app)
      .post(`/api/v1/lines/${lineId}/point-suggestions`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ ...body, address: "" });

    expect(res.status).toBe(400);
  });

  it("deve bloquear sem autenticação", async () => {
    const res = await request(app).post(`/api/v1/lines/${lineId}/point-suggestions`).send(body);
    expect(res.status).toBe(401);
  });
});
