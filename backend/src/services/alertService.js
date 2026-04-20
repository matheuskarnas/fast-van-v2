/**
 * Serviço de Alertas de Lotação Crítica (RF5)
 * Usa a ocupação do RF4 para emitir alertas por trecho e em tempo real.
 */

const {
  getLineOccupancy,
  subscribeToLineOccupancy,
} = require("./occupancyService");

function isValidDateString(date) {
  if (typeof date !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

function buildAlertForSegment(segmentName, occupancyData) {
  const { confirmedCount, percentage } = occupancyData;

  if (percentage > 100) {
    return {
      segment: segmentName,
      active: true,
      level: "capacity-exceeded",
      threshold: 100,
      confirmedCount,
      percentage,
      message: `Capacidade excedida na ${segmentName}: ${percentage}%`,
    };
  }

  if (percentage >= 80) {
    return {
      segment: segmentName,
      active: true,
      level: "critical",
      threshold: 80,
      confirmedCount,
      percentage,
      message: `Lotação crítica na ${segmentName}: ${percentage}%`,
    };
  }

  return {
    segment: segmentName,
    active: false,
    level: "normal",
    threshold: 80,
    confirmedCount,
    percentage,
    message: `Lotação normal na ${segmentName}: ${percentage}%`,
  };
}

function buildAlertsFromOccupancy(occupancyResult) {
  const outboundAlert = buildAlertForSegment(
    "ida",
    occupancyResult.occupancy.outbound,
  );
  const returnAlert = buildAlertForSegment(
    "volta",
    occupancyResult.occupancy.return,
  );

  const activeAlerts = [outboundAlert, returnAlert].filter(
    (alert) => alert.active,
  );

  return {
    success: true,
    lineId: occupancyResult.lineId,
    date: occupancyResult.date,
    capacity: occupancyResult.capacity,
    alerts: activeAlerts,
    occupancy: occupancyResult.occupancy,
    routePoints: occupancyResult.routePoints,
    hasCriticalAlert: activeAlerts.some((alert) => alert.level === "critical"),
    hasExceededAlert: activeAlerts.some(
      (alert) => alert.level === "capacity-exceeded",
    ),
  };
}

async function getLineAlerts(lineId, date, driverId) {
  if (!isValidDateString(date)) {
    return {
      success: false,
      error: "Data de alerta inválida",
    };
  }

  const occupancyResult = await getLineOccupancy(lineId, date, driverId);
  if (!occupancyResult.success) {
    return occupancyResult;
  }

  return buildAlertsFromOccupancy(occupancyResult);
}

function subscribeToLineAlerts(lineId, date, driverId, onUpdate) {
  return subscribeToLineOccupancy(lineId, date, driverId, (occupancyResult) => {
    const alertsResult = buildAlertsFromOccupancy(occupancyResult);
    onUpdate(alertsResult);
  });
}

module.exports = {
  getLineAlerts,
  subscribeToLineAlerts,
  buildAlertsFromOccupancy,
};
