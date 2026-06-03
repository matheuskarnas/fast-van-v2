/**
 * RF10/11: Marketplace B2B — Solicitações Empresariais
 */

const { query, shouldUseDatabase } = require("../config/database");

let mockRequests = [];

function nextId() { return `b2b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

async function createB2bRequest({ companyId, destination, originCity, arrivalTime, departureTime, passengerCount, daysOfWeek, notes = null }) {
  if (!destination?.trim()) return { success: false, error: "Destino é obrigatório" };
  if (!originCity?.trim()) return { success: false, error: "Cidade de origem é obrigatória" };
  if (!arrivalTime || !departureTime) return { success: false, error: "Horários são obrigatórios" };
  if (!passengerCount || passengerCount < 1) return { success: false, error: "Número de passageiros deve ser maior que zero" };

  const id = nextId();
  const createdAt = new Date().toISOString();

  if (shouldUseDatabase()) {
    await query(
      `INSERT INTO b2b_requests (id, company_id, destination, origin_city, arrival_time, departure_time, passenger_count, days_of_week, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open')`,
      [id, companyId, destination.trim(), originCity.trim(), arrivalTime, departureTime, passengerCount, daysOfWeek || "seg,ter,qua,qui,sex", notes],
    );
  } else {
    mockRequests.push({ id, companyId, destination: destination.trim(), originCity: originCity.trim(), arrivalTime, departureTime, passengerCount, daysOfWeek: daysOfWeek || "seg,ter,qua,qui,sex", notes, status: "open", createdAt });
  }

  return { success: true, request: { id, companyId, destination, originCity, arrivalTime, departureTime, passengerCount, daysOfWeek, notes, status: "open", createdAt } };
}

async function listOpenB2bRequests(originCity = null) {
  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT r.*, u.name as company_name
       FROM b2b_requests r
       LEFT JOIN users u ON u.id = r.company_id
       WHERE r.status = 'open' ${originCity ? "AND LOWER(r.origin_city) LIKE LOWER($1)" : ""}
       ORDER BY r.created_at DESC`,
      originCity ? [`%${originCity}%`] : [],
    );
    return { success: true, requests: res.rows.map(mapRow) };
  }
  const filtered = originCity
    ? mockRequests.filter((r) => r.status === "open" && r.originCity.toLowerCase().includes(originCity.toLowerCase()))
    : mockRequests.filter((r) => r.status === "open");
  return { success: true, requests: filtered };
}

async function listMyB2bRequests(companyId) {
  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT * FROM b2b_requests WHERE company_id=$1 ORDER BY created_at DESC`,
      [companyId],
    );
    return { success: true, requests: res.rows.map(mapRow) };
  }
  return { success: true, requests: mockRequests.filter((r) => r.companyId === companyId) };
}

async function updateB2bRequestStatus(requestId, companyId, status, contractedLineId = null) {
  const valid = ["open", "contracted", "closed"];
  if (!valid.includes(status)) return { success: false, error: `Status inválido. Use: ${valid.join(", ")}` };

  if (shouldUseDatabase()) {
    const check = await query(`SELECT id, company_id FROM b2b_requests WHERE id=$1`, [requestId]);
    if (!check.rows[0]) return { success: false, error: "Solicitação não encontrada" };
    if (check.rows[0].company_id !== companyId) return { success: false, error: "Você não tem permissão para atualizar esta solicitação" };
    await query(
      `UPDATE b2b_requests SET status=$1, contracted_line_id=$2, updated_at=NOW() WHERE id=$3`,
      [status, contractedLineId, requestId],
    );
    const updated = await query(`SELECT * FROM b2b_requests WHERE id=$1`, [requestId]);
    return { success: true, request: mapRow(updated.rows[0]) };
  }
  const idx = mockRequests.findIndex((r) => r.id === requestId);
  if (idx < 0) return { success: false, error: "Solicitação não encontrada" };
  if (mockRequests[idx].companyId !== companyId) return { success: false, error: "Sem permissão" };
  mockRequests[idx].status = status;
  if (contractedLineId) mockRequests[idx].contractedLineId = contractedLineId;
  return { success: true, request: { ...mockRequests[idx] } };
}

function mapRow(r) {
  return {
    id: r.id,
    companyId: r.company_id,
    companyName: r.company_name,
    destination: r.destination,
    originCity: r.origin_city,
    arrivalTime: r.arrival_time,
    departureTime: r.departure_time,
    passengerCount: r.passenger_count,
    daysOfWeek: r.days_of_week,
    notes: r.notes,
    status: r.status,
    contractedLineId: r.contracted_line_id,
    createdAt: r.created_at,
  };
}

async function clearB2bDatabase() { mockRequests = []; }

module.exports = { createB2bRequest, listOpenB2bRequests, listMyB2bRequests, updateB2bRequestStatus, clearB2bDatabase };
