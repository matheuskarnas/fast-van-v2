/**
 * RF14: Avaliação de Viagens
 */

process.env.USE_MOCK_DB = "true";

const {
  submitRating,
  getDriverRatings,
  getMyRating,
  clearRatingsDatabase,
} = require("../services/ratingService");

const validRating = {
  lineId: "line-rf14-1",
  passengerId: "passenger-rf14-1",
  driverId: "driver-rf14-1",
  vehicleId: "vehicle-rf14-1",
  month: "2026-06",
  punctuality: 5,
  driving: 4,
  friendliness: 5,
  comfort: 4,
  vehicleQuality: 3,
  hygiene: 5,
  comment: "Ótimo motorista!",
};

describe("RF14: Avaliação de Viagens", () => {
  beforeEach(async () => { await clearRatingsDatabase(); });

  describe("Cenários de Sucesso", () => {
    it("Cenário 14.1/14.2: deve registrar avaliação completa", async () => {
      const result = await submitRating(validRating);
      expect(result.success).toBe(true);
      expect(result.rating.punctuality).toBe(5);
      expect(result.rating.comfort).toBe(4);
      expect(result.rating.comment).toBe("Ótimo motorista!");
    });

    it("Cenário 14.3: deve calcular médias do motorista", async () => {
      await submitRating(validRating);
      await submitRating({ ...validRating, passengerId: "p2", punctuality: 3, driving: 3, friendliness: 3 });

      const result = await getDriverRatings(validRating.driverId);
      expect(result.success).toBe(true);
      expect(result.averages.punctuality).toBe(4);   // (5+3)/2
      expect(result.averages.driving).toBe(3.5);     // (4+3)/2
      expect(result.totalRatings).toBe(2);
    });

    it("Cenário 14.4: deve bloquear segunda avaliação no mesmo mês", async () => {
      await submitRating(validRating);
      const result = await submitRating(validRating);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/já avaliou/i);
    });

    it("Cenário 14.5: deve aceitar avaliação sem comentário", async () => {
      const { comment, ...withoutComment } = validRating;
      const result = await submitRating(withoutComment);
      expect(result.success).toBe(true);
    });

    it("deve recuperar avaliação já feita pelo passageiro", async () => {
      await submitRating(validRating);
      const result = await getMyRating(validRating.passengerId, validRating.lineId, validRating.month);
      expect(result.success).toBe(true);
      expect(result.rating).not.toBeNull();
      expect(result.rating.punctuality).toBe(5);
    });

    it("deve retornar null quando passageiro ainda não avaliou", async () => {
      const result = await getMyRating("p-novo", validRating.lineId, validRating.month);
      expect(result.success).toBe(true);
      expect(result.rating).toBeNull();
    });
  });

  describe("Cenários de Erro", () => {
    it("Cenário 14.7: deve bloquear nota fora de 1-5", async () => {
      const result = await submitRating({ ...validRating, punctuality: 6 });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/nota/i);
    });

    it("deve bloquear nota abaixo de 1", async () => {
      const result = await submitRating({ ...validRating, driving: 0 });
      expect(result.success).toBe(false);
    });

    it("Cenário 14.9: deve bloquear competência inválida", async () => {
      const result = await submitRating({ ...validRating, month: "06/2026" });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/competência/i);
    });
  });
});
