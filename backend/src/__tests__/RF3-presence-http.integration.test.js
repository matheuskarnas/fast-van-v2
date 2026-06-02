process.env.USE_MOCK_DB = "true";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../index");
const {
  clearPresenceDatabase,
  createPresenceLine,
  addPassengerToLine,
  markPassengerPresence,
} = require("../services/presenceService");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

describe("RF3 API HTTP: Presenca do Passageiro", () => {
  const passengerToken = createToken({ id: "passenger-1", role: "PASSENGER" });
  const passenger2Token = createToken({ id: "passenger-2", role: "PASSENGER" });

  beforeEach(async () => {
    await clearPresenceDatabase();

    await createPresenceLine({
      lineId: "line-presence-http-1",
      ownerDriverId: "driver-owner-1",
      nextDate: "2026-04-22",
      points: [
        {
          id: "point-a",
          type: "pickup",
          segment: "ida",
          time: "23:59",
          passengers: [],
        },
      ],
    });

    await addPassengerToLine("line-presence-http-1", "passenger-1", "point-a");

    await markPassengerPresence(
      "line-presence-http-1",
      "passenger-1",
      "2026-04-22",
      "vai e volta",
      { isAuthenticated: true, currentDateTime: "2026-04-21T10:00:00Z" },
    );
  });

  test("deve listar linhas do passageiro com status para a data", async () => {
    const response = await request(app)
      .get("/api/v1/presence/me/lines?date=2026-04-22")
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.lines)).toBe(true);
    expect(response.body.lines[0].lineId).toBe("line-presence-http-1");
    expect(response.body.lines[0].status).toBe("vai e volta");
  });

  test("deve atualizar presença do passageiro para ausência total", async () => {
    const response = await request(app)
      .patch("/api/v1/presence/lines/line-presence-http-1/me/status")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        date: "2026-04-22",
        status: "não vai e nem volta",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe("não vai e nem volta");
  });

  test("deve bloquear alteração de presença para passageiro sem vínculo", async () => {
    const response = await request(app)
      .patch("/api/v1/presence/lines/line-presence-http-1/me/status")
      .set("Authorization", `Bearer ${passenger2Token}`)
      .send({
        date: "2026-04-22",
        status: "só vou e não volto",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error?.code).toBe("FORBIDDEN_RESOURCE");
  });

  test("deve bloquear alteração com status inválido", async () => {
    const response = await request(app)
      .patch("/api/v1/presence/lines/line-presence-http-1/me/status")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        date: "2026-04-22",
        status: "status inválido",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error?.code).toBe("INVALID_PRESENCE_STATUS");
  });

  test("deve exigir autenticação no fluxo de presença", async () => {
    const response = await request(app)
      .patch("/api/v1/presence/lines/line-presence-http-1/me/status")
      .send({
        date: "2026-04-22",
        status: "vai e volta",
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
