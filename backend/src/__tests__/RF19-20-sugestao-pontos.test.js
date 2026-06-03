/**
 * RF19/20: Sugestão de Pontos pelo Passageiro
 */

process.env.USE_MOCK_DB = "true";

const {
  createSuggestion,
  listPendingSuggestions,
  listMySuggestions,
  decideSuggestion,
  clearSuggestionDatabase,
} = require("../services/pointSuggestionService");

const lineId = "line-rf19";
const ownerId = "driver-rf19";
const passId = "passenger-rf19";
const date = new Date().toISOString().slice(0, 10);

const validSuggestion = {
  lineId,
  passengerId: passId,
  address: "Rua das Flores, 100, Caçapava",
  type: "pickup",
  segment: "ida",
  latitude: -23.1,
  longitude: -45.7,
  placeId: "place-abc",
};

describe("RF19/20: Sugestão de Pontos pelo Passageiro", () => {
  beforeEach(async () => { await clearSuggestionDatabase(); });

  describe("Cenários de Sucesso", () => {
    it("Cenário 19.1: deve criar sugestão com status pending", async () => {
      const result = await createSuggestion(validSuggestion);
      expect(result.success).toBe(true);
      expect(result.suggestion.status).toBe("pending");
      expect(result.suggestion.address).toBe(validSuggestion.address);
    });

    it("Cenário 19.3: motorista vê sugestões pendentes", async () => {
      await createSuggestion(validSuggestion);
      await createSuggestion({ ...validSuggestion, passengerId: "p2", address: "Rua B" });

      const result = await listPendingSuggestions(lineId);
      expect(result.success).toBe(true);
      expect(result.suggestions.length).toBe(2);
      expect(result.suggestions.every((s) => s.status === "pending")).toBe(true);
    });

    it("Cenário 19.4: motorista aprova sugestão", async () => {
      const created = await createSuggestion(validSuggestion);
      const result = await decideSuggestion(created.suggestion.id, ownerId, "approved");
      expect(result.success).toBe(true);
      expect(result.suggestion.status).toBe("approved");
    });

    it("Cenário 19.5: motorista rejeita sugestão com motivo", async () => {
      const created = await createSuggestion(validSuggestion);
      const result = await decideSuggestion(created.suggestion.id, ownerId, "rejected", "Ponto fora da rota");
      expect(result.success).toBe(true);
      expect(result.suggestion.status).toBe("rejected");
      expect(result.suggestion.rejectionReason).toBe("Ponto fora da rota");
    });

    it("Cenário 20.1: passageiro vê suas sugestões em todos os status", async () => {
      const s1 = await createSuggestion(validSuggestion);
      const s2 = await createSuggestion({ ...validSuggestion, address: "Rua B" });
      await decideSuggestion(s2.suggestion.id, ownerId, "approved");

      const result = await listMySuggestions(lineId, passId);
      expect(result.success).toBe(true);
      expect(result.suggestions.length).toBe(2);
    });

    it("Cenário 20.2: passageiro pode criar múltiplas sugestões", async () => {
      await createSuggestion(validSuggestion);
      await createSuggestion({ ...validSuggestion, address: "Rua C", segment: "volta" });

      const result = await listMySuggestions(lineId, passId);
      expect(result.success).toBe(true);
      expect(result.suggestions.length).toBe(2);
    });
  });

  describe("Cenários de Erro", () => {
    it("Cenário E3: deve bloquear sugestão sem endereço", async () => {
      const result = await createSuggestion({ ...validSuggestion, address: "" });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/endereço/i);
    });

    it("deve bloquear tipo inválido", async () => {
      const result = await createSuggestion({ ...validSuggestion, type: "invalido" });
      expect(result.success).toBe(false);
    });

    it("deve bloquear decisão inválida", async () => {
      const created = await createSuggestion(validSuggestion);
      const result = await decideSuggestion(created.suggestion.id, ownerId, "talvez");
      expect(result.success).toBe(false);
    });

    it("deve bloquear decisão em sugestão inexistente", async () => {
      const result = await decideSuggestion("id-inexistente", ownerId, "approved");
      expect(result.success).toBe(false);
    });
  });
});
