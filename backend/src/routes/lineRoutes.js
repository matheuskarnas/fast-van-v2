const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const { createInvite, acceptInvite, getInvite } = require("../services/inviteService");
const { registerOccurrence, listOccurrences } = require("../services/occurrenceService");
const { registerNoShow } = require("../services/noShowService");
const { createSuggestion, listPendingSuggestions, listMySuggestions, decideSuggestion } = require("../services/pointSuggestionService");
const {
  createLine,
  getLinesByDriver,
  getLineById,
  addPickupDropoffPoint,
  updatePickupDropoffPoint,
  removePickupDropoffPoint,
  listLinePassengers,
  updatePointPassengers,
  reorderLinePoints,
} = require("../services/lineService");

const router = express.Router();

// ===== CRUD de Linhas =====

router.post("/", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem criar linhas" },
      });
    }
    const result = await createLine(req.body, req.auth.id);
    if (result.error) {
      return res.status(400).json({
        success: false,
        error: { code: "LINE_CREATE_FAILED", message: result.error },
      });
    }
    return res.status(201).json({ success: true, line: result.line });
  } catch (error) {
    return next(error);
  }
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem listar linhas" },
      });
    }
    const result = await getLinesByDriver(req.auth.id);
    if (result.error) {
      return res.status(400).json({
        success: false,
        error: { code: "LINES_FETCH_FAILED", message: result.error },
      });
    }
    return res.status(200).json({ success: true, lines: result.lines });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem acessar linhas" },
      });
    }
    const result = await getLineById(req.params.id, req.auth.id);
    if (result.error) {
      const status = result.error.includes("permiss") ? 403 : 404;
      return res.status(status).json({
        success: false,
        error: { code: "LINE_FETCH_FAILED", message: result.error },
      });
    }
    return res.status(200).json({ success: true, line: result.line });
  } catch (error) {
    return next(error);
  }
});

router.get("/:lineId/passengers", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem listar passageiros da linha" },
      });
    }
    const result = await listLinePassengers(req.params.lineId, req.auth.id);
    if (result.error) {
      const status = result.error.includes("permiss") ? 403 : 404;
      return res.status(status).json({
        success: false,
        error: { code: "LINE_PASSENGERS_FETCH_FAILED", message: result.error },
      });
    }
    return res.status(200).json({ success: true, passengers: result.passengers });
  } catch (error) {
    return next(error);
  }
});

// ===== CRUD de Pontos =====

router.post("/:id/points", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem adicionar pontos" },
      });
    }
    const result = await addPickupDropoffPoint(req.params.id, req.body, req.auth.id);
    if (result.error) {
      const status = result.error.includes("não encontrada") ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: { code: "POINT_CREATE_FAILED", message: result.error },
      });
    }
    return res.status(201).json({ success: true, point: result.point });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/points/:pointId", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem editar pontos" },
      });
    }
    const result = await updatePickupDropoffPoint(req.params.id, req.params.pointId, req.body, req.auth.id);
    if (result.error) {
      const status = result.error.includes("não encontrad") ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: { code: "POINT_UPDATE_FAILED", message: result.error },
      });
    }
    return res.status(200).json({ success: true, point: result.point });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/points/:pointId/passengers", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem gerenciar passageiros do ponto" },
      });
    }
    const { passengerIds } = req.body || {};
    if (!Array.isArray(passengerIds)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_PAYLOAD", message: "passengerIds deve ser uma lista" },
      });
    }
    const result = await updatePointPassengers(req.params.id, req.params.pointId, passengerIds, req.auth.id);
    if (result.error) {
      const status = result.error.includes("permiss") ? 403 : result.error.includes("não encontrad") ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: { code: "POINT_PASSENGERS_UPDATE_FAILED", message: result.error },
      });
    }
    return res.status(200).json({ success: true, point: result.point });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id/points/order", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem reordenar pontos" },
      });
    }
    const { segment, pointIds } = req.body || {};
    const result = await reorderLinePoints(req.params.id, segment, pointIds, req.auth.id);
    if (result.error) {
      const status = result.error.includes("permiss") ? 403 : result.error.includes("não encontrad") ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: { code: "POINTS_REORDER_FAILED", message: result.error },
      });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id/points/:pointId", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem remover pontos" },
      });
    }
    const result = await removePickupDropoffPoint(req.params.id, req.params.pointId, req.auth.id);
    if (result.error) {
      const status = result.error.includes("passageiros") ? 400 : 404;
      return res.status(status).json({
        success: false,
        error: { code: "POINT_DELETE_FAILED", message: result.error },
      });
    }
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    return next(error);
  }
});

// ===== Convites =====

// Endpoint público — retorna detalhes da linha pelo token sem autenticação
router.get("/invite/:token/preview", async (req, res, next) => {
  try {
    const result = await getInvite(req.params.token);
    if (!result.success) {
      return res.status(404).json({ success: false, error: { code: "INVITE_NOT_FOUND", message: result.error } });
    }
    const { query, shouldUseDatabase } = require("../config/database");
    let line = null;
    if (shouldUseDatabase()) {
      const row = await query(
        `SELECT id, name, origin_city, destination_place, capacity, arrival_times, departure_times FROM lines WHERE id = $1`,
        [result.invite.lineId],
      );
      if (row.rows[0]) {
        const r = row.rows[0];
        line = {
          id: r.id,
          name: r.name,
          originCity: r.origin_city,
          destinationPlace: r.destination_place,
          capacity: r.capacity,
          arrivalTimes: r.arrival_times || [],
          departureTimes: r.departure_times || [],
        };
      }
    }
    return res.status(200).json({ success: true, invite: { lineId: result.invite.lineId, expiresAt: result.invite.expiresAt, line } });
  } catch (error) {
    return next(error);
  }
});

router.post("/:lineId/invite", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem criar invites" },
      });
    }
    const { lineId } = req.params;
    const result = await createInvite(lineId, req.auth.id);
    if (result.error) {
      return res.status(400).json({ success: false, error: { code: "INVITE_CREATE_FAILED", message: result.error } });
    }
    return res.status(201).json({ success: true, data: { token: result.token, url: result.url, expiresAt: result.expiresAt } });
  } catch (error) {
    return next(error);
  }
});

router.post("/invite/accept", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "PASSENGER") {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN_RESOURCE", message: "Somente passageiros podem aceitar invites" },
      });
    }
    const { token, departureTime, arrivalTime } = req.body || {};
    if (!token) {
      return res.status(400).json({ success: false, error: { code: "INVALID_PAYLOAD", message: "Token é obrigatório" } });
    }
    if (!departureTime || !arrivalTime) {
      return res.status(400).json({ success: false, error: { code: "INVALID_PAYLOAD", message: "Horário de ida e volta são obrigatórios" } });
    }
    const result = await acceptInvite(token, req.auth.id, { departureTime, arrivalTime });
    if (!result.success) {
      const status = result.code === "SLOT_FULL" ? 409 : 400;
      return res.status(status).json({ success: false, error: { code: result.code || "INVITE_ACCEPT_FAILED", message: result.error } });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
});

// RF23: Registrar ocorrência
router.post("/:lineId/occurrences", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem registrar ocorrências" } });
    }
    const { lineId } = req.params;
    const { type, notes, passengerId, latitude, longitude } = req.body || {};
    const result = await registerOccurrence({ lineId, driverId: req.auth.id, passengerId, type, notes, latitude, longitude });
    if (!result.success) {
      return res.status(400).json({ success: false, error: { code: "OCCURRENCE_ERROR", message: result.error } });
    }
    return res.status(201).json(result);
  } catch (e) { return next(e); }
});

// RF23: Listar ocorrências por data
router.get("/:lineId/occurrences", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem consultar ocorrências" } });
    }
    const { lineId } = req.params;
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const result = await listOccurrences(lineId, date);
    if (!result.success) {
      return res.status(400).json({ success: false, error: { code: "OCCURRENCE_ERROR", message: result.error } });
    }
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

// RF25: Registrar passageiro não embarcou
router.post("/:lineId/no-show", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem registrar no-show" } });
    }
    const { lineId } = req.params;
    const { passengerId, segment, date, latitude, longitude } = req.body || {};
    if (!passengerId) {
      return res.status(400).json({ success: false, error: { code: "INVALID_PAYLOAD", message: "passengerId é obrigatório" } });
    }
    const result = await registerNoShow({ lineId, driverId: req.auth.id, passengerId, segment, date, latitude, longitude });
    if (!result.success) {
      const status = result.error?.includes("não confirmado") ? 422 : 400;
      return res.status(status).json({ success: false, error: { code: "NO_SHOW_ERROR", message: result.error } });
    }
    return res.status(201).json(result);
  } catch (e) { return next(e); }
});

// RF19: Sugerir ponto (PASSENGER matriculado)
router.post("/:lineId/point-suggestions", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "PASSENGER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente passageiros podem sugerir pontos" } });
    }
    const { lineId } = req.params;

    // Verifica matrícula
    const { shouldUseDatabase, query: dbQuery } = require("../config/database");
    if (shouldUseDatabase()) {
      const e = await dbQuery(`SELECT 1 FROM line_enrollments WHERE line_id=$1 AND passenger_id=$2`, [lineId, req.auth.id]);
      if (!e.rows[0]) return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Você não está matriculado nesta linha" } });
    } else {
      const { listPassengerLinesByDate } = require("../services/presenceService");
      const today = new Date().toISOString().slice(0, 10);
      const lines = await listPassengerLinesByDate(req.auth.id, today);
      if (!lines.success || !(lines.lines ?? []).some((l) => l.lineId === lineId)) {
        return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Você não está matriculado nesta linha" } });
      }
    }

    const { address, type, segment, latitude, longitude, placeId } = req.body || {};
    const result = await createSuggestion({ lineId, passengerId: req.auth.id, address, type, segment, latitude, longitude, placeId });
    if (!result.success) return res.status(400).json({ success: false, error: { code: "SUGGESTION_ERROR", message: result.error } });
    return res.status(201).json(result);
  } catch (e) { return next(e); }
});

// RF19: Listar sugestões pendentes da linha (DRIVER)
router.get("/:lineId/point-suggestions", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem listar sugestões" } });
    }
    const result = await listPendingSuggestions(req.params.lineId);
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

// RF20: Minhas sugestões (PASSENGER)
router.get("/:lineId/point-suggestions/me", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "PASSENGER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente passageiros podem consultar suas sugestões" } });
    }
    const result = await listMySuggestions(req.params.lineId, req.auth.id);
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

// RF19: Aprovar/rejeitar sugestão (DRIVER dono)
router.patch("/:lineId/point-suggestions/:suggId", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem decidir sobre sugestões" } });
    }
    const { suggId } = req.params;
    const { decision, rejectionReason } = req.body || {};
    const result = await decideSuggestion(suggId, req.auth.id, decision, rejectionReason);
    if (!result.success) return res.status(400).json({ success: false, error: { code: "SUGGESTION_ERROR", message: result.error } });
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

module.exports = router;
