process.env.USE_MOCK_DB = "true";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../index");
const lineService = require("../services/lineService");
const { createUser } = require("../services/authService");
const { clearDatabase: clearUserDatabase } = require("../services/userService");
const { createVehicle, clearVehicleDatabase } = require("../services/vehicleService");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

describe("RF2 HTTP: CRUD de Linhas e Pontos", () => {
  let driverId;
  let driverToken;
  let vehicleId;
  let passengerToken;

  beforeAll(async () => {
    await lineService.clearLineDatabase();
    await clearVehicleDatabase();
    await clearUserDatabase();

    const driverResult = await createUser({
      name: "Motorista HTTP",
      cpf: "123.456.789-09",
      cnh: "12345678901",
      birthDate: "1988-01-01T00:00:00.000Z",
      email: "driver.http@example.com",
      password: "Driver@123",
      role: "DRIVER",
    });
    driverId = driverResult.user.id;
    driverToken = createToken({ id: driverId, role: "DRIVER" });

    const vehicleResult = await createVehicle(driverId, {
      plate: "HTL1N23",
      model: "Sprinter 415",
      year: 2020,
      capacity: 16,
    });
    vehicleId = vehicleResult.vehicle.id;

    passengerToken = createToken({ id: "passenger-1", role: "PASSENGER" });
  });

  beforeEach(async () => {
    await lineService.clearLineDatabase();
  });

  // ===== POST /api/v1/lines =====

  describe("POST /api/v1/lines", () => {
    test("deve criar linha com dados válidos (201)", async () => {
      const res = await request(app)
        .post("/api/v1/lines")
        .set("Authorization", `Bearer ${driverToken}`)
        .send({
          name: "Linha Manhã",
          originCity: "Caçapava",
          destinationPlace: "Fatec-SJC",
          vehicleId,
          arrivalTimes: ["07:00"],
          departureTimes: ["12:00"],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.line.originCity).toBe("Caçapava");
      expect(res.body.line.destinationPlace).toBe("Fatec-SJC");
      expect(res.body.line.capacity).toBe(16);
      expect(res.body.line.pickupDropoffPoints).toEqual([]);
    });

    test("deve bloquear passageiro (403)", async () => {
      const res = await request(app)
        .post("/api/v1/lines")
        .set("Authorization", `Bearer ${passengerToken}`)
        .send({
          originCity: "Caçapava",
          destinationPlace: "Fatec-SJC",
          vehicleId,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test("deve bloquear sem autenticação (401)", async () => {
      const res = await request(app)
        .post("/api/v1/lines")
        .send({ name: "Linha Manhã", originCity: "Caçapava", destinationPlace: "Fatec-SJC", vehicleId, arrivalTimes: ["07:00"], departureTimes: ["12:00"] });

      expect(res.status).toBe(401);
    });

    test("deve rejeitar sem cidade de origem (400)", async () => {
      const res = await request(app)
        .post("/api/v1/lines")
        .set("Authorization", `Bearer ${driverToken}`)
        .send({ name: "Linha Manhã", originCity: "", destinationPlace: "Fatec-SJC", vehicleId, arrivalTimes: ["07:00"], departureTimes: ["12:00"] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/origem/i);
    });

    test("deve rejeitar veículo de outro motorista (400)", async () => {
      const otherDriver = await createUser({
        name: "Outro Motorista",
        cpf: "222.333.444-05",
        cnh: "22233344405",
        birthDate: "1992-01-01T00:00:00.000Z",
        email: "outro.http@example.com",
        password: "Driver@123",
        role: "DRIVER",
      });
      const otherToken = createToken({ id: otherDriver.user.id, role: "DRIVER" });

      const res = await request(app)
        .post("/api/v1/lines")
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ name: "Linha Manhã", originCity: "Caçapava", destinationPlace: "Fatec-SJC", vehicleId, arrivalTimes: ["07:00"], departureTimes: ["12:00"] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/veículo|pertence/i);
    });
  });

  // ===== GET /api/v1/lines =====

  describe("GET /api/v1/lines", () => {
    test("deve listar linhas do motorista (200)", async () => {
      await lineService.createLine(
        { vehicleId, name: "Linha Manhã", originCity: "Caçapava", destinationPlace: "Fatec-SJC", arrivalTimes: ["07:00"], departureTimes: ["12:00"] },
        driverId,
      );

      const res = await request(app)
        .get("/api/v1/lines")
        .set("Authorization", `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.lines.length).toBe(1);
      expect(res.body.lines[0].originCity).toBe("Caçapava");
    });

    test("deve bloquear passageiro (403)", async () => {
      const res = await request(app)
        .get("/api/v1/lines")
        .set("Authorization", `Bearer ${passengerToken}`);

      expect(res.status).toBe(403);
    });

    test("deve bloquear sem autenticação (401)", async () => {
      const res = await request(app).get("/api/v1/lines");

      expect(res.status).toBe(401);
    });
  });

  // ===== GET /api/v1/lines/:id =====

  describe("GET /api/v1/lines/:id", () => {
    test("deve retornar detalhes da linha (200)", async () => {
      const lineRes = await lineService.createLine(
        { vehicleId, name: "Linha Manhã", originCity: "Caçapava", destinationPlace: "Fatec-SJC", arrivalTimes: ["07:00"], departureTimes: ["12:00"] },
        driverId,
      );

      const res = await request(app)
        .get(`/api/v1/lines/${lineRes.line.id}`)
        .set("Authorization", `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.line.id).toBe(lineRes.line.id);
    });

    test("deve bloquear motorista não vinculado (403)", async () => {
      const lineRes = await lineService.createLine(
        { vehicleId, name: "Linha Manhã", originCity: "Caçapava", destinationPlace: "Fatec-SJC", arrivalTimes: ["07:00"], departureTimes: ["12:00"] },
        driverId,
      );

      const otherToken = createToken({ id: "driver-externo", role: "DRIVER" });

      const res = await request(app)
        .get(`/api/v1/lines/${lineRes.line.id}`)
        .set("Authorization", `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test("deve retornar 404 para linha inexistente", async () => {
      const res = await request(app)
        .get("/api/v1/lines/line-inexistente")
        .set("Authorization", `Bearer ${driverToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ===== POST /api/v1/lines/:id/points =====

  describe("POST /api/v1/lines/:id/points", () => {
    test("deve adicionar ponto com sucesso (201)", async () => {
      const lineRes = await lineService.createLine(
        { vehicleId, name: "Linha Manhã", originCity: "Caçapava", destinationPlace: "Fatec-SJC", arrivalTimes: ["07:00"], departureTimes: ["12:00"] },
        driverId,
      );

      const res = await request(app)
        .post(`/api/v1/lines/${lineRes.line.id}/points`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({ address: "Rua das Flores, 100", type: "pickup" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.point.address).toBe("Rua das Flores, 100");
      expect(res.body.point.type).toBe("pickup");
    });

    test("deve rejeitar ponto sem endereço (400)", async () => {
      const lineRes = await lineService.createLine(
        { vehicleId, name: "Linha Manhã", originCity: "Caçapava", destinationPlace: "Fatec-SJC", arrivalTimes: ["07:00"], departureTimes: ["12:00"] },
        driverId,
      );

      const res = await request(app)
        .post(`/api/v1/lines/${lineRes.line.id}/points`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({ address: "", type: "pickup" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ===== PATCH /api/v1/lines/:id/points/:pointId =====

  describe("PATCH /api/v1/lines/:id/points/:pointId", () => {
    test("deve atualizar ponto com sucesso (200)", async () => {
      const lineRes = await lineService.createLine(
        { vehicleId, name: "Linha Manhã", originCity: "Caçapava", destinationPlace: "Fatec-SJC", arrivalTimes: ["07:00"], departureTimes: ["12:00"] },
        driverId,
      );
      const lineId = lineRes.line.id;

      const pointRes = await lineService.addPickupDropoffPoint(
        lineId,
        { address: "Endereço Original", type: "pickup" },
        driverId,
      );

      const res = await request(app)
        .patch(`/api/v1/lines/${lineId}/points/${pointRes.point.id}`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({ address: "Endereço Novo", type: "dropoff" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.point.address).toBe("Endereço Novo");
      expect(res.body.point.type).toBe("dropoff");
    });

    test("deve retornar 404 para ponto inexistente", async () => {
      const lineRes = await lineService.createLine(
        { vehicleId, name: "Linha Manhã", originCity: "Caçapava", destinationPlace: "Fatec-SJC", arrivalTimes: ["07:00"], departureTimes: ["12:00"] },
        driverId,
      );

      const res = await request(app)
        .patch(`/api/v1/lines/${lineRes.line.id}/points/point-fake`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({ address: "Novo" });

      expect(res.status).toBe(404);
    });
  });

  // ===== DELETE /api/v1/lines/:id/points/:pointId =====

  describe("DELETE /api/v1/lines/:id/points/:pointId", () => {
    test("deve remover ponto sem passageiros (200)", async () => {
      const lineRes = await lineService.createLine(
        { vehicleId, name: "Linha Manhã", originCity: "Caçapava", destinationPlace: "Fatec-SJC", arrivalTimes: ["07:00"], departureTimes: ["12:00"] },
        driverId,
      );
      const lineId = lineRes.line.id;

      const pointRes = await lineService.addPickupDropoffPoint(
        lineId,
        { address: "Ponto Temp", type: "pickup" },
        driverId,
      );

      const res = await request(app)
        .delete(`/api/v1/lines/${lineId}/points/${pointRes.point.id}`)
        .set("Authorization", `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test("deve bloquear remoção de ponto com passageiros (400)", async () => {
      const lineRes = await lineService.createLine(
        { vehicleId, name: "Linha Manhã", originCity: "Caçapava", destinationPlace: "Fatec-SJC", arrivalTimes: ["07:00"], departureTimes: ["12:00"] },
        driverId,
      );
      const lineId = lineRes.line.id;

      const pointRes = await lineService.addPickupDropoffPoint(
        lineId,
        { address: "Ponto com Gente", type: "pickup", passengerId: "pass-1" },
        driverId,
      );

      const res = await request(app)
        .delete(`/api/v1/lines/${lineId}/points/${pointRes.point.id}`)
        .set("Authorization", `Bearer ${driverToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
