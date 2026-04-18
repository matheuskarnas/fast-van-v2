/**
 * RF3: Confirmação de Presença pelo Aluno
 * Testes automatizados para validação de presença/ausência por data
 */

process.env.USE_MOCK_DB = "true";

const {
  DEFAULT_STATUS,
  createPresenceLine,
  addPassengerToLine,
  linkPassengerToPoint,
  removePassengerFromLine,
  markPassengerPresence,
  getPassengerPresenceStatus,
  getConfirmedPassengersBySegment,
  buildDailyRoute,
  clearPresenceDatabase,
} = require("../services/presenceService");

describe("RF3: Confirmação de Presença pelo Aluno", () => {
  const lineId = "line-rf3-1";
  const driverId = "driver-1";
  const passenger1 = "passenger-1";
  const passenger2 = "passenger-2";
  const passenger3 = "passenger-3";

  beforeEach(async () => {
    await clearPresenceDatabase();

    await createPresenceLine({
      lineId,
      driverId,
      points: [
        {
          id: "ponto-a-ida",
          address: "Rua A, 100",
          time: "07:00",
          segment: "ida",
        },
        {
          id: "ponto-b-ida",
          address: "Rua B, 200",
          time: "07:20",
          segment: "ida",
        },
        {
          id: "ponto-volta",
          address: "Fatec-SJC",
          time: "18:10",
          segment: "volta",
        },
      ],
    });

    await addPassengerToLine(lineId, passenger1, "ponto-a-ida");
    await addPassengerToLine(lineId, passenger2, "ponto-a-ida");
    await addPassengerToLine(lineId, passenger3, "ponto-b-ida");

    await linkPassengerToPoint(lineId, passenger1, "ponto-volta");
    await linkPassengerToPoint(lineId, passenger2, "ponto-volta");
    await linkPassengerToPoint(lineId, passenger3, "ponto-volta");
  });

  describe("Cenários de Sucesso", () => {
    it("Cenário 3.1: passageiro adicionado inicia como vai e volta", async () => {
      const result = await getPassengerPresenceStatus(
        lineId,
        passenger1,
        "2026-04-20",
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe(DEFAULT_STATUS);
      expect(result.outboundConfirmed).toBe(true);
      expect(result.returnConfirmed).toBe(true);
    });

    it("Cenário 3.2: deve marcar ausência total para data futura", async () => {
      const markResult = await markPassengerPresence(
        lineId,
        passenger1,
        "2026-04-20",
        "não vai e nem volta",
        { currentDateTime: "2026-04-20T06:30:00" },
      );

      const statusResult = await getPassengerPresenceStatus(
        lineId,
        passenger1,
        "2026-04-20",
      );

      expect(markResult.success).toBe(true);
      expect(statusResult.success).toBe(true);
      expect(statusResult.outboundConfirmed).toBe(false);
      expect(statusResult.returnConfirmed).toBe(false);
    });

    it("Cenário 3.3: deve marcar ausência apenas na volta", async () => {
      await markPassengerPresence(
        lineId,
        passenger1,
        "2026-04-20",
        "só vou e não volto",
        { currentDateTime: "2026-04-20T06:45:00" },
      );

      const statusResult = await getPassengerPresenceStatus(
        lineId,
        passenger1,
        "2026-04-20",
      );

      expect(statusResult.success).toBe(true);
      expect(statusResult.outboundConfirmed).toBe(true);
      expect(statusResult.returnConfirmed).toBe(false);
    });

    it("Cenário 3.4: deve marcar ausência apenas na ida", async () => {
      await markPassengerPresence(
        lineId,
        passenger1,
        "2026-04-20",
        "não vou mas volto",
        { currentDateTime: "2026-04-20T06:45:00" },
      );

      const statusResult = await getPassengerPresenceStatus(
        lineId,
        passenger1,
        "2026-04-20",
      );

      expect(statusResult.success).toBe(true);
      expect(statusResult.outboundConfirmed).toBe(false);
      expect(statusResult.returnConfirmed).toBe(true);
    });

    it("Cenário 3.5: motorista visualiza confirmados por trecho", async () => {
      await markPassengerPresence(
        lineId,
        passenger2,
        "2026-04-20",
        "não vai e nem volta",
        { currentDateTime: "2026-04-20T06:40:00" },
      );
      await markPassengerPresence(
        lineId,
        passenger3,
        "2026-04-20",
        "não vou mas volto",
        { currentDateTime: "2026-04-20T06:40:00" },
      );

      const confirmedResult = await getConfirmedPassengersBySegment(
        lineId,
        "2026-04-20",
        driverId,
      );

      expect(confirmedResult.success).toBe(true);
      expect(confirmedResult.confirmed.outbound).toEqual([passenger1]);
      expect(confirmedResult.confirmed.return).toEqual([
        passenger1,
        passenger3,
      ]);
    });

    it("Cenário 3.6: deve remover ponto da rota diária quando todos estão ausentes", async () => {
      await markPassengerPresence(
        lineId,
        passenger1,
        "2026-04-20",
        "não vou mas volto",
        { currentDateTime: "2026-04-20T06:30:00" },
      );
      await markPassengerPresence(
        lineId,
        passenger2,
        "2026-04-20",
        "não vai e nem volta",
        { currentDateTime: "2026-04-20T06:30:00" },
      );

      const routeResult = await buildDailyRoute(lineId, "2026-04-20");

      expect(routeResult.success).toBe(true);
      const pointIds = routeResult.points.map((point) => point.id);
      expect(pointIds).not.toContain("ponto-a-ida");
      expect(pointIds).toContain("ponto-b-ida");
      expect(pointIds).toContain("ponto-volta");
    });

    it("Cenário 3.7: deve alterar marcação antes do horário limite", async () => {
      const firstMark = await markPassengerPresence(
        lineId,
        passenger1,
        "2026-04-20",
        "não vai e nem volta",
        { currentDateTime: "2026-04-20T06:00:00" },
      );

      const secondMark = await markPassengerPresence(
        lineId,
        passenger1,
        "2026-04-20",
        "só vou e não volto",
        { currentDateTime: "2026-04-20T06:45:00" },
      );

      const statusResult = await getPassengerPresenceStatus(
        lineId,
        passenger1,
        "2026-04-20",
      );

      expect(firstMark.success).toBe(true);
      expect(secondMark.success).toBe(true);
      expect(statusResult.status).toBe("só vou e não volto");
      expect(statusResult.outboundConfirmed).toBe(true);
      expect(statusResult.returnConfirmed).toBe(false);
    });
  });

  describe("Cenários de Erro", () => {
    it("Cenário 3.8: passageiro fora da linha não pode marcar presença", async () => {
      const result = await markPassengerPresence(
        lineId,
        "passenger-fora-linha",
        "2026-04-20",
        "não vai e nem volta",
        { currentDateTime: "2026-04-20T06:00:00" },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("permissão");
    });

    it("Cenário 3.9: não deve permitir alteração após horário de embarque", async () => {
      const result = await markPassengerPresence(
        lineId,
        passenger1,
        "2026-04-20",
        "não vai e nem volta",
        { currentDateTime: "2026-04-20T07:05:00" },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Prazo para alteração de presença encerrado");
    });

    it("Cenário 3.10: deve bloquear status de presença inválido", async () => {
      const result = await markPassengerPresence(
        lineId,
        passenger1,
        "2026-04-20",
        "status inválido",
        { currentDateTime: "2026-04-20T06:00:00" },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Status de presença inválido");
    });

    it("Cenário 3.11: deve bloquear data inválida para marcação", async () => {
      const result = await markPassengerPresence(
        lineId,
        passenger1,
        "20-04-2026",
        "não vai e nem volta",
        { currentDateTime: "2026-04-20T06:00:00" },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Data de presença inválida");
    });

    it("Cenário 3.12: usuário não autenticado não pode marcar presença", async () => {
      const result = await markPassengerPresence(
        lineId,
        passenger1,
        "2026-04-20",
        "não vai e nem volta",
        { isAuthenticated: false, currentDateTime: "2026-04-20T06:00:00" },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Usuário não autenticado");
    });

    it("Cenário 3.13: passageiro removido da linha não pode marcar presença", async () => {
      const removeResult = await removePassengerFromLine(
        lineId,
        passenger1,
        driverId,
      );

      const markResult = await markPassengerPresence(
        lineId,
        passenger1,
        "2026-04-20",
        "não vai e nem volta",
        { currentDateTime: "2026-04-20T06:00:00" },
      );

      expect(removeResult.success).toBe(true);
      expect(markResult.success).toBe(false);
      expect(markResult.error).toContain("permissão");
    });
  });
});
