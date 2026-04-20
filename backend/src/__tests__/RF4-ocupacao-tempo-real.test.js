/**
 * RF4: Visualização de Ocupação da Van em Tempo Real
 * Testes automatizados para lotação, rota diária e atualização live.
 */

process.env.USE_MOCK_DB = "true";

const {
  createPresenceLine,
  addPassengerToLine,
  linkPassengerToPoint,
  markPassengerPresence,
  clearPresenceDatabase,
} = require("../services/presenceService");

const {
  getLineOccupancy,
  subscribeToLineOccupancy,
} = require("../services/occupancyService");

describe("RF4: Visualização de Ocupação da Van em Tempo Real", () => {
  const lineId = "line-rf4-1";
  const ownerDriverId = "driver-owner";
  const operatorDriverId = "driver-operator";
  const otherDriverId = "driver-other";
  const passengerUserId = "passenger-user";
  const nextDate = "2026-05-10";

  const passenger1 = "passenger-1";
  const passenger2 = "passenger-2";
  const passenger3 = "passenger-3";
  const passenger4 = "passenger-4";

  beforeEach(async () => {
    await clearPresenceDatabase();

    await createPresenceLine({
      lineId,
      ownerDriverId,
      driverId: operatorDriverId,
      capacity: 16,
      nextDate,
      points: [
        {
          id: "ponto-a-ida",
          address: "Rua A",
          time: "07:00",
          segment: "ida",
        },
        {
          id: "ponto-b-ida",
          address: "Rua B",
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
    await addPassengerToLine(lineId, passenger4, "ponto-b-ida");

    await linkPassengerToPoint(lineId, passenger1, "ponto-volta");
    await linkPassengerToPoint(lineId, passenger2, "ponto-volta");
    await linkPassengerToPoint(lineId, passenger3, "ponto-volta");
    await linkPassengerToPoint(lineId, passenger4, "ponto-volta");
  });

  describe("Cenários de Sucesso", () => {
    it("Cenário 4.1: deve exibir ocupação inicial da próxima data", async () => {
      const result = await getLineOccupancy(lineId, nextDate, ownerDriverId);

      expect(result.success).toBe(true);
      expect(result.capacity).toBe(16);
      expect(result.occupancy.outbound.confirmedCount).toBe(4);
      expect(result.occupancy.return.confirmedCount).toBe(4);
    });

    it("Cenário 4.2: deve exibir somente confirmados na ida", async () => {
      await markPassengerPresence(
        lineId,
        passenger1,
        nextDate,
        "não vou mas volto",
        { currentDateTime: "2026-05-10T06:20:00" },
      );

      const result = await getLineOccupancy(lineId, nextDate, ownerDriverId);

      expect(result.success).toBe(true);
      expect(result.occupancy.outbound.confirmedPassengerIds).toEqual([
        passenger2,
        passenger3,
        passenger4,
      ]);
    });

    it("Cenário 4.3: deve exibir somente confirmados na volta", async () => {
      await markPassengerPresence(
        lineId,
        passenger2,
        nextDate,
        "só vou e não volto",
        { currentDateTime: "2026-05-10T06:30:00" },
      );

      const result = await getLineOccupancy(lineId, nextDate, ownerDriverId);

      expect(result.success).toBe(true);
      expect(result.occupancy.return.confirmedPassengerIds).toEqual([
        passenger1,
        passenger3,
        passenger4,
      ]);
    });

    it("Cenário 4.4: deve atualizar em live quando presença muda", async () => {
      const updates = [];
      const unsubscribe = subscribeToLineOccupancy(
        lineId,
        nextDate,
        ownerDriverId,
        (payload) => {
          updates.push(payload);
        },
      );

      await markPassengerPresence(
        lineId,
        passenger1,
        nextDate,
        "não vai e nem volta",
        { currentDateTime: "2026-05-10T06:10:00" },
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      unsubscribe();

      expect(updates.length).toBeGreaterThan(0);
      const lastUpdate = updates[updates.length - 1];
      expect(lastUpdate.occupancy.outbound.confirmedCount).toBe(3);
      expect(lastUpdate.occupancy.return.confirmedCount).toBe(3);
    });

    it("Cenário 4.5: deve remover ponto da rota exibida sem confirmados", async () => {
      await markPassengerPresence(
        lineId,
        passenger1,
        nextDate,
        "não vou mas volto",
        { currentDateTime: "2026-05-10T06:10:00" },
      );
      await markPassengerPresence(
        lineId,
        passenger2,
        nextDate,
        "não vai e nem volta",
        { currentDateTime: "2026-05-10T06:10:00" },
      );

      const result = await getLineOccupancy(lineId, nextDate, ownerDriverId);
      const pointIds = result.routePoints.map((point) => point.id);

      expect(result.success).toBe(true);
      expect(pointIds).not.toContain("ponto-a-ida");
      expect(pointIds).toContain("ponto-b-ida");
    });

    it("Cenário 4.6: deve calcular percentual inteiro sem casas decimais", async () => {
      await markPassengerPresence(
        lineId,
        passenger4,
        nextDate,
        "não vai e nem volta",
        { currentDateTime: "2026-05-10T06:15:00" },
      );

      const result = await getLineOccupancy(lineId, nextDate, ownerDriverId);

      expect(result.success).toBe(true);
      expect(Number.isInteger(result.occupancy.outbound.percentage)).toBe(true);
      expect(result.occupancy.outbound.percentage).toBe(19);
    });

    it("Cenário 4.7: motorista dono pode visualizar lotação", async () => {
      const result = await getLineOccupancy(lineId, nextDate, ownerDriverId);

      expect(result.success).toBe(true);
    });

    it("Cenário 4.8: motorista atrelado pode visualizar lotação", async () => {
      const result = await getLineOccupancy(lineId, nextDate, operatorDriverId);

      expect(result.success).toBe(true);
    });
  });

  describe("Cenários de Erro", () => {
    it("Cenário 4.9: passageiro não pode visualizar lotação", async () => {
      const result = await getLineOccupancy(lineId, nextDate, passengerUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("permissão");
    });

    it("Cenário 4.10: motorista não vinculado não pode visualizar lotação", async () => {
      const result = await getLineOccupancy(lineId, nextDate, otherDriverId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("permissão");
    });

    it("Cenário 4.11: deve bloquear consulta fora da próxima data", async () => {
      const result = await getLineOccupancy(
        lineId,
        "2026-05-11",
        ownerDriverId,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("próxima data");
    });

    it("Cenário 4.12: deve falhar para linha inexistente", async () => {
      const result = await getLineOccupancy(
        "line-inexistente",
        nextDate,
        ownerDriverId,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Linha não encontrada");
    });

    it("Cenário 4.13: deve falhar com capacidade inválida", async () => {
      await createPresenceLine({
        lineId: "line-sem-capacidade",
        ownerDriverId,
        capacity: 0,
        nextDate,
      });

      const result = await getLineOccupancy(
        "line-sem-capacidade",
        nextDate,
        ownerDriverId,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Capacidade da linha inválida");
    });
  });
});
