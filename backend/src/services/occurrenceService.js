/**
 * RF23: Registro de Ocorrências
 */

const { query, shouldUseDatabase } = require("../config/database");

const VALID_TYPES = ["slow_traffic", "passenger_late", "passenger_no_show", "other"];

let mockOccurrences = [];

async function registerOccurrence({ lineId, driverId, passengerId = null, type, notes = null, latitude = null, longitude = null }) {
  if (!lineId) return { success: false, error: "lineId é obrigatório" };
  if (!driverId) return { success: false, error: "driverId é obrigatório" };
  if (!VALID_TYPES.includes(type)) {
    return { success: false, error: `Tipo inválido. Use: ${VALID_TYPES.join(", ")}` };
  }

  const id = `occ_${Date.now()}`;
  const occurredAt = new Date().toISOString();

  if (shouldUseDatabase()) {
    await query(
      `INSERT INTO occurrences (id, line_id, driver_id, passenger_id, type, notes, latitude, longitude, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [id, lineId, driverId, passengerId, type, notes, latitude, longitude],
    );
  } else {
    mockOccurrences.push({ id, lineId, driverId, passengerId, type, notes, latitude, longitude, occurredAt });
  }

  return {
    success: true,
    occurrence: { id, lineId, driverId, passengerId, type, notes, latitude, longitude, occurredAt },
  };
}

async function listOccurrences(lineId, date) {
  if (!lineId) return { success: false, error: "lineId é obrigatório" };

  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT id, line_id, driver_id, passenger_id, type, notes, latitude, longitude, occurred_at
       FROM occurrences
       WHERE line_id = $1 AND DATE(occurred_at) = $2
       ORDER BY occurred_at ASC`,
      [lineId, date],
    );
    return {
      success: true,
      occurrences: res.rows.map((r) => ({
        id: r.id,
        lineId: r.line_id,
        driverId: r.driver_id,
        passengerId: r.passenger_id,
        type: r.type,
        notes: r.notes,
        latitude: r.latitude,
        longitude: r.longitude,
        occurredAt: r.occurred_at,
      })),
    };
  }

  const occurrences = mockOccurrences.filter(
    (o) => o.lineId === lineId && o.occurredAt.slice(0, 10) === date,
  );
  return { success: true, occurrences };
}

async function clearOccurrenceDatabase() {
  mockOccurrences = [];
}

module.exports = { registerOccurrence, listOccurrences, clearOccurrenceDatabase };
