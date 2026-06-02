const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const { createInvite, acceptInvite } = require("../services/inviteService");
const {
  createLine,
  getLinesByDriver,
  getLineById,
  addPickupDropoffPoint,
  updatePickupDropoffPoint,
  removePickupDropoffPoint,
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
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ success: false, error: { code: "INVALID_PAYLOAD", message: "Token é obrigatório" } });
    }
    const result = await acceptInvite(token, req.auth.id);
    if (result.error) {
      return res.status(400).json({ success: false, error: { code: "INVITE_ACCEPT_FAILED", message: result.error } });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
