/**
 * RF12/27: Marketplace de Eventos e Viagens Esporádicas
 */

const { query, shouldUseDatabase } = require("../config/database");

let mockRequests = [];
let mockInterests = [];

function nextId() { return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

async function createEventRequest({ creatorId, eventName, eventDate, startTime, endTime = null, originCity, destination, initialCount = 1 }) {
  if (!eventName?.trim()) return { success: false, error: "Nome do evento é obrigatório" };
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return { success: false, error: "Data inválida (use YYYY-MM-DD)" };
  if (!startTime) return { success: false, error: "Horário de início é obrigatório" };
  if (!originCity?.trim()) return { success: false, error: "Cidade de origem é obrigatória" };
  if (!destination?.trim()) return { success: false, error: "Local do evento é obrigatório" };

  const id = nextId();
  const createdAt = new Date().toISOString();
  const count = Math.max(1, parseInt(initialCount) || 1);

  if (shouldUseDatabase()) {
    await query(
      `INSERT INTO event_requests (id, creator_id, event_name, event_date, start_time, end_time, origin_city, destination, initial_count, interested_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,
      [id, creatorId, eventName.trim(), eventDate, startTime, endTime, originCity.trim(), destination.trim(), count],
    );
  } else {
    mockRequests.push({ id, creatorId, eventName: eventName.trim(), eventDate, startTime, endTime, originCity: originCity.trim(), destination: destination.trim(), initialCount: count, interestedCount: count, status: "open", createdAt });
    mockInterests.push({ id: `int_${Date.now()}`, requestId: id, passengerId: creatorId, createdAt });
  }

  return { success: true, request: { id, creatorId, eventName, eventDate, startTime, endTime, originCity, destination, interestedCount: count, status: "open", createdAt } };
}

async function listEventRequests({ originCity = null, eventDate = null, status = "open" } = {}) {
  if (shouldUseDatabase()) {
    const conditions = [`r.status = $1`];
    const params = [status];
    if (originCity) { params.push(`%${originCity}%`); conditions.push(`LOWER(r.origin_city) LIKE LOWER($${params.length})`); }
    if (eventDate) { params.push(eventDate); conditions.push(`r.event_date = $${params.length}`); }

    const res = await query(
      `SELECT r.*, u.name as creator_name
       FROM event_requests r
       LEFT JOIN users u ON u.id = r.creator_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY r.event_date ASC, r.created_at DESC`,
      params,
    );
    return { success: true, requests: res.rows.map(mapRow) };
  }
  let filtered = mockRequests.filter((r) => r.status === (status || "open"));
  if (originCity) filtered = filtered.filter((r) => r.originCity.toLowerCase().includes(originCity.toLowerCase()));
  if (eventDate) filtered = filtered.filter((r) => r.eventDate === eventDate);
  return { success: true, requests: filtered };
}

async function listMyEventRequests(creatorId) {
  if (shouldUseDatabase()) {
    const res = await query(`SELECT * FROM event_requests WHERE creator_id=$1 ORDER BY created_at DESC`, [creatorId]);
    return { success: true, requests: res.rows.map(mapRow) };
  }
  return { success: true, requests: mockRequests.filter((r) => r.creatorId === creatorId) };
}

async function addInterest(requestId, passengerId) {
  if (shouldUseDatabase()) {
    const req = await query(`SELECT id FROM event_requests WHERE id=$1 AND status='open'`, [requestId]);
    if (!req.rows[0]) return { success: false, error: "Demanda não encontrada ou já encerrada" };

    try {
      await query(
        `INSERT INTO event_interests (id, request_id, passenger_id) VALUES ($1,$2,$3)`,
        [`int_${Date.now()}`, requestId, passengerId],
      );
    } catch (e) {
      if (e.message.includes("unique")) return { success: false, error: "Você já demonstrou interesse nesta demanda", code: "ALREADY_INTERESTED" };
      throw e;
    }
    await query(`UPDATE event_requests SET interested_count = interested_count + 1 WHERE id=$1`, [requestId]);
    const updated = await query(`SELECT interested_count FROM event_requests WHERE id=$1`, [requestId]);
    return { success: true, interestedCount: updated.rows[0].interested_count };
  }

  const req = mockRequests.find((r) => r.id === requestId && r.status === "open");
  if (!req) return { success: false, error: "Demanda não encontrada" };
  const dup = mockInterests.find((i) => i.requestId === requestId && i.passengerId === passengerId);
  if (dup) return { success: false, error: "Você já demonstrou interesse nesta demanda", code: "ALREADY_INTERESTED" };
  mockInterests.push({ id: nextId(), requestId, passengerId, createdAt: new Date().toISOString() });
  req.interestedCount = (req.interestedCount || 1) + 1;
  return { success: true, interestedCount: req.interestedCount };
}

async function closeEventRequest(requestId, creatorId) {
  if (shouldUseDatabase()) {
    const check = await query(`SELECT creator_id FROM event_requests WHERE id=$1`, [requestId]);
    if (!check.rows[0]) return { success: false, error: "Demanda não encontrada" };
    if (check.rows[0].creator_id !== creatorId) return { success: false, error: "Sem permissão" };
    await query(`UPDATE event_requests SET status='closed' WHERE id=$1`, [requestId]);
    return { success: true };
  }
  const req = mockRequests.find((r) => r.id === requestId);
  if (!req) return { success: false, error: "Demanda não encontrada" };
  if (req.creatorId !== creatorId) return { success: false, error: "Sem permissão" };
  req.status = "closed";
  return { success: true };
}

function mapRow(r) {
  return {
    id: r.id,
    creatorId: r.creator_id,
    creatorName: r.creator_name,
    eventName: r.event_name,
    eventDate: r.event_date,
    startTime: r.start_time,
    endTime: r.end_time,
    originCity: r.origin_city,
    destination: r.destination,
    initialCount: r.initial_count,
    interestedCount: r.interested_count,
    status: r.status,
    createdAt: r.created_at,
  };
}

async function clearEventDatabase() { mockRequests = []; mockInterests = []; }

module.exports = { createEventRequest, listEventRequests, listMyEventRequests, addInterest, closeEventRequest, clearEventDatabase };
