const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const { submitRating, getDriverRatings, getMyRating } = require("../services/ratingService");
const { shouldUseDatabase, query } = require("../config/database");

const router = express.Router();

// Submeter avaliação
router.post("/", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "PASSENGER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente passageiros podem avaliar" } });
    }

    // Verifica matrícula (mock: via presenceService, DB: via ratingService)
    if (!shouldUseDatabase()) {
      const { createPresenceLine: _, addPassengerToLine: __, ...presenceService } = require("../services/presenceService");
      // No mock, o próprio submitRating não valida matrícula — fazemos aqui via mock
      const mockLines = require("../services/presenceService").__mockLines?.();
      // Simplificado para HTTP tests com mock: passa validação
    }

    const { lineId, driverId, vehicleId, month, punctuality, driving, friendliness, comfort, vehicleQuality, hygiene, comment } = req.body || {};

    // Verifica matrícula no DB
    if (shouldUseDatabase()) {
      const enrolled = await query(`SELECT id FROM line_enrollments WHERE line_id=$1 AND passenger_id=$2`, [lineId, req.auth.id]);
      if (!enrolled.rows[0]) {
        return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Você não está matriculado nesta linha" } });
      }
    } else {
      // Mock: verifica via presenceService
      const { listPassengerLinesByDate } = require("../services/presenceService");
      const today = new Date().toISOString().slice(0, 10);
      const lines = await listPassengerLinesByDate(req.auth.id, today);
      const enrolled = lines.success && (lines.lines ?? []).some((l) => l.lineId === lineId);
      if (!enrolled) {
        return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Você não está matriculado nesta linha" } });
      }
    }

    const result = await submitRating({ lineId, passengerId: req.auth.id, driverId, vehicleId, month, punctuality, driving, friendliness, comfort, vehicleQuality, hygiene, comment });

    if (!result.success) {
      const status = result.error.includes("já avaliou") ? 409 : 400;
      return res.status(status).json({ success: false, error: { code: "RATING_ERROR", message: result.error } });
    }
    return res.status(201).json(result);
  } catch (e) { return next(e); }
});

// Médias do motorista
router.get("/driver/:driverId", requireAuth, async (req, res, next) => {
  try {
    const result = await getDriverRatings(req.params.driverId);
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

// Avaliação já feita pelo passageiro
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "PASSENGER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente passageiros" } });
    }
    const { lineId, month } = req.query;
    const result = await getMyRating(req.auth.id, lineId, month || new Date().toISOString().slice(0, 7));
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

module.exports = router;
