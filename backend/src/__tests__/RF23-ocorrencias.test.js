/**
 * RF23: Registro de Ocorrências
 */

process.env.USE_MOCK_DB = "true";

const {
  registerOccurrence,
  listOccurrences,
  clearOccurrenceDatabase,
} = require("../services/occurrenceService");

const base = {
  lineId: "line-rf23",
  driverId: "driver-rf23",
  type: "slow_traffic",
};

describe("RF23: Registro de Ocorrências", () => {
  beforeEach(async () => { await clearOccurrenceDatabase(); });

  describe("Cenários de Sucesso", () => {
    it("Cenário 23.1: deve registrar trânsito lento com localização", async () => {
      const result = await registerOccurrence({
        ...base, latitude: -23.55, longitude: -46.63, notes: "Via Dutra congestionada",
      });
      expect(result.success).toBe(true);
      expect(result.occurrence.type).toBe("slow_traffic");
      expect(result.occurrence.latitude).toBe(-23.55);
    });

    it("Cenário 23.2: deve registrar passageiro atrasado com referência", async () => {
      const result = await registerOccurrence({
        ...base, type: "passenger_late", passengerId: "p-rf23-1", notes: "Esperando 5 minutos",
      });
      expect(result.success).toBe(true);
      expect(result.occurrence.passengerId).toBe("p-rf23-1");
    });

    it("Cenário 23.3: deve registrar passageiro não apareceu", async () => {
      const result = await registerOccurrence({
        ...base, type: "passenger_no_show", passengerId: "p-rf23-2",
      });
      expect(result.success).toBe(true);
      expect(result.occurrence.type).toBe("passenger_no_show");
    });

    it("Cenário 23.4: deve listar ocorrências da linha por data", async () => {
      await registerOccurrence({ ...base, type: "slow_traffic" });
      await registerOccurrence({ ...base, type: "other", notes: "Desvio de rota" });

      const date = new Date().toISOString().slice(0, 10);
      const result = await listOccurrences("line-rf23", date);
      expect(result.success).toBe(true);
      expect(result.occurrences.length).toBe(2);
    });

    it("Cenário 23.5: deve registrar ocorrência sem GPS", async () => {
      const result = await registerOccurrence({ ...base, type: "other" });
      expect(result.success).toBe(true);
      expect(result.occurrence.latitude).toBeNull();
      expect(result.occurrence.longitude).toBeNull();
    });

    it("deve registrar ocorrência do tipo other com nota", async () => {
      const result = await registerOccurrence({ ...base, type: "other", notes: "Pneu furado" });
      expect(result.success).toBe(true);
      expect(result.occurrence.notes).toBe("Pneu furado");
    });
  });

  describe("Cenários de Erro", () => {
    it("Cenário 23.6: deve rejeitar tipo inválido", async () => {
      const result = await registerOccurrence({ ...base, type: "acidente_grave" });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/tipo/i);
    });

    it("deve rejeitar sem lineId", async () => {
      const result = await registerOccurrence({ ...base, lineId: "" });
      expect(result.success).toBe(false);
    });

    it("deve rejeitar sem driverId", async () => {
      const result = await registerOccurrence({ ...base, driverId: "" });
      expect(result.success).toBe(false);
    });
  });
});
