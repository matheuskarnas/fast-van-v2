/**
 * Serviço de Geofencing e Check-in (RF7)
 * Gerencia ativação da linha, check-ins por proximidade e notificação do próximo ponto.
 */

let lineStore = [];
let privateSubscriberMap = {};

function getLine(lineId) {
  return lineStore.find((line) => line.id === lineId) || null;
}

function hasDriverPermission(line, driverId) {
  return line.authorizedDriverIds.includes(driverId);
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceMeters(from, to) {
  const earthRadiusMeters = 6371000;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(lonDelta / 2) *
      Math.sin(lonDelta / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function notifyNextPoint(lineId, payload) {
  const subscribers = privateSubscriberMap[lineId] || new Set();
  subscribers.forEach((subscriber) => {
    subscriber(payload);
  });
}

async function createGeofenceLine(lineData) {
  const {
    lineId,
    ownerDriverId,
    driverId,
    nextDate,
    points = [],
  } = lineData || {};

  if (!lineId || !ownerDriverId) {
    return {
      success: false,
      error: "Dados da linha inválidos",
    };
  }

  if (getLine(lineId)) {
    return {
      success: false,
      error: "Linha já cadastrada",
    };
  }

  lineStore.push({
    id: lineId,
    ownerDriverId,
    driverId: driverId || null,
    authorizedDriverIds: [ownerDriverId, driverId].filter(Boolean),
    nextDate: nextDate || null,
    points: points.map((point) => ({ ...point })),
    execution: {
      isActive: false,
      startedBy: null,
      date: null,
      processedPointIds: [],
      skippedPointIds: [],
      checkIns: [],
    },
  });

  return {
    success: true,
    lineId,
  };
}

async function startLineExecution(lineId, driverId, date) {
  const line = getLine(lineId);

  if (!line) {
    return {
      success: false,
      error: "Linha não encontrada",
    };
  }

  if (!hasDriverPermission(line, driverId)) {
    return {
      success: false,
      error: "Você não tem permissão para iniciar esta linha",
    };
  }

  line.execution = {
    isActive: true,
    startedBy: driverId,
    date,
    processedPointIds: [],
    skippedPointIds: [],
    checkIns: [],
  };

  return {
    success: true,
    execution: line.execution,
  };
}

function getNextPointWithConfirmedPassengers(line, currentPointIndex) {
  for (let i = currentPointIndex + 1; i < line.points.length; i += 1) {
    const point = line.points[i];
    if (
      Array.isArray(point.confirmedPassengerIds) &&
      point.confirmedPassengerIds.length > 0
    ) {
      return point;
    }
  }

  return null;
}

async function processGeofenceCheckIn(payload) {
  const { lineId, pointId, driverId, date, location } = payload || {};

  const line = getLine(lineId);
  if (!line) {
    return {
      success: false,
      error: "Linha não encontrada",
    };
  }

  if (!hasDriverPermission(line, driverId)) {
    return {
      success: false,
      error: "Você não tem permissão para operar esta linha",
    };
  }

  if (!line.execution.isActive || line.execution.date !== date) {
    return {
      success: false,
      error: "A linha ativa é obrigatória para processar check-in",
    };
  }

  const pointIndex = line.points.findIndex((point) => point.id === pointId);
  if (pointIndex === -1) {
    return {
      success: false,
      error: "Erro de ponto: ponto não encontrado na linha",
    };
  }

  const point = line.points[pointIndex];

  if (
    !location ||
    typeof location.latitude !== "number" ||
    typeof location.longitude !== "number"
  ) {
    return {
      success: false,
      error: "Erro de localização indisponível",
    };
  }

  if (line.execution.processedPointIds.includes(pointId)) {
    return {
      success: false,
      error: "Notificação duplicada para o mesmo ponto",
    };
  }

  const currentDistance = distanceMeters(location, {
    latitude: point.latitude,
    longitude: point.longitude,
  });

  if (currentDistance > point.radiusMeters) {
    return {
      success: false,
      error: "Motorista fora do raio do ponto",
    };
  }

  const checkIn = {
    lineId,
    pointId,
    timestamp: new Date().toISOString(),
    location,
  };

  line.execution.processedPointIds.push(pointId);
  line.execution.checkIns.push(checkIn);

  line.execution.skippedPointIds = line.points
    .filter((candidate) => (candidate.confirmedPassengerIds || []).length === 0)
    .map((candidate) => candidate.id);

  const nextPoint = getNextPointWithConfirmedPassengers(line, pointIndex);

  const notification = nextPoint
    ? {
        lineId,
        currentPointId: pointId,
        nextPointId: nextPoint.id,
        segment: nextPoint.segment,
        passengerIds: [...(nextPoint.confirmedPassengerIds || [])],
      }
    : null;

  if (notification) {
    notifyNextPoint(lineId, notification);
  }

  return {
    success: true,
    checkIn,
    notification,
  };
}

async function getLineExecutionState(lineId, driverId, date) {
  const line = getLine(lineId);

  if (!line) {
    return {
      success: false,
      error: "Linha não encontrada",
    };
  }

  if (!hasDriverPermission(line, driverId)) {
    return {
      success: false,
      error: "Você não tem permissão para visualizar esta execução",
    };
  }

  if (line.execution.date !== date) {
    return {
      success: false,
      error: "Data de execução inválida",
    };
  }

  return {
    success: true,
    execution: {
      ...line.execution,
      processedPointIds: [...line.execution.processedPointIds],
      skippedPointIds: [...line.execution.skippedPointIds],
      checkIns: [...line.execution.checkIns],
    },
  };
}

function subscribeToNextPointNotifications(lineId, callback) {
  if (!privateSubscriberMap[lineId]) {
    privateSubscriberMap[lineId] = new Set();
  }

  privateSubscriberMap[lineId].add(callback);

  return () => {
    privateSubscriberMap[lineId].delete(callback);
  };
}

async function clearGeofencingDatabase() {
  lineStore = [];
  privateSubscriberMap = {};
}

module.exports = {
  createGeofenceLine,
  startLineExecution,
  processGeofenceCheckIn,
  getLineExecutionState,
  subscribeToNextPointNotifications,
  clearGeofencingDatabase,
};
