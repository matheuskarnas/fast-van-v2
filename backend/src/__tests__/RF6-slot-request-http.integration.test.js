/**
 * RF6 HTTP: Exceção de Horário + Fila de Espera
 */

process.env.USE_MOCK_DB = "true";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../index");
const { clearSlotRequestDatabase } = require("../services/slotRequestService");
const { createPresenceLine, addPassengerToLine, clearPresenceDatabase } = require("../services/presenceService");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const tok = (p) => jwt.sign(p, JWT_SECRET, { expiresIn: "1h" });

describe("RF6 API HTTP: Exceção de Horário", () => {
  const p1Token = tok({ id: "p1-rf6-http", role: "PASSENGER" });
  const p2Token = tok({ id: "p2-rf6-http", role: "PASSENGER" });
  const driverToken = tok({ id: "d-rf6-http", role: "DRIVER" });
  const lineId = "line-rf6-http";
  const date = new Date(Date.now() + 864e5).toISOString().slice(0, 10);

  beforeEach(async () => {
    await clearPresenceDatabase();
    await clearSlotRequestDatabase();
    await createPresenceLine({ lineId, ownerDriverId: "d-rf6-http", capacity: 2 });
    await addPassengerToLine(lineId, "p1-rf6-http", null, { departureTime: "07:10", arrivalTime: "12:35" });
    await addPassengerToLine(lineId, "p2-rf6-http", null, { departureTime: "08:00", arrivalTime: "10:55" });
  });

  it("Cenário 6.1 HTTP: deve confirmar troca quando há vaga", async () => {
    // slot 08:00 tem 1/2 vagas — p1 pode entrar
    const res = await request(app)
      .post(`/api/v1/presence/lines/${lineId}/me/slot-request`)
      .set("Authorization", `Bearer ${p1Token}`)
      .send({ date, requestedDepartureTime: "08:00", requestedArrivalTime: "10:55" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.slotStatus).toBe("switched");
  });

  it("Cenário 6.2 HTTP: deve entrar na fila quando slot cheio", async () => {
    // Adiciona p3 para lotar slot 08:00
    await addPassengerToLine(lineId, "p3-rf6-http", null, { departureTime: "08:00", arrivalTime: "10:55" });

    const res = await request(app)
      .post(`/api/v1/presence/lines/${lineId}/me/slot-request`)
      .set("Authorization", `Bearer ${p1Token}`)
      .send({ date, requestedDepartureTime: "08:00", requestedArrivalTime: "10:55" });

    expect(res.status).toBe(200);
    expect(res.body.slotStatus).toBe("waitlist");
  });

  it("Cenário 6.4 HTTP: deve cancelar troca ativa", async () => {
    await request(app).post(`/api/v1/presence/lines/${lineId}/me/slot-request`).set("Authorization", `Bearer ${p1Token}`).send({ date, requestedDepartureTime: "08:00", requestedArrivalTime: "10:55" });

    const res = await request(app)
      .delete(`/api/v1/presence/lines/${lineId}/me/slot-request?date=${date}`)
      .set("Authorization", `Bearer ${p1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.slotStatus).toBe("confirmed");
  });

  it("Cenário 6.6 HTTP: deve rejeitar solicitação para o próprio slot", async () => {
    const res = await request(app)
      .post(`/api/v1/presence/lines/${lineId}/me/slot-request`)
      .set("Authorization", `Bearer ${p2Token}`)
      .send({ date, requestedDepartureTime: "08:00", requestedArrivalTime: "10:55" });

    expect(res.status).toBe(400);
  });

  it("deve bloquear motorista", async () => {
    const res = await request(app)
      .post(`/api/v1/presence/lines/${lineId}/me/slot-request`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ date, requestedDepartureTime: "08:00", requestedArrivalTime: "10:55" });

    expect(res.status).toBe(403);
  });

  it("deve bloquear sem autenticação", async () => {
    const res = await request(app)
      .post(`/api/v1/presence/lines/${lineId}/me/slot-request`)
      .send({ date, requestedDepartureTime: "08:00", requestedArrivalTime: "10:55" });

    expect(res.status).toBe(401);
  });
});
