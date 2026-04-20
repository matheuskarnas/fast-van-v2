/**
 * RF5: Sistema de Alerta de Lotação Crítica
 * Testes automatizados para alerta de 80% e acima de 100% com live updates.
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
  getLineAlerts,
  subscribeToLineAlerts,
} = require("../services/alertService");

describe("RF5: Sistema de Alerta de Lotação Crítica", () => {
  const lineId = "line-rf5-1";
  const ownerDriverId = "driver-owner";
  const operatorDriverId = "driver-operator";
  const passengerUserId = "passenger-user";
  const otherDriverId = "driver-other";
  const nextDate = "2026-05-20";

  const passengers = Array.from(
    { length: 17 },
    (_, index) => `passenger-${index + 1}`,
  );

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
          id: "ponto-volta",
          address: "Fatec-SJC",
          time: "18:10",
          segment: "volta",
        },
      ],
    });

    for (const passengerId of passengers) {
      const pointId =
        passengerId === "passenger-1" ? "ponto-a-ida" : "ponto-volta";
      await addPassengerToLine(lineId, passengerId, pointId);
      await linkPassengerToPoint(lineId, passengerId, pointId);
    }
  });

  async function markPassengersAbsent(passengerIds) {
    for (const passengerId of passengerIds) {
      await markPassengerPresence(
        lineId,
        passengerId,
        nextDate,
        "não vai e nem volta",
        { currentDateTime: "2026-05-20T06:10:00" },
      );
    }
  }

  describe("Cenários de Sucesso", () => {
    it("Cenário 5.1: deve emitir alerta crítico a partir de 80%", async () => {
      await markPassengersAbsent(passengers.slice(13));

      const result = await getLineAlerts(lineId, nextDate, ownerDriverId);

      expect(result.success).toBe(true);
      expect(result.alerts.length).toBe(2);
      expect(result.hasCriticalAlert).toBe(true);
      expect(result.alerts[0].percentage).toBe(81);
      expect(result.alerts[0].level).toBe("critical");
    });

    it("Cenário 5.2: deve emitir alerta de capacidade excedida acima de 100%", async () => {
      for (const passengerId of passengers) {
        await markPassengerPresence(
          lineId,
          passengerId,
          nextDate,
          "vai e volta",
          { currentDateTime: "2026-05-20T06:10:00" },
        );
      }

      const result = await getLineAlerts(lineId, nextDate, ownerDriverId);

      expect(result.success).toBe(true);
      expect(result.hasExceededAlert).toBe(true);
      expect(result.alerts[0].percentage).toBe(106);
      expect(result.alerts[0].level).toBe("capacity-exceeded");
    });

    it("Cenário 5.3: deve exibir alerta por trecho", async () => {
      for (const passengerId of passengers.slice(0, 13)) {
        await markPassengerPresence(
          lineId,
          passengerId,
          nextDate,
          "vai e volta",
          { currentDateTime: "2026-05-20T06:10:00" },
        );
      }

      const result = await getLineAlerts(lineId, nextDate, ownerDriverId);

      expect(result.success).toBe(true);
      expect(result.alerts.map((alert) => alert.segment)).toEqual([
        "ida",
        "volta",
      ]);
    });

    it("Cenário 5.4: deve atualizar alerta em tempo real", async () => {
      await markPassengersAbsent(passengers.slice(12));

      const updates = [];
      const unsubscribe = subscribeToLineAlerts(
        lineId,
        nextDate,
        ownerDriverId,
        (payload) => {
          updates.push(payload);
        },
      );

      await markPassengerPresence(
        lineId,
        passengers[12],
        nextDate,
        "vai e volta",
        { currentDateTime: "2026-05-20T06:10:00" },
      );

      await new Promise((resolve) => setTimeout(resolve, 0));
      unsubscribe();

      expect(updates.length).toBeGreaterThan(0);
      const lastUpdate = updates[updates.length - 1];
      expect(lastUpdate.hasCriticalAlert).toBe(true);
      expect(lastUpdate.alerts[0].level).toBe("critical");
    });

    it("Cenário 5.5: deve exibir percentual inteiro", async () => {
      await markPassengersAbsent(passengers.slice(13));

      const result = await getLineAlerts(lineId, nextDate, ownerDriverId);

      expect(Number.isInteger(result.alerts[0].percentage)).toBe(true);
    });

    it("Cenário 5.6: motorista dono pode visualizar alertas", async () => {
      const result = await getLineAlerts(lineId, nextDate, ownerDriverId);

      expect(result.success).toBe(true);
    });

    it("Cenário 5.7: motorista atrelado pode visualizar alertas", async () => {
      const result = await getLineAlerts(lineId, nextDate, operatorDriverId);

      expect(result.success).toBe(true);
    });
  });

  describe("Cenários de Erro", () => {
    it("Cenário 5.8: passageiro não pode acessar alertas", async () => {
      const result = await getLineAlerts(lineId, nextDate, passengerUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("permissão");
    });

    it("Cenário 5.9: motorista sem vínculo não pode acessar alertas", async () => {
      const result = await getLineAlerts(lineId, nextDate, otherDriverId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("permissão");
    });

    it("Cenário 5.10: deve bloquear consulta fora da próxima data", async () => {
      const result = await getLineAlerts(lineId, "2026-05-21", ownerDriverId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("próxima data");
    });

    it("Cenário 5.11: deve falhar para linha inexistente", async () => {
      const result = await getLineAlerts(
        "line-inexistente",
        nextDate,
        ownerDriverId,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Linha não encontrada");
    });

    it("Cenário 5.12: deve falhar com capacidade inválida", async () => {
      await createPresenceLine({
        lineId: "line-sem-capacidade",
        ownerDriverId,
        capacity: 0,
        nextDate,
      });

      const result = await getLineAlerts(
        "line-sem-capacidade",
        nextDate,
        ownerDriverId,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Capacidade da linha inválida");
    });
  });
});
