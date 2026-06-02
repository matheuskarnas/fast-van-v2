const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const { getLineAlerts } = require("../services/alertService");
const { listDriverOperationalLines } = require("../services/presenceService");
const { registerVanDecision, getVanDecision } = require("../services/vanDecisionService");

const router = express.Router();

router.get("/lines", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN_RESOURCE",
          message: "Somente motoristas podem acessar o dashboard operacional",
        },
      });
    }

    const result = await listDriverOperationalLines(req.auth.id);

    if (result.success) {
      return res.status(200).json(result);
    }

    return res.status(400).json({
      success: false,
      error: {
        code: "OPERATIONS_LINES_FAILED",
        message: result.error,
      },
    });
  } catch (error) {
    return next(error);
  }
});

function mapOperationsError(errorMessage) {
  const mappings = {
    "Linha não encontrada": { status: 404, code: "LINE_NOT_FOUND" },
    "Data de ocupação inválida": {
      status: 400,
      code: "INVALID_OCCUPANCY_DATE",
    },
    "Data de alerta inválida": {
      status: 400,
      code: "INVALID_OCCUPANCY_DATE",
    },
    "A consulta de ocupação só é permitida para a próxima data da linha": {
      status: 409,
      code: "NEXT_DATE_ONLY",
    },
    "Capacidade da linha inválida": {
      status: 409,
      code: "INVALID_LINE_CAPACITY",
    },
  };

  if (errorMessage && errorMessage.includes("permissão")) {
    return {
      status: 403,
      code: "FORBIDDEN_RESOURCE",
    };
  }

  return (
    mappings[errorMessage] || {
      status: 400,
      code: "OPERATIONS_DASHBOARD_FAILED",
    }
  );
}

router.get("/lines/:lineId/dashboard", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN_RESOURCE",
          message: "Somente motoristas podem acessar o dashboard operacional",
        },
      });
    }

    const { lineId } = req.params;
    const { date } = req.query;

    const result = await getLineAlerts(lineId, date, req.auth.id);

    if (result.success) {
      return res.status(200).json(result);
    }

    const mapped = mapOperationsError(result.error);
    return res.status(mapped.status).json({
      success: false,
      error: {
        code: mapped.code,
        message: result.error,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// RF9: Registrar decisão do dia (1 van ou 2 vans)
router.post("/lines/:lineId/decision", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem registrar decisão de van" } });
    }
    const { lineId } = req.params;
    const { date, decision, vehicleId = null, notes = null } = req.body || {};
    const result = await registerVanDecision({ lineId, driverId: req.auth.id, date, decision, vehicleId, notes });
    if (!result.success) {
      return res.status(400).json({ success: false, error: { code: "DECISION_FAILED", message: result.error } });
    }
    return res.status(201).json({ success: true, decision: result.decision });
  } catch (error) {
    return next(error);
  }
});

// RF9: Consultar decisão do dia
router.get("/lines/:lineId/decision", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem consultar decisão de van" } });
    }
    const { lineId } = req.params;
    const { date } = req.query;
    const result = await getVanDecision(lineId, date);
    if (!result.success) {
      return res.status(400).json({ success: false, error: { code: "DECISION_QUERY_FAILED", message: result.error } });
    }
    return res.status(200).json({ success: true, decision: result.decision });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
