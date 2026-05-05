/**
 * Serviço de Confirmação de Presença (RF3)
 * Controla presença por data para passageiros vinculados às linhas.
 */

const DEFAULT_STATUS = "vai e volta";
const ALLOWED_STATUSES = [
  DEFAULT_STATUS,
  "não vai e nem volta",
  "só vou e não volto",
  "não vou mas volto",
];

let mockPresenceDb = {
  lines: [],
  attendanceByDate: {},
};

const presenceSubscribers = new Set();

function isValidDateString(date) {
  if (typeof date !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

function getAttendanceKey(lineId, passengerId, date) {
  return `${lineId}::${passengerId}::${date}`;
}

function getLine(lineId) {
  return mockPresenceDb.lines.find((line) => line.id === lineId) || null;
}

function notifyPresenceSubscribers(event) {
  presenceSubscribers.forEach((subscriber) => {
    subscriber(event);
  });
}

function subscribeToPresenceChanges(callback) {
  presenceSubscribers.add(callback);
  return () => {
    presenceSubscribers.delete(callback);
  };
}

function getAuthorizedDriverIds(line) {
  if (
    Array.isArray(line.authorizedDriverIds) &&
    line.authorizedDriverIds.length > 0
  ) {
    return line.authorizedDriverIds;
  }

  return [line.ownerDriverId, line.driverId].filter(Boolean);
}

function canDriverAccessLine(line, driverId) {
  return getAuthorizedDriverIds(line).includes(driverId);
}

function getPointSegment(point) {
  if (point.segment === "ida" || point.segment === "volta") {
    return point.segment;
  }

  if (point.type === "dropoff") {
    return "volta";
  }

  return "ida";
}

function getStatusForDate(lineId, passengerId, date) {
  const key = getAttendanceKey(lineId, passengerId, date);
  return mockPresenceDb.attendanceByDate[key] || DEFAULT_STATUS;
}

function isConfirmedInOutbound(status) {
  return status === DEFAULT_STATUS || status === "só vou e não volto";
}

function isConfirmedInReturn(status) {
  return status === DEFAULT_STATUS || status === "não vou mas volto";
}

function isPassengerActiveInLine(line, passengerId) {
  return line.passengerIds.includes(passengerId);
}

async function createPresenceLine(lineData) {
  const {
    lineId,
    driverId,
    ownerDriverId,
    capacity,
    nextDate,
    points = [],
  } = lineData || {};

  const resolvedOwnerDriverId = ownerDriverId || driverId;

  if (!lineId || !resolvedOwnerDriverId) {
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

  const normalizedPoints = points.map((point) => ({
    id: point.id,
    address: point.address || null,
    time: point.time || null,
    type: point.type || "pickup",
    segment: getPointSegment(point),
    passengers: Array.isArray(point.passengers) ? [...point.passengers] : [],
  }));

  const authorizedDriverIds = [resolvedOwnerDriverId, driverId].filter(Boolean);

  mockPresenceDb.lines.push({
    id: lineId,
    ownerDriverId: resolvedOwnerDriverId,
    driverId: driverId || null,
    authorizedDriverIds: [...new Set(authorizedDriverIds)],
    capacity: typeof capacity === "number" ? capacity : null,
    nextDate: nextDate || null,
    points: normalizedPoints,
    passengerIds: [],
    passengerBoardingPointById: {},
  });

  return {
    success: true,
    lineId,
  };
}

async function addPassengerToLine(lineId, passengerId, boardingPointId) {
  const line = getLine(lineId);

  if (!line) {
    return {
      success: false,
      error: "Linha não encontrada",
    };
  }

  if (!passengerId) {
    return {
      success: false,
      error: "Passageiro inválido",
    };
  }

  if (boardingPointId) {
    const point = line.points.find((item) => item.id === boardingPointId);
    if (!point) {
      return {
        success: false,
        error: "Ponto de embarque não encontrado",
      };
    }

    if (!point.passengers.includes(passengerId)) {
      point.passengers.push(passengerId);
    }

    line.passengerBoardingPointById[passengerId] = boardingPointId;
  }

  if (!line.passengerIds.includes(passengerId)) {
    line.passengerIds.push(passengerId);
  }

  return {
    success: true,
  };
}

async function linkPassengerToPoint(lineId, passengerId, pointId) {
  const line = getLine(lineId);
  if (!line) {
    return {
      success: false,
      error: "Linha não encontrada",
    };
  }

  if (!isPassengerActiveInLine(line, passengerId)) {
    return {
      success: false,
      error: "Passageiro não vinculado à linha",
    };
  }

  const point = line.points.find((item) => item.id === pointId);
  if (!point) {
    return {
      success: false,
      error: "Ponto não encontrado",
    };
  }

  if (!point.passengers.includes(passengerId)) {
    point.passengers.push(passengerId);
  }

  return {
    success: true,
  };
}

async function removePassengerFromLine(lineId, passengerId, driverId) {
  const line = getLine(lineId);

  if (!line) {
    return {
      success: false,
      error: "Linha não encontrada",
    };
  }

  if (line.driverId !== driverId) {
    return {
      success: false,
      error: "Você não tem permissão para remover passageiros desta linha",
    };
  }

  line.passengerIds = line.passengerIds.filter((id) => id !== passengerId);
  delete line.passengerBoardingPointById[passengerId];

  line.points = line.points.map((point) => ({
    ...point,
    passengers: point.passengers.filter((id) => id !== passengerId),
  }));

  return {
    success: true,
  };
}

async function markPassengerPresence(
  lineId,
  passengerId,
  date,
  status,
  options = {},
) {
  const line = getLine(lineId);

  if (!options.isAuthenticated && options.isAuthenticated !== undefined) {
    return {
      success: false,
      error: "Usuário não autenticado",
    };
  }

  if (!line || !isPassengerActiveInLine(line, passengerId)) {
    return {
      success: false,
      error: "Você não tem permissão para registrar presença nesta linha",
    };
  }

  if (!isValidDateString(date)) {
    return {
      success: false,
      error: "Data de presença inválida",
    };
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    return {
      success: false,
      error: "Status de presença inválido",
    };
  }

  const boardingPointId = line.passengerBoardingPointById[passengerId];
  const boardingPoint = line.points.find(
    (point) => point.id === boardingPointId,
  );

  if (boardingPoint?.time) {
    const deadline = new Date(`${date}T${boardingPoint.time}:00`);
    const now = options.currentDateTime
      ? new Date(options.currentDateTime)
      : new Date();

    if (!Number.isNaN(deadline.getTime()) && now > deadline) {
      return {
        success: false,
        error: "Prazo para alteração de presença encerrado",
      };
    }
  }

  const key = getAttendanceKey(lineId, passengerId, date);
  mockPresenceDb.attendanceByDate[key] = status;

  notifyPresenceSubscribers({
    type: "presence-updated",
    lineId,
    passengerId,
    date,
    status,
  });

  return {
    success: true,
    status,
  };
}

async function getPassengerPresenceStatus(lineId, passengerId, date) {
  const line = getLine(lineId);

  if (!line || !isPassengerActiveInLine(line, passengerId)) {
    return {
      success: false,
      error: "Passageiro não vinculado à linha",
    };
  }

  if (!isValidDateString(date)) {
    return {
      success: false,
      error: "Data de presença inválida",
    };
  }

  const status = getStatusForDate(lineId, passengerId, date);

  return {
    success: true,
    status,
    outboundConfirmed: isConfirmedInOutbound(status),
    returnConfirmed: isConfirmedInReturn(status),
  };
}

async function listPassengerLinesByDate(passengerId, date) {
  if (!passengerId) {
    return {
      success: false,
      error: "Passageiro inválido",
    };
  }

  if (!isValidDateString(date)) {
    return {
      success: false,
      error: "Data de presença inválida",
    };
  }

  const lines = mockPresenceDb.lines
    .filter((line) => isPassengerActiveInLine(line, passengerId))
    .map((line) => ({
      lineId: line.id,
      nextDate: line.nextDate,
      status: getStatusForDate(line.id, passengerId, date),
    }));

  return {
    success: true,
    lines,
  };
}

async function listDriverOperationalLines(driverId) {
  if (!driverId) {
    return {
      success: false,
      error: "Motorista inválido",
    };
  }

  const lines = mockPresenceDb.lines
    .filter((line) => canDriverAccessLine(line, driverId))
    .map((line) => ({
      lineId: line.id,
      nextDate: line.nextDate,
      capacity: line.capacity,
      ownerDriverId: line.ownerDriverId,
      driverId: line.driverId,
    }));

  return {
    success: true,
    lines,
  };
}

async function getConfirmedPassengersBySegment(lineId, date, driverId) {
  const line = getLine(lineId);

  if (!line) {
    return {
      success: false,
      error: "Linha não encontrada",
    };
  }

  if (!canDriverAccessLine(line, driverId)) {
    return {
      success: false,
      error: "Você não tem permissão para visualizar esta linha",
    };
  }

  if (!isValidDateString(date)) {
    return {
      success: false,
      error: "Data de presença inválida",
    };
  }

  const outbound = [];
  const returnTrip = [];

  line.passengerIds.forEach((passengerId) => {
    const status = getStatusForDate(lineId, passengerId, date);

    if (isConfirmedInOutbound(status)) {
      outbound.push(passengerId);
    }

    if (isConfirmedInReturn(status)) {
      returnTrip.push(passengerId);
    }
  });

  return {
    success: true,
    confirmed: {
      outbound,
      return: returnTrip,
    },
  };
}

async function buildDailyRoute(lineId, date) {
  const line = getLine(lineId);

  if (!line) {
    return {
      success: false,
      error: "Linha não encontrada",
    };
  }

  if (!isValidDateString(date)) {
    return {
      success: false,
      error: "Data de presença inválida",
    };
  }

  const dailyPoints = [];

  line.points.forEach((point) => {
    const segment = getPointSegment(point);

    const confirmedPassengerIds = point.passengers.filter((passengerId) => {
      if (!line.passengerIds.includes(passengerId)) {
        return false;
      }

      const status = getStatusForDate(lineId, passengerId, date);
      return segment === "ida"
        ? isConfirmedInOutbound(status)
        : isConfirmedInReturn(status);
    });

    if (confirmedPassengerIds.length > 0) {
      dailyPoints.push({
        ...point,
        segment,
        confirmedPassengerIds,
      });
    }
  });

  return {
    success: true,
    points: dailyPoints,
  };
}

async function clearPresenceDatabase() {
  mockPresenceDb = {
    lines: [],
    attendanceByDate: {},
  };

  presenceSubscribers.clear();
}

async function getPresenceLineById(lineId) {
  const line = getLine(lineId);

  if (!line) {
    return {
      success: false,
      error: "Linha não encontrada",
    };
  }

  return {
    success: true,
    line,
  };
}

function getPresenceStatusForDate(lineId, passengerId, date) {
  return getStatusForDate(lineId, passengerId, date);
}

module.exports = {
  DEFAULT_STATUS,
  ALLOWED_STATUSES,
  createPresenceLine,
  addPassengerToLine,
  linkPassengerToPoint,
  removePassengerFromLine,
  markPassengerPresence,
  getPassengerPresenceStatus,
  listPassengerLinesByDate,
  listDriverOperationalLines,
  getConfirmedPassengersBySegment,
  buildDailyRoute,
  getPresenceLineById,
  getPresenceStatusForDate,
  subscribeToPresenceChanges,
  clearPresenceDatabase,
};
