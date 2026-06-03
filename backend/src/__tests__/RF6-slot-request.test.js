/**
 * RF6: Exceção de Horário + Fila de Espera
 */

process.env.USE_MOCK_DB = "true";

const {
  requestSlotChange,
  cancelSlotRequest,
  promoteFromWaitlist,
  clearSlotRequestDatabase,
} = require("../services/slotRequestService");

const {
  createPresenceLine,
  addPassengerToLine,
  markPassengerPresence,
  clearPresenceDatabase,
} = require("../services/presenceService");

const lineId = "line-rf6";
const date = new Date(Date.now() + 864e5).toISOString().slice(0, 10); // amanhã
const capacity = 2;

describe("RF6: Exceção de Horário + Fila de Espera", () => {
  beforeEach(async () => {
    await clearPresenceDatabase();
    await clearSlotRequestDatabase();

    await createPresenceLine({ lineId, ownerDriverId: "d-rf6", capacity });
    // p1 cadastrado no slot 07:10
    await addPassengerToLine(lineId, "p1-rf6", null, { departureTime: "07:10", arrivalTime: "12:35" });
    // p2 e p3 cadastrados no slot 08:00 (ocupam as 2 vagas)
    await addPassengerToLine(lineId, "p2-rf6", null, { departureTime: "08:00", arrivalTime: "10:55" });
    await addPassengerToLine(lineId, "p3-rf6", null, { departureTime: "08:00", arrivalTime: "10:55" });
  });

  describe("Cenários de Sucesso", () => {
    it("Cenário 6.1: deve confirmar troca quando há vaga no slot", async () => {
      // p2 marca ausência, liberando uma vaga no slot 08:00
      await markPassengerPresence(lineId, "p2-rf6", date, "não vai e nem volta", { isAuthenticated: true });

      const result = await requestSlotChange({
        lineId, passengerId: "p1-rf6", date,
        requestedDepartureTime: "08:00", requestedArrivalTime: "10:55",
      });

      expect(result.success).toBe(true);
      expect(result.slotStatus).toBe("switched");
      expect(result.alternateDepartureTime).toBe("08:00");
    });

    it("Cenário 6.2: deve entrar na fila quando slot está lotado", async () => {
      // slot 08:00 cheio: p2 e p3 confirmados
      const result = await requestSlotChange({
        lineId, passengerId: "p1-rf6", date,
        requestedDepartureTime: "08:00", requestedArrivalTime: "10:55",
      });

      expect(result.success).toBe(true);
      expect(result.slotStatus).toBe("waitlist");
    });

    it("Cenário 6.3: deve promover da fila quando vaga abre", async () => {
      // p1 entra na fila do slot 08:00
      await requestSlotChange({
        lineId, passengerId: "p1-rf6", date,
        requestedDepartureTime: "08:00", requestedArrivalTime: "10:55",
      });

      // p2 marca ausência → vaga abre → p1 deve ser promovido
      await markPassengerPresence(lineId, "p2-rf6", date, "não vai e nem volta", { isAuthenticated: true });
      const promoted = await promoteFromWaitlist(lineId, date, "08:00");

      expect(promoted.success).toBe(true);
      expect(promoted.promoted).toBe("p1-rf6");
    });

    it("Cenário 6.4: deve cancelar troca e voltar ao slot original", async () => {
      await markPassengerPresence(lineId, "p2-rf6", date, "não vai e nem volta", { isAuthenticated: true });
      await requestSlotChange({
        lineId, passengerId: "p1-rf6", date,
        requestedDepartureTime: "08:00", requestedArrivalTime: "10:55",
      });

      const result = await cancelSlotRequest(lineId, "p1-rf6", date);
      expect(result.success).toBe(true);
      expect(result.slotStatus).toBe("confirmed");
    });
  });

  describe("Cenários de Erro", () => {
    it("Cenário 6.6: deve rejeitar solicitação para o próprio slot", async () => {
      const result = await requestSlotChange({
        lineId, passengerId: "p2-rf6", date,
        requestedDepartureTime: "08:00", requestedArrivalTime: "10:55",
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/mesmo slot/i);
    });

    it("Cenário 6.8: deve rejeitar data inválida", async () => {
      const result = await requestSlotChange({
        lineId, passengerId: "p1-rf6", date: "10/06/2026",
        requestedDepartureTime: "08:00", requestedArrivalTime: "10:55",
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/data/i);
    });
  });
});
