/**
 * RF7: Check-in por Geofencing (Sensor de GPS)
 * Testes automatizados para ativação de linha, check-in e notificação de próximo ponto.
 */

process.env.USE_MOCK_DB = "true";

const {
  createGeofenceLine,
  startLineExecution,
  processGeofenceCheckIn,
  getLineExecutionState,
  subscribeToNextPointNotifications,
  clearGeofencingDatabase,
} = require("../services/geofencingService");

describe("RF7: Check-in por Geofencing (Sensor de GPS)", () => {
  const lineId = "line-rf7-1";
  const ownerDriverId = "driver-owner";
  const operatorDriverId = "driver-operator";
  const externalDriverId = "driver-external";
  const passengerUserId = "passenger-user";
  const nextDate = "2026-06-15";

  const pointA = "ponto-a";
  const pointB = "ponto-b";
  const pointC = "ponto-c";

  beforeEach(async () => {
    await clearGeofencingDatabase();

    await createGeofenceLine({
      lineId,
      ownerDriverId,
      driverId: operatorDriverId,
      nextDate,
      points: [
        {
          id: pointA,
          segment: "ida",
          radiusMeters: 120,
          latitude: -23.226,
          longitude: -45.883,
          confirmedPassengerIds: ["passenger-1", "passenger-2"],
        },
        {
          id: pointB,
          segment: "ida",
          radiusMeters: 120,
          latitude: -23.227,
          longitude: -45.884,
          confirmedPassengerIds: ["passenger-3"],
        },
        {
          id: pointC,
          segment: "ida",
          radiusMeters: 120,
          latitude: -23.228,
          longitude: -45.885,
          confirmedPassengerIds: [],
        },
      ],
    });
  });

  describe("Cenários de Sucesso", () => {
    it("Cenário 7.1: motorista deve iniciar linha manualmente", async () => {
      const result = await startLineExecution(lineId, ownerDriverId, nextDate);

      expect(result.success).toBe(true);
      expect(result.execution.isActive).toBe(true);
    });

    it("Cenário 7.2: sem iniciar linha, check-in não deve processar", async () => {
      const result = await processGeofenceCheckIn({
        lineId,
        pointId: pointA,
        driverId: ownerDriverId,
        date: nextDate,
        location: { latitude: -23.226, longitude: -45.883 },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("linha ativa");
    });

    it("Cenário 7.3: deve registrar check-in ao entrar no raio do ponto", async () => {
      await startLineExecution(lineId, ownerDriverId, nextDate);

      const result = await processGeofenceCheckIn({
        lineId,
        pointId: pointA,
        driverId: ownerDriverId,
        date: nextDate,
        location: { latitude: -23.226, longitude: -45.883 },
      });

      expect(result.success).toBe(true);
      expect(result.checkIn.pointId).toBe(pointA);
      expect(result.checkIn.timestamp).toBeDefined();
    });

    it("Cenário 7.4: deve notificar passageiros do próximo ponto na ida", async () => {
      await startLineExecution(lineId, ownerDriverId, nextDate);

      const notifications = [];
      const unsubscribe = subscribeToNextPointNotifications(
        lineId,
        (payload) => {
          notifications.push(payload);
        },
      );

      await processGeofenceCheckIn({
        lineId,
        pointId: pointA,
        driverId: ownerDriverId,
        date: nextDate,
        location: { latitude: -23.226, longitude: -45.883 },
      });

      unsubscribe();

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].nextPointId).toBe(pointB);
      expect(notifications[0].segment).toBe("ida");
    });

    it("Cenário 7.5: deve notificar próximo ponto respeitando trecho de volta", async () => {
      await createGeofenceLine({
        lineId: "line-rf7-2",
        ownerDriverId,
        nextDate,
        points: [
          {
            id: "ponto-v1",
            segment: "volta",
            radiusMeters: 120,
            latitude: -23.32,
            longitude: -45.92,
            confirmedPassengerIds: ["passenger-11"],
          },
          {
            id: "ponto-v2",
            segment: "volta",
            radiusMeters: 120,
            latitude: -23.321,
            longitude: -45.921,
            confirmedPassengerIds: ["passenger-12"],
          },
        ],
      });

      await startLineExecution("line-rf7-2", ownerDriverId, nextDate);

      const result = await processGeofenceCheckIn({
        lineId: "line-rf7-2",
        pointId: "ponto-v1",
        driverId: ownerDriverId,
        date: nextDate,
        location: { latitude: -23.32, longitude: -45.92 },
      });

      expect(result.success).toBe(true);
      expect(result.notification.segment).toBe("volta");
      expect(result.notification.nextPointId).toBe("ponto-v2");
    });

    it("Cenário 7.6: deve ignorar ponto sem confirmados", async () => {
      await startLineExecution(lineId, ownerDriverId, nextDate);

      await processGeofenceCheckIn({
        lineId,
        pointId: pointA,
        driverId: ownerDriverId,
        date: nextDate,
        location: { latitude: -23.226, longitude: -45.883 },
      });

      const state = await getLineExecutionState(
        lineId,
        ownerDriverId,
        nextDate,
      );

      expect(state.success).toBe(true);
      expect(state.execution.skippedPointIds).toContain(pointC);
    });

    it("Cenário 7.7: motorista dono deve operar execução da linha", async () => {
      const start = await startLineExecution(lineId, ownerDriverId, nextDate);
      expect(start.success).toBe(true);
    });

    it("Cenário 7.8: motorista atrelado deve operar execução da linha", async () => {
      const start = await startLineExecution(
        lineId,
        operatorDriverId,
        nextDate,
      );
      expect(start.success).toBe(true);
    });
  });

  describe("Cenários de Erro", () => {
    it("Cenário 7.9: passageiro não deve iniciar linha", async () => {
      const result = await startLineExecution(
        lineId,
        passengerUserId,
        nextDate,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("permissão");
    });

    it("Cenário 7.10: motorista sem vínculo não deve iniciar linha", async () => {
      const result = await startLineExecution(
        lineId,
        externalDriverId,
        nextDate,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("permissão");
    });

    it("Cenário 7.11: deve falhar para linha inexistente", async () => {
      const result = await startLineExecution(
        "line-inexistente",
        ownerDriverId,
        nextDate,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Linha não encontrada");
    });

    it("Cenário 7.12: deve falhar para ponto inexistente", async () => {
      await startLineExecution(lineId, ownerDriverId, nextDate);

      const result = await processGeofenceCheckIn({
        lineId,
        pointId: "ponto-inexistente",
        driverId: ownerDriverId,
        date: nextDate,
        location: { latitude: -23.22, longitude: -45.88 },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("ponto");
    });

    it("Cenário 7.13: deve falhar quando localização está indisponível", async () => {
      await startLineExecution(lineId, ownerDriverId, nextDate);

      const result = await processGeofenceCheckIn({
        lineId,
        pointId: pointA,
        driverId: ownerDriverId,
        date: nextDate,
        location: null,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("localização");
    });

    it("Cenário 7.14: não deve confirmar chegada fora do raio", async () => {
      await startLineExecution(lineId, ownerDriverId, nextDate);

      const result = await processGeofenceCheckIn({
        lineId,
        pointId: pointA,
        driverId: ownerDriverId,
        date: nextDate,
        location: { latitude: -23.5, longitude: -45.2 },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("fora do raio");
    });

    it("Cenário 7.15: deve bloquear notificação duplicada no mesmo ponto", async () => {
      await startLineExecution(lineId, ownerDriverId, nextDate);

      const first = await processGeofenceCheckIn({
        lineId,
        pointId: pointA,
        driverId: ownerDriverId,
        date: nextDate,
        location: { latitude: -23.226, longitude: -45.883 },
      });

      const second = await processGeofenceCheckIn({
        lineId,
        pointId: pointA,
        driverId: ownerDriverId,
        date: nextDate,
        location: { latitude: -23.226, longitude: -45.883 },
      });

      expect(first.success).toBe(true);
      expect(second.success).toBe(false);
      expect(second.error).toContain("duplicada");
    });
  });
});
