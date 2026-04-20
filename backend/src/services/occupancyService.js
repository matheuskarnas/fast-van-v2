/**
 * Serviço de Ocupação em Tempo Real (RF4)
 * Consolida confirmados, porcentagem e rota diária para a próxima data da linha.
 */

const {
  getPresenceLineById,
  getConfirmedPassengersBySegment,
  buildDailyRoute,
  subscribeToPresenceChanges,
} = require("./presenceService");

function isValidDateString(date) {
  if (typeof date !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

function roundOccupancyPercent(confirmedCount, capacity) {
  return Math.round((confirmedCount / capacity) * 100);
}

function canViewLine(line, driverId) {
  const authorizedDriverIds = Array.isArray(line.authorizedDriverIds)
    ? line.authorizedDriverIds
    : [line.ownerDriverId, line.driverId].filter(Boolean);

  return authorizedDriverIds.includes(driverId);
}

async function getLineOccupancy(lineId, date, driverId) {
  if (!isValidDateString(date)) {
    return {
      success: false,
      error: "Data de ocupação inválida",
    };
  }

  const lineResult = await getPresenceLineById(lineId);
  if (!lineResult.success) {
    return lineResult;
  }

  const line = lineResult.line;

  if (!canViewLine(line, driverId)) {
    return {
      success: false,
      error: "Você não tem permissão para visualizar a lotação desta linha",
    };
  }

  if (line.nextDate && line.nextDate !== date) {
    return {
      success: false,
      error: "A consulta de ocupação só é permitida para a próxima data da linha",
    };
  }

  if (!line.capacity || line.capacity <= 0) {
    return {
      success: false,
      error: "Capacidade da linha inválida",
    };
  }

  const confirmedResult = await getConfirmedPassengersBySegment(
    lineId,
    date,
    driverId,
  );

  if (!confirmedResult.success) {
    return confirmedResult;
  }

  const routeResult = await buildDailyRoute(lineId, date);
  if (!routeResult.success) {
    return routeResult;
  }

  const outboundConfirmed = confirmedResult.confirmed.outbound;
  const returnConfirmed = confirmedResult.confirmed.return;

  return {
    success: true,
    lineId,
    date,
    capacity: line.capacity,
    occupancy: {
      outbound: {
        confirmedCount: outboundConfirmed.length,
        percentage: roundOccupancyPercent(outboundConfirmed.length, line.capacity),
        confirmedPassengerIds: outboundConfirmed,
      },
      return: {
        confirmedCount: returnConfirmed.length,
        percentage: roundOccupancyPercent(returnConfirmed.length, line.capacity),
        confirmedPassengerIds: returnConfirmed,
      },
    },
    routePoints: routeResult.points,
  };
}

function subscribeToLineOccupancy(lineId, date, driverId, onUpdate) {
  const unsubscribePresence = subscribeToPresenceChanges(async (event) => {
    if (event.lineId !== lineId) {
      return;
    }

    if (event.date && event.date !== date) {
      return;
    }

    const occupancyResult = await getLineOccupancy(lineId, date, driverId);
    if (occupancyResult.success) {
      onUpdate(occupancyResult);
    }
  });

  return () => {
    unsubscribePresence();
  };
}

module.exports = {
  getLineOccupancy,
  subscribeToLineOccupancy,
};
