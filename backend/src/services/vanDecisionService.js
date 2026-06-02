/**
 * RF9: Painel de Decisão — Uma ou Duas Vans
 */

const { query, shouldUseDatabase } = require("../config/database");

const VALID_DECISIONS = ["single_van", "double_van_fleet", "double_van_app"];

let mockDecisions = {};

function isValidDate(date) {
  if (typeof date !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return !Number.isNaN(new Date(`${date}T00:00:00`).getTime());
}

function mockKey(lineId, date) {
  return `${lineId}::${date}`;
}

async function registerVanDecision({ lineId, driverId, date, decision, vehicleId = null, notes = null }) {
  if (!lineId) return { success: false, error: "lineId é obrigatório" };
  if (!isValidDate(date)) return { success: false, error: "Data inválida" };
  if (!VALID_DECISIONS.includes(decision)) {
    return { success: false, error: `Decisão inválida. Use: ${VALID_DECISIONS.join(", ")}` };
  }

  if (shouldUseDatabase()) {
    const id = `decision_${Date.now()}`;
    await query(
      `INSERT INTO daily_van_decisions (id, line_id, driver_id, date, decision, vehicle_id, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (line_id, date) DO UPDATE
         SET decision = $5, vehicle_id = $6, notes = $7, driver_id = $3, updated_at = NOW()`,
      [id, lineId, driverId, date, decision, vehicleId, notes],
    );
    return {
      success: true,
      decision: { lineId, driverId, date, decision, vehicleId, notes },
    };
  }

  const key = mockKey(lineId, date);
  mockDecisions[key] = { lineId, driverId, date, decision, vehicleId, notes };
  return { success: true, decision: mockDecisions[key] };
}

async function getVanDecision(lineId, date) {
  if (!lineId || !isValidDate(date)) {
    return { success: false, error: "Parâmetros inválidos" };
  }

  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT line_id, driver_id, date, decision, vehicle_id, notes
       FROM daily_van_decisions WHERE line_id = $1 AND date = $2`,
      [lineId, date],
    );
    if (!res.rows[0]) return { success: true, decision: null };
    const r = res.rows[0];
    return {
      success: true,
      decision: {
        lineId: r.line_id,
        driverId: r.driver_id,
        date: r.date,
        decision: r.decision,
        vehicleId: r.vehicle_id,
        notes: r.notes,
      },
    };
  }

  const key = mockKey(lineId, date);
  return { success: true, decision: mockDecisions[key] ?? null };
}

async function clearDecisionDatabase() {
  mockDecisions = {};
}

module.exports = { registerVanDecision, getVanDecision, clearDecisionDatabase };
