/**
 * RF9: Painel de Decisão — Uma ou Duas Vans
 */

process.env.USE_MOCK_DB = "true";

const {
  registerVanDecision,
  getVanDecision,
  clearDecisionDatabase,
} = require("../services/vanDecisionService");

describe("RF9: Painel de Decisão — Uma ou Duas Vans", () => {
  const lineId = "line-rf9-1";
  const ownerId = "driver-owner-rf9";
  const linkedDriverId = "driver-linked-rf9";
  const date = "2026-06-10";

  beforeEach(async () => {
    await clearDecisionDatabase();
  });

  describe("Cenários de Sucesso", () => {
    it("Cenário 9.3: deve registrar decisão de usar 1 van", async () => {
      const result = await registerVanDecision({
        lineId, driverId: ownerId, date, decision: "single_van",
      });

      expect(result.success).toBe(true);
      expect(result.decision.decision).toBe("single_van");
      expect(result.decision.lineId).toBe(lineId);
      expect(result.decision.date).toBe(date);
    });

    it("Cenário 9.4: deve registrar decisão de acionar 2ª van da frota", async () => {
      const result = await registerVanDecision({
        lineId, driverId: ownerId, date, decision: "double_van_fleet", vehicleId: "vehicle-2",
      });

      expect(result.success).toBe(true);
      expect(result.decision.decision).toBe("double_van_fleet");
      expect(result.decision.vehicleId).toBe("vehicle-2");
    });

    it("Cenário 9.5: deve registrar decisão de chamar Uber/99", async () => {
      const result = await registerVanDecision({
        lineId, driverId: ownerId, date, decision: "double_van_app",
      });

      expect(result.success).toBe(true);
      expect(result.decision.decision).toBe("double_van_app");
    });

    it("Cenário 9.6: deve atualizar decisão já existente", async () => {
      await registerVanDecision({ lineId, driverId: ownerId, date, decision: "single_van" });
      const result = await registerVanDecision({ lineId, driverId: ownerId, date, decision: "double_van_app" });

      expect(result.success).toBe(true);
      expect(result.decision.decision).toBe("double_van_app");

      const fetched = await getVanDecision(lineId, date);
      expect(fetched.success).toBe(true);
      expect(fetched.decision.decision).toBe("double_van_app");
    });

    it("deve retornar null quando não há decisão para o dia", async () => {
      const result = await getVanDecision(lineId, date);
      expect(result.success).toBe(true);
      expect(result.decision).toBeNull();
    });

    it("deve recuperar decisão registrada", async () => {
      await registerVanDecision({ lineId, driverId: ownerId, date, decision: "single_van" });
      const result = await getVanDecision(lineId, date);
      expect(result.success).toBe(true);
      expect(result.decision.decision).toBe("single_van");
    });
  });

  describe("Cenários de Erro", () => {
    it("deve rejeitar decisão inválida", async () => {
      const result = await registerVanDecision({
        lineId, driverId: ownerId, date, decision: "tres_vans",
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/decisão inválida/i);
    });

    it("Cenário 9.9: deve rejeitar data inválida", async () => {
      const result = await registerVanDecision({
        lineId, driverId: ownerId, date: "10/06/2026", decision: "single_van",
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/data/i);
    });

    it("deve rejeitar sem lineId", async () => {
      const result = await registerVanDecision({
        lineId: "", driverId: ownerId, date, decision: "single_van",
      });
      expect(result.success).toBe(false);
    });
  });
});
