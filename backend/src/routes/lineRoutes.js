const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const { createInvite, acceptInvite } = require("../services/inviteService");

const router = express.Router();

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

    if (!result.success) {
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
    if (!result.success) {
      return res.status(400).json({ success: false, error: { code: "INVITE_ACCEPT_FAILED", message: result.error } });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
