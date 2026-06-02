/**
 * Serviço de Confirmação de Presença (RF3)
 * Controla presença por data para passageiros vinculados às linhas.
 */

const { query, shouldUseDatabase } = require("../config/database");

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
  if (!passengerId) return { success: false, error: "Passageiro inválido" };

  if (shouldUseDatabase()) {
    const lineCheck = await query(`SELECT id FROM lines WHERE id = $1`, [lineId]);
    if (!lineCheck.rows[0]) return { success: false, error: "Linha não encontrada" };
    await query(
      `INSERT INTO line_enrollments (id, line_id, passenger_id)
       VALUES ($1, $2, $3) ON CONFLICT (line_id, passenger_id) DO NOTHING`,
      [`enroll_${Date.now()}`, lineId, passengerId],
    );
    return { success: true };
  }

  const line = getLine(lineId);
  if (!line) return { success: false, error: "Linha não encontrada" };

  if (boardingPointId) {
    const point = line.points.find((item) => item.id === boardingPointId);
    if (!point) return { success: false, error: "Ponto de embarque não encontrado" };
    if (!point.passengers.includes(passengerId)) point.passengers.push(passengerId);
    line.passengerBoardingPointById[passengerId] = boardingPointId;
  }

  if (!line.passengerIds.includes(passengerId)) line.passengerIds.push(passengerId);
  return { success: true };
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
  if (!options.isAuthenticated && options.isAuthenticated !== undefined) {
    return { success: false, error: "Usuário não autenticado" };
  }

  if (shouldUseDatabase()) {
    const enrolled = await query(
      `SELECT id FROM line_enrollments WHERE line_id = $1 AND passenger_id = $2`,
      [lineId, passengerId],
    );
    if (!enrolled.rows[0]) return { success: false, error: "Você não tem permissão para registrar presença nesta linha" };
  } else {
    const line = getLine(lineId);
    if (!line || !isPassengerActiveInLine(line, passengerId)) {
      return { success: false, error: "Você não tem permissão para registrar presença nesta linha" };
    }
  }

  const line = shouldUseDatabase() ? null : getLine(lineId);

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

  const boardingPoint = line ? (() => {
    const boardingPointId = line.passengerBoardingPointById[passengerId];
    return line.points.find((point) => point.id === boardingPointId);
  })() : null;

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

  // RF8: ao reverter ausência de ida para "vai e volta", verifica vaga no slot
  if (status === "vai e volta" || status === "só vou e não volto") {
    const previousStatus = shouldUseDatabase()
      ? null
      : getStatusForDate(lineId, passengerId, date);

    const wasAbsentOnOutbound =
      previousStatus === "não vai e nem volta" ||
      previousStatus === "não vou mas volto";

    if (!shouldUseDatabase() && wasAbsentOnOutbound) {
      const capacity = line?.capacity;
      if (typeof capacity === "number" && capacity > 0) {
        const confirmedOutbound = line.passengerIds.filter((pid) => {
          if (pid === passengerId) return false;
          const s = getStatusForDate(lineId, pid, date);
          return isConfirmedInOutbound(s);
        }).length;

        if (confirmedOutbound >= capacity) {
          return { success: false, error: "Não há vagas disponíveis no seu horário" };
        }
      }
    }

    if (shouldUseDatabase()) {
      const lineRes = await query(
        `SELECT l.capacity, e.departure_time
         FROM lines l
         JOIN line_enrollments e ON e.line_id = l.id AND e.passenger_id = $2
         WHERE l.id = $1`,
        [lineId, passengerId],
      );
      if (lineRes.rows[0]) {
        const { capacity, departure_time } = lineRes.rows[0];
        if (typeof capacity === "number" && capacity > 0) {
          const slotCount = await query(
            `SELECT COUNT(*)::int AS confirmed
             FROM line_enrollments e
             LEFT JOIN presence_records pr ON pr.line_id = e.line_id
               AND pr.passenger_id = e.passenger_id AND pr.date = $3
             WHERE e.line_id = $1
               AND COALESCE(pr.alternate_departure_time, e.departure_time) = $2
               AND e.passenger_id != $4
               AND COALESCE(pr.status, 'vai e volta') IN ('vai e volta', 'só vou e não volto')`,
            [lineId, departure_time, date, passengerId],
          );
          if (slotCount.rows[0].confirmed >= capacity) {
            return { success: false, error: "Não há vagas disponíveis no seu horário" };
          }
        }
      }
    }
  }

  if (shouldUseDatabase()) {
    await query(
      `INSERT INTO presence_records (id, line_id, passenger_id, date, status, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (line_id, passenger_id, date) DO UPDATE SET status = $5, updated_at = NOW()`,
      [`pr_${Date.now()}`, lineId, passengerId, date, status],
    );
  } else {
    const key = getAttendanceKey(lineId, passengerId, date);
    mockPresenceDb.attendanceByDate[key] = status;
  }

  notifyPresenceSubscribers({ type: "presence-updated", lineId, passengerId, date, status });
  return { success: true, status };
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

  if (shouldUseDatabase()) {
    const enrolled = await query(
      `SELECT e.line_id, e.departure_time, e.arrival_time,
              l.name, l.origin_city, l.destination_place,
              COALESCE(p.status, $3) as status,
              p.alternate_departure_time, p.alternate_arrival_time, p.slot_status
       FROM line_enrollments e
       JOIN lines l ON l.id = e.line_id
       LEFT JOIN presence_records p ON p.line_id = e.line_id AND p.passenger_id = e.passenger_id AND p.date = $2
       WHERE e.passenger_id = $1`,
      [passengerId, date, DEFAULT_STATUS],
    );
    return {
      success: true,
      lines: enrolled.rows.map((r) => ({
        lineId: r.line_id,
        name: r.name,
        originCity: r.origin_city,
        destinationPlace: r.destination_place,
        nextDate: date,
        status: r.status,
        departureTime: r.departure_time,
        arrivalTime: r.arrival_time,
        alternateDepartureTime: r.alternate_departure_time,
        alternateArrivalTime: r.alternate_arrival_time,
        slotStatus: r.slot_status || "confirmed",
      })),
    };
  }

  const lines = mockPresenceDb.lines
    .filter((line) => isPassengerActiveInLine(line, passengerId))
    .map((line) => ({
      lineId: line.id,
      nextDate: line.nextDate,
      status: getStatusForDate(line.id, passengerId, date),
    }));

  return { success: true, lines };
}

async function listDriverOperationalLines(driverId) {
  if (!driverId) {
    return {
      success: false,
      error: "Motorista inválido",
    };
  }

  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT id, name, origin_city, destination_place, capacity, owner_driver_id, driver_id
       FROM lines WHERE owner_driver_id = $1 OR driver_id = $1`,
      [driverId],
    );
    return {
      success: true,
      lines: res.rows.map((r) => ({
        lineId: r.id,
        name: r.name,
        originCity: r.origin_city,
        destinationPlace: r.destination_place,
        capacity: r.capacity,
        ownerDriverId: r.owner_driver_id,
        driverId: r.driver_id,
        nextDate: new Date().toISOString().slice(0, 10),
      })),
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

  return { success: true, lines };
}

async function getConfirmedPassengersBySegment(lineId, date, driverId) {
  if (!isValidDateString(date)) {
    return { success: false, error: "Data de presença inválida" };
  }

  if (shouldUseDatabase()) {
    const enrolled = await query(
      `SELECT e.passenger_id, COALESCE(p.status, $3) as status
       FROM line_enrollments e
       LEFT JOIN presence_records p ON p.line_id = e.line_id AND p.passenger_id = e.passenger_id AND p.date = $2
       WHERE e.line_id = $1`,
      [lineId, date, DEFAULT_STATUS],
    );
    const outbound = enrolled.rows.filter((r) => isConfirmedInOutbound(r.status)).map((r) => r.passenger_id);
    const returnTrip = enrolled.rows.filter((r) => isConfirmedInReturn(r.status)).map((r) => r.passenger_id);
    return { success: true, confirmed: { outbound, return: returnTrip } };
  }

  const line = getLine(lineId);
  if (!line) return { success: false, error: "Linha não encontrada" };
  if (!canDriverAccessLine(line, driverId)) return { success: false, error: "Você não tem permissão para visualizar esta linha" };

  const outbound = [];
  const returnTrip = [];
  line.passengerIds.forEach((passengerId) => {
    const status = getStatusForDate(lineId, passengerId, date);
    if (isConfirmedInOutbound(status)) outbound.push(passengerId);
    if (isConfirmedInReturn(status)) returnTrip.push(passengerId);
  });

  return { success: true, confirmed: { outbound, return: returnTrip } };
}

async function buildDailyRoute(lineId, date) {
  if (!isValidDateString(date)) {
    return { success: false, error: "Data de presença inválida" };
  }

  if (shouldUseDatabase()) {
    // Retorna pontos que têm ao menos 1 passageiro confirmado no trecho
    const res = await query(
      `SELECT lp.id, lp.address, lp.type, lp.segment
       FROM line_points lp
       WHERE lp.line_id = $1
         AND EXISTS (
           SELECT 1 FROM line_enrollments e
           LEFT JOIN presence_records pr
             ON pr.line_id = e.line_id AND pr.passenger_id = e.passenger_id AND pr.date = $2
           WHERE e.line_id = $1
             AND COALESCE(pr.status, $3) NOT IN ('não vai e nem volta',
               CASE WHEN lp.segment = 'ida' THEN 'não vou mas volto' ELSE 'só vou e não volto' END)
         )`,
      [lineId, date, DEFAULT_STATUS],
    );
    return { success: true, points: res.rows };
  }

  const line = getLine(lineId);
  if (!line) return { success: false, error: "Linha não encontrada" };

  const dailyPoints = [];
  line.points.forEach((point) => {
    const segment = getPointSegment(point);
    const confirmedPassengerIds = point.passengers.filter((passengerId) => {
      if (!line.passengerIds.includes(passengerId)) return false;
      const status = getStatusForDate(lineId, passengerId, date);
      return segment === "ida" ? isConfirmedInOutbound(status) : isConfirmedInReturn(status);
    });
    if (confirmedPassengerIds.length > 0) {
      dailyPoints.push({ ...point, segment, confirmedPassengerIds });
    }
  });

  return { success: true, points: dailyPoints };
}

async function clearPresenceDatabase() {
  mockPresenceDb = {
    lines: [],
    attendanceByDate: {},
  };

  presenceSubscribers.clear();
}

async function getPresenceLineById(lineId) {
  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT id, capacity, owner_driver_id, driver_id FROM lines WHERE id = $1`,
      [lineId],
    );
    if (!res.rows[0]) return { success: false, error: "Linha não encontrada" };
    const r = res.rows[0];
    return {
      success: true,
      line: {
        lineId: r.id,
        capacity: r.capacity,
        ownerDriverId: r.owner_driver_id,
        driverId: r.driver_id,
        nextDate: new Date().toISOString().slice(0, 10),
      },
    };
  }

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
