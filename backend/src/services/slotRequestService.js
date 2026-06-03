/**
 * RF6: Exceção de Horário + Fila de Espera
 */

const { query, shouldUseDatabase } = require("../config/database");
const {
  getEnrollmentSlot,
  countMockSlotEnrollments,
  DEFAULT_STATUS,
} = require("./presenceService");

// Mock store
let mockWaitlist = []; // { lineId, passengerId, date, requestedDepartureTime, requestedArrivalTime, createdAt }
let mockSlotRequests = {}; // key: `${lineId}::${passengerId}::${date}` → { alternateDepartureTime, alternateArrivalTime, slotStatus }

function isValidDate(d) {
  return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(`${d}T00:00:00`).getTime());
}

// Conta confirmados de um slot no dia (mock)
function countSlotConfirmedMock(lineId, date, departureTime, excludePassengerId) {
  // Conta passageiros cujo slot efetivo = departureTime
  // Por simplicidade no mock, usa apenas enrollmentSlots (sem alternate)
  const { mockPresenceDb: _ } = require("./presenceService");
  // Não temos acesso direto ao mockPresenceDb, então contamos via getEnrollmentSlot
  // Esta função é chamada apenas no mock, onde o presenceService expõe getEnrollmentSlot
  // Retornamos 0 como fallback se não conseguimos — o teste terá que ser ajustado
  return 0;
}

async function getEnrolledSlot(lineId, passengerId) {
  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT departure_time, arrival_time FROM line_enrollments WHERE line_id=$1 AND passenger_id=$2`,
      [lineId, passengerId],
    );
    if (!res.rows[0]) return null;
    return { departureTime: res.rows[0].departure_time, arrivalTime: res.rows[0].arrival_time };
  }
  return getEnrollmentSlot(lineId, passengerId);
}

async function countSlotConfirmed(lineId, date, departureTime, excludePassengerId) {
  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT COUNT(*)::int AS confirmed
       FROM line_enrollments e
       LEFT JOIN presence_records pr ON pr.line_id = e.line_id AND pr.passenger_id = e.passenger_id AND pr.date = $3
       WHERE e.line_id = $1
         AND COALESCE(pr.alternate_departure_time, e.departure_time) = $2
         AND e.passenger_id != $4
         AND COALESCE(pr.status, 'vai e volta') IN ('vai e volta', 'só vou e não volto')
         AND COALESCE(pr.slot_status, 'confirmed') IN ('confirmed', 'switched')`,
      [lineId, departureTime, date, excludePassengerId],
    );
    return res.rows[0]?.confirmed ?? 0;
  }
  // Mock: conta via mockEnrollmentSlots excluindo ausentes e o próprio passageiro
  return countMockSlotEnrollments(lineId, departureTime, date, excludePassengerId);
}

async function getLineCapacity(lineId) {
  if (shouldUseDatabase()) {
    const res = await query(`SELECT capacity FROM lines WHERE id=$1`, [lineId]);
    return res.rows[0]?.capacity ?? 0;
  }
  // Mock: acessa mock via presenceService interno
  const presenceService = require("./presenceService");
  // getPresenceLineById retorna capacity no mock
  const lineResult = await presenceService.getPresenceLineById(lineId);
  return lineResult.success ? (lineResult.line?.capacity ?? 99) : 99;
}

async function requestSlotChange({ lineId, passengerId, date, requestedDepartureTime, requestedArrivalTime }) {
  if (!isValidDate(date)) return { success: false, error: "Data inválida (use YYYY-MM-DD)" };
  if (!requestedDepartureTime || !requestedArrivalTime) return { success: false, error: "Horários obrigatórios" };

  // Verifica matrícula e slot atual
  const enrolled = await getEnrolledSlot(lineId, passengerId);
  if (!enrolled && shouldUseDatabase()) return { success: false, error: "Você não está matriculado nesta linha" };

  // Cenário 6.6: mesmo slot
  if (enrolled && enrolled.departureTime === requestedDepartureTime) {
    return { success: false, error: "Você já está neste mesmo slot habitual" };
  }

  // Capacidade do slot solicitado
  const capacity = await getLineCapacity(lineId);
  const confirmed = await countSlotConfirmed(lineId, date, requestedDepartureTime, passengerId);
  const hasVacancy = confirmed < capacity;

  if (shouldUseDatabase()) {
    const recordId = `pr_rf6_${Date.now()}`;
    if (hasVacancy) {
      await query(
        `INSERT INTO presence_records (id, line_id, passenger_id, date, status, alternate_departure_time, alternate_arrival_time, slot_status, updated_at)
         VALUES ($1,$2,$3,$4,'vai e volta',$5,$6,'switched',NOW())
         ON CONFLICT (line_id, passenger_id, date) DO UPDATE
           SET alternate_departure_time=$5, alternate_arrival_time=$6, slot_status='switched', updated_at=NOW()`,
        [recordId, lineId, passengerId, date, requestedDepartureTime, requestedArrivalTime],
      );
      return { success: true, slotStatus: "switched", alternateDepartureTime: requestedDepartureTime, alternateArrivalTime: requestedArrivalTime };
    } else {
      // Fila de espera
      const waitId = `wait_${Date.now()}`;
      await query(
        `INSERT INTO slot_waitlist (id, line_id, passenger_id, date, requested_departure_time, requested_arrival_time)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (line_id, passenger_id, date, requested_departure_time) DO NOTHING`,
        [waitId, lineId, passengerId, date, requestedDepartureTime, requestedArrivalTime],
      );
      await query(
        `INSERT INTO presence_records (id, line_id, passenger_id, date, status, alternate_departure_time, alternate_arrival_time, slot_status, updated_at)
         VALUES ($1,$2,$3,$4,'vai e volta',$5,$6,'waitlist',NOW())
         ON CONFLICT (line_id, passenger_id, date) DO UPDATE
           SET alternate_departure_time=$5, alternate_arrival_time=$6, slot_status='waitlist', updated_at=NOW()`,
        [recordId, lineId, passengerId, date, requestedDepartureTime, requestedArrivalTime],
      );
      return { success: true, slotStatus: "waitlist", alternateDepartureTime: requestedDepartureTime, alternateArrivalTime: requestedArrivalTime };
    }
  }

  // Mock path
  const key = `${lineId}::${passengerId}::${date}`;
  if (hasVacancy) {
    mockSlotRequests[key] = { alternateDepartureTime: requestedDepartureTime, alternateArrivalTime: requestedArrivalTime, slotStatus: "switched" };
    return { success: true, slotStatus: "switched", alternateDepartureTime: requestedDepartureTime, alternateArrivalTime: requestedArrivalTime };
  } else {
    mockSlotRequests[key] = { alternateDepartureTime: requestedDepartureTime, alternateArrivalTime: requestedArrivalTime, slotStatus: "waitlist" };
    mockWaitlist.push({ lineId, passengerId, date, requestedDepartureTime, requestedArrivalTime, createdAt: new Date().toISOString() });
    return { success: true, slotStatus: "waitlist", alternateDepartureTime: requestedDepartureTime, alternateArrivalTime: requestedArrivalTime };
  }
}

async function cancelSlotRequest(lineId, passengerId, date) {
  if (shouldUseDatabase()) {
    await query(
      `UPDATE presence_records SET alternate_departure_time=NULL, alternate_arrival_time=NULL, slot_status='confirmed', updated_at=NOW()
       WHERE line_id=$1 AND passenger_id=$2 AND date=$3`,
      [lineId, passengerId, date],
    );
    await query(
      `DELETE FROM slot_waitlist WHERE line_id=$1 AND passenger_id=$2 AND date=$3`,
      [lineId, passengerId, date],
    );
    return { success: true, slotStatus: "confirmed" };
  }
  const key = `${lineId}::${passengerId}::${date}`;
  delete mockSlotRequests[key];
  mockWaitlist = mockWaitlist.filter((w) => !(w.lineId === lineId && w.passengerId === passengerId && w.date === date));
  return { success: true, slotStatus: "confirmed" };
}

async function promoteFromWaitlist(lineId, date, departureTime) {
  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT passenger_id, requested_arrival_time FROM slot_waitlist
       WHERE line_id=$1 AND date=$2 AND requested_departure_time=$3
       ORDER BY created_at ASC LIMIT 1`,
      [lineId, date, departureTime],
    );
    if (!res.rows[0]) return { success: true, promoted: null };
    const { passenger_id: pid, requested_arrival_time: arrivalTime } = res.rows[0];
    const recordId = `pr_promote_${Date.now()}`;
    await query(
      `INSERT INTO presence_records (id, line_id, passenger_id, date, status, alternate_departure_time, alternate_arrival_time, slot_status, updated_at)
       VALUES ($1,$2,$3,$4,'vai e volta',$5,$6,'switched',NOW())
       ON CONFLICT (line_id, passenger_id, date) DO UPDATE
         SET slot_status='switched', updated_at=NOW()`,
      [recordId, lineId, pid, date, departureTime, arrivalTime],
    );
    await query(`DELETE FROM slot_waitlist WHERE line_id=$1 AND passenger_id=$2 AND date=$3 AND requested_departure_time=$4`, [lineId, pid, date, departureTime]);
    return { success: true, promoted: pid };
  }
  // Mock path
  const waiting = mockWaitlist.filter((w) => w.lineId === lineId && w.date === date && w.requestedDepartureTime === departureTime);
  if (!waiting.length) return { success: true, promoted: null };
  waiting.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const first = waiting[0];
  const key = `${lineId}::${first.passengerId}::${date}`;
  if (mockSlotRequests[key]) mockSlotRequests[key].slotStatus = "switched";
  mockWaitlist = mockWaitlist.filter((w) => !(w.lineId === lineId && w.passengerId === first.passengerId && w.date === date && w.requestedDepartureTime === departureTime));
  return { success: true, promoted: first.passengerId };
}

async function clearSlotRequestDatabase() {
  mockWaitlist = [];
  mockSlotRequests = {};
}

module.exports = { requestSlotChange, cancelSlotRequest, promoteFromWaitlist, clearSlotRequestDatabase };
