const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../index");
const { clearGeofencingDatabase } = require("../services/geofencingService");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

describe("RF7 API HTTP: Geofencing", () => {
  const driverToken = createToken({ id: "driver-owner", role: "DRIVER" });
  const passengerToken = createToken({ id: "passenger-1", role: "PASSENGER" });
  const linkedDriverToken = createToken({ id: "driver-linked", role: "DRIVER" });
  const strangerDriverToken = createToken({ id: "driver-stranger", role: "DRIVER" });

  beforeEach(async () => {
    await clearGeofencingDatabase();
  });

  test("deve criar linha de geofence para motorista", async () => {
    const response = await request(app)
      .post("/api/v1/geofencing/lines")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        lineId: "line-http-1",
        driverId: "driver-linked",
        nextDate: "2026-04-21",
        points: [],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.lineId).toBe("line-http-1");
  });

  test("deve bloquear criação de geofence por passageiro", async () => {
    const response = await request(app)
      .post("/api/v1/geofencing/lines")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        lineId: "line-http-2",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  test("deve iniciar execução e processar check-in com sucesso", async () => {
    await request(app)
      .post("/api/v1/geofencing/lines")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        lineId: "line-http-3",
        driverId: "driver-linked",
        nextDate: "2026-04-21",
        points: [
          {
            id: "ponto-a",
            segment: "IDA",
            latitude: -23.55052,
            longitude: -46.633308,
            radiusMeters: 120,
            confirmedPassengerIds: ["passenger-1"],
          },
        ],
      });

    const startResponse = await request(app)
      .post("/api/v1/geofencing/lines/line-http-3/start")
      .set("Authorization", `Bearer ${linkedDriverToken}`)
      .send({ date: "2026-04-21" });

    expect(startResponse.status).toBe(200);
    expect(startResponse.body.success).toBe(true);

    const checkInResponse = await request(app)
      .post("/api/v1/geofencing/lines/line-http-3/check-ins")
      .set("Authorization", `Bearer ${linkedDriverToken}`)
      .send({
        pointId: "ponto-a",
        date: "2026-04-21",
        location: {
          latitude: -23.55052,
          longitude: -46.6333,
        },
      });

    expect(checkInResponse.status).toBe(200);
    expect(checkInResponse.body.success).toBe(true);
    expect(checkInResponse.body.checkIn.pointId).toBe("ponto-a");
  });

  test("deve retornar 403 para motorista sem vínculo ao consultar execução", async () => {
    await request(app)
      .post("/api/v1/geofencing/lines")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        lineId: "line-http-4",
        points: [],
      });

    await request(app)
      .post("/api/v1/geofencing/lines/line-http-4/start")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ date: "2026-04-21" });

    const response = await request(app)
      .get("/api/v1/geofencing/lines/line-http-4/execution?date=2026-04-21")
      .set("Authorization", `Bearer ${strangerDriverToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
