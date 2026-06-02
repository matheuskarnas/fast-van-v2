/**
 * RF14: Avaliação de Viagens
 */

const { query, shouldUseDatabase } = require("../config/database");

const CRITERIA = ["punctuality", "driving", "friendliness", "comfort", "vehicleQuality", "hygiene"];
const DB_COLS = { vehicleQuality: "vehicle_quality" };

let mockRatings = [];

function isValidMonth(m) {
  return typeof m === "string" && /^\d{4}-\d{2}$/.test(m);
}

function isValidScore(v) {
  return Number.isInteger(v) && v >= 1 && v <= 5;
}

function validateRating(data) {
  if (!isValidMonth(data.month)) return "Competência inválida (use YYYY-MM)";
  for (const c of CRITERIA) {
    if (!isValidScore(data[c])) return `Nota inválida para ${c} — use valores de 1 a 5`;
  }
  return null;
}

function toDbRow(data) {
  return {
    punctuality: data.punctuality,
    driving: data.driving,
    friendliness: data.friendliness,
    comfort: data.comfort,
    vehicle_quality: data.vehicleQuality,
    hygiene: data.hygiene,
  };
}

function fromDbRow(r) {
  return {
    lineId: r.line_id,
    passengerId: r.passenger_id,
    driverId: r.driver_id,
    vehicleId: r.vehicle_id,
    month: r.month,
    punctuality: r.punctuality,
    driving: r.driving,
    friendliness: r.friendliness,
    comfort: r.comfort,
    vehicleQuality: r.vehicle_quality,
    hygiene: r.hygiene,
    comment: r.comment,
  };
}

async function submitRating({ lineId, passengerId, driverId, vehicleId = null, month, punctuality, driving, friendliness, comfort, vehicleQuality, hygiene, comment = null }) {
  const err = validateRating({ month, punctuality, driving, friendliness, comfort, vehicleQuality, hygiene });
  if (err) return { success: false, error: err };

  if (shouldUseDatabase()) {
    // Verifica vínculo
    const enrolled = await query(`SELECT id FROM line_enrollments WHERE line_id=$1 AND passenger_id=$2`, [lineId, passengerId]);
    if (!enrolled.rows[0]) return { success: false, error: "Você não está matriculado nesta linha" };

    // Verifica duplicata
    const dup = await query(`SELECT id FROM ratings WHERE line_id=$1 AND passenger_id=$2 AND month=$3`, [lineId, passengerId, month]);
    if (dup.rows[0]) return { success: false, error: "Você já avaliou esta linha neste mês" };

    const id = `rating_${Date.now()}`;
    await query(
      `INSERT INTO ratings (id, line_id, passenger_id, driver_id, vehicle_id, month, punctuality, driving, friendliness, comfort, vehicle_quality, hygiene, comment)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, lineId, passengerId, driverId, vehicleId, month, punctuality, driving, friendliness, comfort, vehicleQuality, hygiene, comment],
    );
    return { success: true, rating: { lineId, passengerId, driverId, vehicleId, month, punctuality, driving, friendliness, comfort, vehicleQuality, hygiene, comment } };
  }

  // Mock
  const dup = mockRatings.find((r) => r.lineId === lineId && r.passengerId === passengerId && r.month === month);
  if (dup) return { success: false, error: "Você já avaliou esta linha neste mês" };
  const rating = { lineId, passengerId, driverId, vehicleId, month, punctuality, driving, friendliness, comfort, vehicleQuality, hygiene, comment };
  mockRatings.push(rating);
  return { success: true, rating };
}

async function getDriverRatings(driverId) {
  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT COUNT(*) as total,
              AVG(punctuality) as punctuality, AVG(driving) as driving, AVG(friendliness) as friendliness,
              AVG(comfort) as comfort, AVG(vehicle_quality) as vehicle_quality, AVG(hygiene) as hygiene
       FROM ratings WHERE driver_id=$1`,
      [driverId],
    );
    const r = res.rows[0];
    const round = (v) => v ? Math.round(parseFloat(v) * 10) / 10 : 0;
    return {
      success: true,
      totalRatings: parseInt(r.total),
      averages: { punctuality: round(r.punctuality), driving: round(r.driving), friendliness: round(r.friendliness), comfort: round(r.comfort), vehicleQuality: round(r.vehicle_quality), hygiene: round(r.hygiene) },
    };
  }

  const list = mockRatings.filter((r) => r.driverId === driverId);
  if (!list.length) return { success: true, totalRatings: 0, averages: { punctuality: 0, driving: 0, friendliness: 0, comfort: 0, vehicleQuality: 0, hygiene: 0 } };
  const avg = (key) => Math.round((list.reduce((s, r) => s + r[key], 0) / list.length) * 10) / 10;
  return {
    success: true,
    totalRatings: list.length,
    averages: { punctuality: avg("punctuality"), driving: avg("driving"), friendliness: avg("friendliness"), comfort: avg("comfort"), vehicleQuality: avg("vehicleQuality"), hygiene: avg("hygiene") },
  };
}

async function getMyRating(passengerId, lineId, month) {
  if (!isValidMonth(month)) return { success: false, error: "Competência inválida" };

  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT * FROM ratings WHERE passenger_id=$1 AND line_id=$2 AND month=$3`,
      [passengerId, lineId, month],
    );
    return { success: true, rating: res.rows[0] ? fromDbRow(res.rows[0]) : null };
  }

  const r = mockRatings.find((r) => r.passengerId === passengerId && r.lineId === lineId && r.month === month);
  return { success: true, rating: r ?? null };
}

async function clearRatingsDatabase() {
  mockRatings = [];
}

module.exports = { submitRating, getDriverRatings, getMyRating, clearRatingsDatabase };
