/**
 * RF25: Passageiro Não Embarcou
 */

process.env.USE_MOCK_DB = "true";

const {
  registerNoShow,
} = require("../services/noShowService");

const {
  createPresenceLine,
  addPassengerToLine,
  markPassengerPresence,
  clearPresenceDatabase,
} = require("../services/presenceService");

const lineId = "line-rf25";
const driverId = "driver-rf25";
const date = new Date().toISOString().slice(0, 10);

describe("RF25: Passageiro Não Embarcou", () => {
  beforeEach(async () => {
    await clearPresenceDatabase();
    await createPresenceLine({ lineId, ownerDriverId: driverId, capacity: 10 });
    await addPassengerToLine(lineId, "p1", null);
    await addPassengerToLine(lineId, "p2", null);
    await addPassengerToLine(lineId, "p3", null);
    // p3 marca ausência total
    await markPassengerPresence(lineId, "p3", date, "não vai e nem volta", { isAuthenticated: true });
    // p4 marca só volta
    await addPassengerToLine(lineId, "p4", null);
    await markPassengerPresence(lineId, "p4", date, "não vou mas volto", { isAuthenticated: true });
  });

  describe("Cenários de Sucesso", () => {
    it("Cenário 25.2: deve registrar no-show de passageiro confirmado na ida", async () => {
      const result = await registerNoShow({
        lineId, driverId, passengerId: "p1", segment: "ida", date,
        latitude: -23.55, longitude: -46.63,
      });
      expect(result.success).toBe(true);
      expect(result.occurrence.type).toBe("passenger_no_show");
      expect(result.occurrence.passengerId).toBe("p1");
    });

    it("Cenário 25.5: deve registrar no-show de passageiro não vou mas volto na volta", async () => {
      const result = await registerNoShow({
        lineId, driverId, passengerId: "p4", segment: "volta", date,
      });
      expect(result.success).toBe(true);
      expect(result.occurrence.type).toBe("passenger_no_show");
    });

    it("deve registrar no-show sem GPS disponível", async () => {
      const result = await registerNoShow({ lineId, driverId, passengerId: "p2", segment: "ida", date });
      expect(result.success).toBe(true);
      expect(result.occurrence.latitude).toBeNull();
    });
  });

  describe("Cenários de Erro", () => {
    it("Cenário 25.4: deve bloquear passageiro com status não vai e nem volta", async () => {
      const result = await registerNoShow({ lineId, driverId, passengerId: "p3", segment: "ida", date });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/não confirmado/i);
    });

    it("deve bloquear passageiro só vou como no-show na volta", async () => {
      await markPassengerPresence(lineId, "p2", date, "só vou e não volto", { isAuthenticated: true });
      const result = await registerNoShow({ lineId, driverId, passengerId: "p2", segment: "volta", date });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/não confirmado/i);
    });

    it("Cenário 25.8: deve bloquear sem passengerId", async () => {
      const result = await registerNoShow({ lineId, driverId, passengerId: "", segment: "ida", date });
      expect(result.success).toBe(false);
    });

    it("deve bloquear segmento inválido", async () => {
      const result = await registerNoShow({ lineId, driverId, passengerId: "p1", segment: "invalido", date });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/segmento/i);
    });
  });
});
