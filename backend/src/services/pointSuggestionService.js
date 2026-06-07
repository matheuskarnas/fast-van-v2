/**
 * RF19/20: Sugestão de Pontos pelo Passageiro
 */

const { query, shouldUseDatabase } = require("../config/database");

const VALID_TYPES = ["pickup", "dropoff"];
const VALID_SEGMENTS = ["ida", "volta"];
const VALID_DECISIONS = ["approved", "rejected"];

let mockSuggestions = [];

function nextId() { return `sugg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

async function createSuggestion({ lineId, passengerId, address, type, segment, latitude = null, longitude = null, placeId = null }) {
  if (!address || !address.trim()) return { success: false, error: "Endereço é obrigatório" };
  if (!VALID_TYPES.includes(type)) return { success: false, error: `Tipo inválido. Use: ${VALID_TYPES.join(", ")}` };
  if (!VALID_SEGMENTS.includes(segment)) return { success: false, error: `Segmento inválido. Use: ${VALID_SEGMENTS.join(", ")}` };

  const id = nextId();
  const createdAt = new Date().toISOString();

  if (shouldUseDatabase()) {
    await query(
      `INSERT INTO point_suggestions (id, line_id, passenger_id, address, type, segment, latitude, longitude, place_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')`,
      [id, lineId, passengerId, address.trim(), type, segment, latitude, longitude, placeId],
    );
  } else {
    mockSuggestions.push({ id, lineId, passengerId, address: address.trim(), type, segment, latitude, longitude, placeId, status: "pending", rejectionReason: null, createdAt });
  }

  return { success: true, suggestion: { id, lineId, passengerId, address: address.trim(), type, segment, latitude, longitude, placeId, status: "pending", createdAt } };
}

async function listPendingSuggestions(lineId) {
  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT s.*, u.name as passenger_name FROM point_suggestions s
       LEFT JOIN users u ON u.id = s.passenger_id
       WHERE s.line_id = $1 AND s.status = 'pending' ORDER BY s.created_at DESC`,
      [lineId],
    );
    return { success: true, suggestions: res.rows.map(mapRow) };
  }
  return { success: true, suggestions: mockSuggestions.filter((s) => s.lineId === lineId && s.status === "pending") };
}

async function listMySuggestions(lineId, passengerId) {
  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT * FROM point_suggestions WHERE line_id=$1 AND passenger_id=$2 ORDER BY created_at DESC`,
      [lineId, passengerId],
    );
    return { success: true, suggestions: res.rows.map(mapRow) };
  }
  return { success: true, suggestions: mockSuggestions.filter((s) => s.lineId === lineId && s.passengerId === passengerId) };
}

async function decideSuggestion(suggestionId, driverId, decision, rejectionReason = null) {
  if (!VALID_DECISIONS.includes(decision)) return { success: false, error: `Decisão inválida. Use: ${VALID_DECISIONS.join(", ")}` };

  if (shouldUseDatabase()) {
    const check = await query(`SELECT * FROM point_suggestions WHERE id=$1`, [suggestionId]);
    if (!check.rows[0]) return { success: false, error: "Sugestão não encontrada" };

    await query(
      `UPDATE point_suggestions SET status=$1, rejection_reason=$2, updated_at=NOW() WHERE id=$3`,
      [decision, decision === "rejected" ? rejectionReason : null, suggestionId],
    );

    if (decision === "approved") {
      const s = check.rows[0];
      // Cria o ponto na linha
      const { addPickupDropoffPoint } = require("./lineService");
      await addPickupDropoffPoint(s.line_id, {
        address: s.address, type: s.type, segment: s.segment,
        latitude: s.latitude, longitude: s.longitude, placeId: s.place_id,
        passengerId: s.passenger_id,
      }, driverId);
    }

    const updated = await query(`SELECT * FROM point_suggestions WHERE id=$1`, [suggestionId]);
    return { success: true, suggestion: mapRow(updated.rows[0]) };
  }

  const idx = mockSuggestions.findIndex((s) => s.id === suggestionId);
  if (idx < 0) return { success: false, error: "Sugestão não encontrada" };
  mockSuggestions[idx].status = decision;
  mockSuggestions[idx].rejectionReason = decision === "rejected" ? rejectionReason : null;
  return { success: true, suggestion: { ...mockSuggestions[idx] } };
}

function mapRow(r) {
  return {
    id: r.id,
    lineId: r.line_id,
    passengerId: r.passenger_id,
    passengerName: r.passenger_name,
    address: r.address,
    type: r.type,
    segment: r.segment,
    latitude: r.latitude,
    longitude: r.longitude,
    placeId: r.place_id,
    status: r.status,
    rejectionReason: r.rejection_reason,
    createdAt: r.created_at,
  };
}

async function clearSuggestionDatabase() {
  mockSuggestions = [];
}

module.exports = { createSuggestion, listPendingSuggestions, listMySuggestions, decideSuggestion, clearSuggestionDatabase };
