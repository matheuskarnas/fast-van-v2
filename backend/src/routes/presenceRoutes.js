const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const {
  markPassengerPresence,
  listPassengerLinesByDate,
  getPassengerSummary,
} = require("../services/presenceService");

const router = express.Router();

function mapPresenceError(errorMessage) {
  const mappings = {
    "Data de presença inválida": {
      status: 400,
      code: "INVALID_PRESENCE_DATE",
    },
    "Status de presença inválido": {
      status: 400,
      code: "INVALID_PRESENCE_STATUS",
    },
    "Você não tem permissão para registrar presença nesta linha": {
      status: 403,
      code: "FORBIDDEN_RESOURCE",
    },
    "Prazo para alteração de presença encerrado": {
      status: 409,
      code: "PRESENCE_DEADLINE_EXPIRED",
    },
    "Não há vagas disponíveis no seu horário": {
      status: 409,
      code: "SLOT_FULL",
    },
  };

  return (
    mappings[errorMessage] || {
      status: 400,
      code: "PRESENCE_OPERATION_FAILED",
    }
  );
}

router.get("/me/lines", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "PASSENGER") {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN_RESOURCE",
          message: "Somente passageiros podem acessar este recurso",
        },
      });
    }

    const date = req.query.date;
    const result = await listPassengerLinesByDate(req.auth.id, date);

    if (result.success) {
      return res.status(200).json(result);
    }

    const mapped = mapPresenceError(result.error);
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

router.patch("/lines/:lineId/me/status", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "PASSENGER") {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN_RESOURCE",
          message: "Somente passageiros podem alterar presença",
        },
      });
    }

    const { lineId } = req.params;
    const { date, status } = req.body || {};

    const result = await markPassengerPresence(lineId, req.auth.id, date, status, {
      isAuthenticated: true,
    });

    if (result.success) {
      return res.status(200).json(result);
    }

    const mapped = mapPresenceError(result.error);
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

// RF26: Summary do passageiro (linhas ativas + próximos 7 dias + últimos 7 dias)
router.get("/me/summary", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "PASSENGER") {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN_RESOURCE", message: "Somente passageiros podem acessar este recurso" },
      });
    }
    const result = await getPassengerSummary(req.auth.id);
    if (result.success) return res.status(200).json(result);
    return res.status(400).json({ success: false, error: { code: "SUMMARY_FAILED", message: result.error } });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
