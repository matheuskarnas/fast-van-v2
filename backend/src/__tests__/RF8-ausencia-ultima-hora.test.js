/**
 * RF8: Registro de Ausência de Última Hora
 * Passageiro reverte ausência já marcada, sujeito a verificação de vaga no slot e prazo.
 */

process.env.USE_MOCK_DB = "true";

const {
  createPresenceLine,
  addPassengerToLine,
  markPassengerPresence,
  getPassengerPresenceStatus,
  clearPresenceDatabase,
} = require("../services/presenceService");

describe("RF8: Registro de Ausência de Última Hora", () => {
  const lineId = "line-rf8-1";
  const driverId = "driver-rf8";
  const passenger1 = "p-rf8-1";
  const passenger2 = "p-rf8-2";
  const passenger3 = "p-rf8-3";
  const date = "2026-06-10";
  const beforeDeadline = `${date}T06:50:00`;
  const afterDeadline = `${date}T07:05:00`;

  beforeEach(async () => {
    await clearPresenceDatabase();

    // capacity: 3 — comportamento padrão para cenários de sucesso
    await createPresenceLine({
      lineId,
      ownerDriverId: driverId,
      capacity: 3,
      points: [
        {
          id: "ponto-ida",
          address: "Rua A, 100",
          time: "07:00",
          segment: "ida",
          passengers: [],
        },
      ],
    });

    await addPassengerToLine(lineId, passenger1, "ponto-ida");
    await addPassengerToLine(lineId, passenger2, "ponto-ida");
    await addPassengerToLine(lineId, passenger3, "ponto-ida");
  });

  describe("Cenários de Sucesso", () => {
    it("Cenário 8.1: deve reverter ausência total para vai e volta com vaga disponível", async () => {
      // passenger1 marca ausência
      await markPassengerPresence(lineId, passenger1, date, "não vai e nem volta", {
        currentDateTime: beforeDeadline,
      });

      // RF8: reverte ausência
      const result = await markPassengerPresence(lineId, passenger1, date, "vai e volta", {
        currentDateTime: beforeDeadline,
      });

      const status = await getPassengerPresenceStatus(lineId, passenger1, date);

      expect(result.success).toBe(true);
      expect(status.status).toBe("vai e volta");
      expect(status.outboundConfirmed).toBe(true);
      expect(status.returnConfirmed).toBe(true);
    });

    it("Cenário 8.2: deve reverter ausência de ida para vai e volta com vaga disponível", async () => {
      await markPassengerPresence(lineId, passenger1, date, "não vou mas volto", {
        currentDateTime: beforeDeadline,
      });

      const result = await markPassengerPresence(lineId, passenger1, date, "vai e volta", {
        currentDateTime: beforeDeadline,
      });

      const status = await getPassengerPresenceStatus(lineId, passenger1, date);

      expect(result.success).toBe(true);
      expect(status.outboundConfirmed).toBe(true);
      expect(status.returnConfirmed).toBe(true);
    });

    it("Cenário 8.5: passageiro já confirmado com vai e volta permanece inalterado", async () => {
      // passenger1 já está com status padrão "vai e volta"
      const result = await markPassengerPresence(lineId, passenger1, date, "vai e volta", {
        currentDateTime: beforeDeadline,
      });

      const status = await getPassengerPresenceStatus(lineId, passenger1, date);

      expect(result.success).toBe(true);
      expect(status.status).toBe("vai e volta");
    });
  });

  describe("Cenário 8.3: bloqueio por capacidade lotada", () => {
    const lineIdLotada = "line-rf8-lotada";

    beforeEach(async () => {
      // Linha separada com capacity: 2 para simular slot lotado
      await createPresenceLine({
        lineId: lineIdLotada,
        ownerDriverId: driverId,
        capacity: 2,
        points: [{ id: "ponto-lotado", address: "Rua B, 50", time: "07:00", segment: "ida", passengers: [] }],
      });
      await addPassengerToLine(lineIdLotada, passenger1, "ponto-lotado");
      await addPassengerToLine(lineIdLotada, passenger2, "ponto-lotado");
      await addPassengerToLine(lineIdLotada, passenger3, "ponto-lotado");
    });

    it("deve bloquear reversão quando slot de ida está lotado", async () => {
      // passenger1 marca ausência — passenger2 e passenger3 confirmados = 2/2 vagas
      await markPassengerPresence(lineIdLotada, passenger1, date, "não vai e nem volta", {
        currentDateTime: beforeDeadline,
      });

      const result = await markPassengerPresence(lineIdLotada, passenger1, date, "vai e volta", {
        currentDateTime: beforeDeadline,
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/vagas/i);
    });
  });

  describe("Cenário 8.4: bloqueio por prazo encerrado", () => {
    it("deve bloquear reversão após horário de embarque", async () => {
      await markPassengerPresence(lineId, passenger1, date, "não vai e nem volta", {
        currentDateTime: beforeDeadline,
      });

      const result = await markPassengerPresence(lineId, passenger1, date, "vai e volta", {
        currentDateTime: afterDeadline,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Prazo para alteração de presença encerrado");
    });
  });

  describe("Cenário 8.6: passageiro não matriculado", () => {
    it("deve bloquear com erro de autorização", async () => {
      const result = await markPassengerPresence(lineId, "passageiro-forasteiro", date, "vai e volta", {
        currentDateTime: beforeDeadline,
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/permissão/i);
    });
  });

  describe("Cenário 8.7: data inválida", () => {
    it("deve bloquear com erro de data inválida", async () => {
      const result = await markPassengerPresence(lineId, passenger1, "10/06/2026", "vai e volta", {
        currentDateTime: beforeDeadline,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Data de presença inválida");
    });
  });

  describe("Cenário 8.8: usuário não autenticado", () => {
    it("deve bloquear sem autenticação", async () => {
      const result = await markPassengerPresence(lineId, passenger1, date, "vai e volta", {
        isAuthenticated: false,
        currentDateTime: beforeDeadline,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuário não autenticado");
    });
  });
});
