/**
 * Serviço de Ocupação em Tempo Real (RF4)
 * Calcula lotação por slot de horário (departure_time / arrival_time).
 */

const { query, shouldUseDatabase } = require("../config/database");
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

/**
 * Retorna lotação por slot de horário (DB only).
 * Cada slot tem confirmados de ida e de volta separados.
 */
async function getSlotOccupancy(lineId, date, capacity) {
  // Passageiros confirmados na ida, agrupados pelo slot efetivo de partida
  const idaRes = await query(
    `SELECT
       COALESCE(pr.alternate_departure_time, e.departure_time) AS slot,
       COUNT(*)::int AS confirmed
     FROM line_enrollments e
     LEFT JOIN presence_records pr
       ON pr.line_id = e.line_id AND pr.passenger_id = e.passenger_id AND pr.date = $2
     WHERE e.line_id = $1
       AND COALESCE(pr.status, 'vai e volta') IN ('vai e volta', 'só vou e não volto')
       AND COALESCE(pr.slot_status, 'confirmed') IN ('confirmed', 'switched')
     GROUP BY slot`,
    [lineId, date],
  );

  // Passageiros confirmados na volta, agrupados pelo slot efetivo de chegada
  const voltaRes = await query(
    `SELECT
       COALESCE(pr.alternate_arrival_time, e.arrival_time) AS slot,
       COUNT(*)::int AS confirmed
     FROM line_enrollments e
     LEFT JOIN presence_records pr
       ON pr.line_id = e.line_id AND pr.passenger_id = e.passenger_id AND pr.date = $2
     WHERE e.line_id = $1
       AND COALESCE(pr.status, 'vai e volta') IN ('vai e volta', 'não vou mas volto')
       AND COALESCE(pr.slot_status, 'confirmed') IN ('confirmed', 'switched')
     GROUP BY slot`,
    [lineId, date],
  );

  // Todos os slots distintos cadastrados na linha
  const slotsRes = await query(
    `SELECT DISTINCT departure_time, arrival_time FROM line_enrollments WHERE line_id = $1`,
    [lineId],
  );

  const idaMap = {};
  idaRes.rows.forEach((r) => { if (r.slot) idaMap[r.slot] = r.confirmed; });
  const voltaMap = {};
  voltaRes.rows.forEach((r) => { if (r.slot) voltaMap[r.slot] = r.confirmed; });

  // Coletar slots únicos de ida e volta
  const departureSlots = [...new Set(slotsRes.rows.map((r) => r.departure_time).filter(Boolean))].sort();
  const arrivalSlots = [...new Set(slotsRes.rows.map((r) => r.arrival_time).filter(Boolean))].sort();

  const buildSlot = (slot, countMap) => ({
    slot,
    confirmedCount: countMap[slot] || 0,
    percentage: roundOccupancyPercent(countMap[slot] || 0, capacity),
  });

  return {
    departureSlots: departureSlots.map((s) => buildSlot(s, idaMap)),
    arrivalSlots: arrivalSlots.map((s) => buildSlot(s, voltaMap)),
  };
}

async function getLineOccupancy(lineId, date, driverId) {
  if (!isValidDateString(date)) {
    return { success: false, error: "Data de ocupação inválida" };
  }

  const lineResult = await getPresenceLineById(lineId);
  if (!lineResult.success) return lineResult;

  const line = lineResult.line;

  if (!canViewLine(line, driverId)) {
    return { success: false, error: "Você não tem permissão para visualizar a lotação desta linha" };
  }

  if (line.nextDate && line.nextDate !== date) {
    return { success: false, error: "A consulta de ocupação só é permitida para a próxima data da linha" };
  }

  if (!line.capacity || line.capacity <= 0) {
    return { success: false, error: "Capacidade da linha inválida" };
  }

  const routeResult = await buildDailyRoute(lineId, date);
  if (!routeResult.success) return routeResult;

  // DB: lotação por slot
  if (shouldUseDatabase()) {
    const slots = await getSlotOccupancy(lineId, date, line.capacity);
    return {
      success: true,
      lineId,
      date,
      capacity: line.capacity,
      slots,
      // Mantém outbound/return compatível com alertService (soma todos os slots)
      occupancy: {
        outbound: {
          confirmedCount: slots.departureSlots.reduce((s, x) => s + x.confirmedCount, 0),
          percentage: roundOccupancyPercent(
            slots.departureSlots.reduce((s, x) => s + x.confirmedCount, 0),
            line.capacity,
          ),
          confirmedPassengerIds: [],
        },
        return: {
          confirmedCount: slots.arrivalSlots.reduce((s, x) => s + x.confirmedCount, 0),
          percentage: roundOccupancyPercent(
            slots.arrivalSlots.reduce((s, x) => s + x.confirmedCount, 0),
            line.capacity,
          ),
          confirmedPassengerIds: [],
        },
      },
      routePoints: routeResult.points,
    };
  }

  // Mock: backward compat sem slots
  const confirmedResult = await getConfirmedPassengersBySegment(lineId, date, driverId);
  if (!confirmedResult.success) return confirmedResult;

  const outboundConfirmed = confirmedResult.confirmed.outbound;
  const returnConfirmed = confirmedResult.confirmed.return;

  return {
    success: true,
    lineId,
    date,
    capacity: line.capacity,
    slots: { departureSlots: [], arrivalSlots: [] },
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
    if (event.lineId !== lineId) return;
    if (event.date && event.date !== date) return;
    const occupancyResult = await getLineOccupancy(lineId, date, driverId);
    if (occupancyResult.success) onUpdate(occupancyResult);
  });
  return () => { unsubscribePresence(); };
}

module.exports = {
  getLineOccupancy,
  subscribeToLineOccupancy,
};
