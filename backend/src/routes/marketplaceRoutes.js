const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const { createB2bRequest, listOpenB2bRequests, listMyB2bRequests, updateB2bRequestStatus } = require("../services/b2bService");
const { createEventRequest, listEventRequests, listMyEventRequests, addInterest, closeEventRequest } = require("../services/eventService");
const { listMarketplaceLines, listDriverMarketplaceLines, updateLineMarketplaceStatus } = require("../services/lineService");

const router = express.Router();

// Linhas regulares anunciadas por motoristas
router.get("/lines", requireAuth, async (req, res, next) => {
  try {
    const { originCity, destination } = req.query;
    const result = await listMarketplaceLines({ originCity, destination });
    if (!result.success) return res.status(400).json({ success: false, error: { code: "MARKETPLACE_LINES_ERROR", message: result.error } });
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

router.get("/lines/mine", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem anunciar linhas" } });
    }
    const result = await listDriverMarketplaceLines(req.auth.id);
    if (!result.success) return res.status(400).json({ success: false, error: { code: "MARKETPLACE_LINES_ERROR", message: result.error } });
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

router.patch("/lines/:id", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem anunciar linhas" } });
    }
    const result = await updateLineMarketplaceStatus(req.params.id, req.auth.id, req.body?.enabled);
    if (!result.success) return res.status(400).json({ success: false, error: { code: "MARKETPLACE_LINE_UPDATE_ERROR", message: result.error } });
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

// RF10: Criar solicitação B2B (qualquer PASSENGER)
router.post("/b2b", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "PASSENGER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente passageiros/empresas podem criar solicitações" } });
    }
    const { destination, originCity, arrivalTime, departureTime, passengerCount, daysOfWeek, notes } = req.body || {};
    const result = await createB2bRequest({ companyId: req.auth.id, destination, originCity, arrivalTime, departureTime, passengerCount, daysOfWeek, notes });
    if (!result.success) return res.status(400).json({ success: false, error: { code: "B2B_ERROR", message: result.error } });
    return res.status(201).json(result);
  } catch (e) { return next(e); }
});

// RF11: Listar solicitações abertas (DRIVER — para ver oportunidades)
router.get("/b2b", requireAuth, async (req, res, next) => {
  try {
    const { originCity } = req.query;
    const result = await listOpenB2bRequests(originCity);
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

// RF10: Minhas solicitações (PASSENGER/empresa)
router.get("/b2b/mine", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "PASSENGER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente passageiros podem consultar suas solicitações" } });
    }
    const result = await listMyB2bRequests(req.auth.id);
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

// RF10/11: Atualizar status (empresa fecha/contrata)
router.patch("/b2b/:id", requireAuth, async (req, res, next) => {
  try {
    const { status, contractedLineId } = req.body || {};
    const result = await updateB2bRequestStatus(req.params.id, req.auth.id, status, contractedLineId);
    if (!result.success) {
      const code = result.error?.includes("permissão") ? 403 : 400;
      return res.status(code).json({ success: false, error: { code: "B2B_ERROR", message: result.error } });
    }
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

// RF12: Criar demanda de evento
router.post("/events", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "PASSENGER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente passageiros podem criar demandas" } });
    }
    const { eventName, eventDate, startTime, endTime, originCity, destination, initialCount } = req.body || {};
    const result = await createEventRequest({ creatorId: req.auth.id, eventName, eventDate, startTime, endTime, originCity, destination, initialCount });
    if (!result.success) return res.status(400).json({ success: false, error: { code: "EVENT_ERROR", message: result.error } });
    return res.status(201).json(result);
  } catch (e) { return next(e); }
});

// RF12/27: Listar demandas de eventos (todos — drivers e passageiros)
router.get("/events", requireAuth, async (req, res, next) => {
  try {
    const { originCity, eventDate, status } = req.query;
    const result = await listEventRequests({ originCity, eventDate, status });
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

// RF12: Minhas demandas
router.get("/events/mine", requireAuth, async (req, res, next) => {
  try {
    const result = await listMyEventRequests(req.auth.id);
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

// RF12: Demonstrar interesse
router.post("/events/:id/interest", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "PASSENGER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente passageiros podem demonstrar interesse" } });
    }
    const result = await addInterest(req.params.id, req.auth.id);
    if (!result.success) {
      const status = result.code === "ALREADY_INTERESTED" ? 409 : 400;
      return res.status(status).json({ success: false, error: { code: result.code || "EVENT_ERROR", message: result.error } });
    }
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

// RF12: Fechar demanda
router.patch("/events/:id/close", requireAuth, async (req, res, next) => {
  try {
    const result = await closeEventRequest(req.params.id, req.auth.id);
    if (!result.success) return res.status(400).json({ success: false, error: { code: "EVENT_ERROR", message: result.error } });
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

module.exports = router;
