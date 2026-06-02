process.env.USE_MOCK_DB = "true";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../index");
const {
  clearPresenceDatabase,
  createPresenceLine,
  addPassengerToLine,
} = require("../services/presenceService");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

describe("RF4/RF5 API HTTP: Dashboard Operacional", () => {
  const ownerToken = createToken({ id: "driver-owner", role: "DRIVER" });
  const linkedToken = createToken({ id: "driver-linked", role: "DRIVER" });
  const outsiderToken = createToken({ id: "driver-outsider", role: "DRIVER" });
  const passengerToken = createToken({ id: "passenger-1", role: "PASSENGER" });

  beforeEach(async () => {
    await clearPresenceDatabase();

    await createPresenceLine({
      lineId: "line-dashboard-1",
      ownerDriverId: "driver-owner",
      driverId: "driver-linked",
      capacity: 10,
      nextDate: "2026-05-25",
      points: [
        { id: "ponto-ida", segment: "ida", type: "pickup", time: "07:00" },
        { id: "ponto-volta", segment: "volta", type: "dropoff", time: "18:00" },
      ],
    });

    for (let i = 1; i <= 8; i += 1) {
      const passengerId = `passenger-${i}`;
      await addPassengerToLine("line-dashboard-1", passengerId, "ponto-ida");
      await addPassengerToLine("line-dashboard-1", passengerId, "ponto-volta");
    }
  });

  test("deve retornar dashboard de ocupação e alertas para motorista dono", async () => {
    const response = await request(app)
      .get(
        "/api/v1/operations/lines/line-dashboard-1/dashboard?date=2026-05-25",
      )
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.occupancy).toBeDefined();
    expect(response.body.alerts).toBeDefined();
    expect(response.body.occupancy.outbound.percentage).toBe(80);
    expect(
      response.body.alerts.some((alert) => alert.level === "critical"),
    ).toBe(true);
  });

  test("deve listar linhas operacionais do motorista", async () => {
    const response = await request(app)
      .get("/api/v1/operations/lines")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.lines)).toBe(true);
    expect(response.body.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lineId: "line-dashboard-1",
          nextDate: "2026-05-25",
          capacity: 10,
        }),
      ]),
    );
  });

  test("deve permitir acesso ao motorista atrelado", async () => {
    const response = await request(app)
      .get(
        "/api/v1/operations/lines/line-dashboard-1/dashboard?date=2026-05-25",
      )
      .set("Authorization", `Bearer ${linkedToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test("deve bloquear acesso para passageiro", async () => {
    const response = await request(app)
      .get(
        "/api/v1/operations/lines/line-dashboard-1/dashboard?date=2026-05-25",
      )
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("FORBIDDEN_RESOURCE");
  });

  test("deve bloquear listagem de linhas operacionais para passageiro", async () => {
    const response = await request(app)
      .get("/api/v1/operations/lines")
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("FORBIDDEN_RESOURCE");
  });

  test("deve bloquear motorista sem vínculo", async () => {
    const response = await request(app)
      .get(
        "/api/v1/operations/lines/line-dashboard-1/dashboard?date=2026-05-25",
      )
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("FORBIDDEN_RESOURCE");
  });

  test("deve retornar erro para linha inexistente", async () => {
    const response = await request(app)
      .get(
        "/api/v1/operations/lines/line-inexistente/dashboard?date=2026-05-25",
      )
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("LINE_NOT_FOUND");
  });

  test("deve retornar erro para data inválida", async () => {
    const response = await request(app)
      .get(
        "/api/v1/operations/lines/line-dashboard-1/dashboard?date=2026-99-99",
      )
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("INVALID_OCCUPANCY_DATE");
  });
});
