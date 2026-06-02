/**
 * RF8: HTTP Integration — Reversão de Ausência de Última Hora
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

function token(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

describe("RF8 API HTTP: Reversão de Ausência de Última Hora", () => {
  const passengerToken = token({ id: "p-rf8-http-1", role: "PASSENGER" });
  const passenger2Token = token({ id: "p-rf8-http-2", role: "PASSENGER" });
  const passenger3Token = token({ id: "p-rf8-http-3", role: "PASSENGER" });
  const outsiderToken = token({ id: "p-rf8-forasteiro", role: "PASSENGER" });
  const lineId = "line-rf8-http-1";
  const date = "2026-07-10";

  beforeEach(async () => {
    await clearPresenceDatabase();

    await createPresenceLine({
      lineId,
      ownerDriverId: "driver-rf8-http",
      capacity: 2,
      points: [
        {
          id: "ponto-rf8-ida",
          address: "Rua RF8, 100",
          time: "07:00",
          segment: "ida",
          passengers: [],
        },
      ],
    });

    await addPassengerToLine(lineId, "p-rf8-http-1", "ponto-rf8-ida");
    await addPassengerToLine(lineId, "p-rf8-http-2", "ponto-rf8-ida");
    await addPassengerToLine(lineId, "p-rf8-http-3", "ponto-rf8-ida");
  });

  it("Cenário 8.1 HTTP: deve reverter ausência para vai e volta com vaga", async () => {
    // Marca ausência com mock de horário antes do embarque
    await markPassengerPresence(lineId, "p-rf8-http-1", date, "não vai e nem volta", {
      currentDateTime: `${date}T06:30:00`,
    });

    // passenger2 e passenger3 estão ausentes → 0 confirmados → há vaga
    await markPassengerPresence(lineId, "p-rf8-http-2", date, "não vai e nem volta", {
      currentDateTime: `${date}T06:30:00`,
    });
    await markPassengerPresence(lineId, "p-rf8-http-3", date, "não vai e nem volta", {
      currentDateTime: `${date}T06:30:00`,
    });

    const res = await request(app)
      .patch(`/api/v1/presence/lines/${lineId}/me/status`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ date, status: "vai e volta" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe("vai e volta");
  });

  it("Cenário 8.3 HTTP: deve bloquear reversão quando slot está lotado", async () => {
    // passenger1 está ausente, passenger2 e passenger3 confirmados = 2/2 vagas
    await markPassengerPresence(lineId, "p-rf8-http-1", date, "não vai e nem volta", {
      currentDateTime: `${date}T06:30:00`,
    });

    const res = await request(app)
      .patch(`/api/v1/presence/lines/${lineId}/me/status`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ date, status: "vai e volta" });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/vagas/i);
  });

  it("Cenário 8.6 HTTP: deve bloquear passageiro não matriculado", async () => {
    const res = await request(app)
      .patch(`/api/v1/presence/lines/${lineId}/me/status`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ date, status: "vai e volta" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("Cenário 8.7 HTTP: deve bloquear data inválida", async () => {
    const res = await request(app)
      .patch(`/api/v1/presence/lines/${lineId}/me/status`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ date: "10/07/2026", status: "vai e volta" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("Cenário 8.8 HTTP: deve bloquear sem autenticação", async () => {
    const res = await request(app)
      .patch(`/api/v1/presence/lines/${lineId}/me/status`)
      .send({ date, status: "vai e volta" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
