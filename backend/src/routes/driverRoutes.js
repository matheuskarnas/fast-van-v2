const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const { getDriverDashboard } = require("../services/driverDashboardService");

const router = express.Router();

// RF15/30: Dashboard do motorista
router.get("/dashboard", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem acessar o dashboard" } });
    }
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const { lineId, vehicleId } = req.query;
    const result = await getDriverDashboard(req.auth.id, month, lineId, vehicleId);
    if (!result.success) return res.status(400).json({ success: false, error: { code: "DASHBOARD_ERROR", message: result.error } });
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

module.exports = router;
