const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const { createB2bRequest, listOpenB2bRequests, listMyB2bRequests, updateB2bRequestStatus } = require("../services/b2bService");

const router = express.Router();

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

module.exports = router;
