const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const {
  createGeofenceLine,
  startLineExecution,
  processGeofenceCheckIn,
  getLineExecutionState,
  subscribeToNextPointNotifications,
} = require("../services/geofencingService");

const router = express.Router();

function mapServiceErrorToStatus(errorMessage) {
  if (!errorMessage) {
    return 400;
  }

  if (errorMessage.includes("não encontrada")) {
    return 404;
  }

  if (errorMessage.includes("não tem permissão")) {
    return 403;
  }

  return 400;
}

function parseBoolean(value) {
  return String(value).toLowerCase() === "true";
}

router.post("/lines", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "DRIVER") {
      return res.status(403).json({
        success: false,
        error: "Somente motoristas podem criar linhas de geofence",
      });
    }

    const result = await createGeofenceLine({
      ...req.body,
      ownerDriverId: req.auth.id,
    });

    if (result.success) {
      return res.status(201).json(result);
    }

    return res.status(mapServiceErrorToStatus(result.error)).json(result);
  } catch (error) {
    return next(error);
  }
});

router.post("/lines/:lineId/start", requireAuth, async (req, res, next) => {
  try {
    const { lineId } = req.params;
    const { date } = req.body;

    const result = await startLineExecution(lineId, req.auth.id, date);

    if (result.success) {
      return res.status(200).json(result);
    }

    return res.status(mapServiceErrorToStatus(result.error)).json(result);
  } catch (error) {
    return next(error);
  }
});

router.post("/lines/:lineId/check-ins", requireAuth, async (req, res, next) => {
  try {
    const { lineId } = req.params;
    const { pointId, date, location } = req.body;

    const result = await processGeofenceCheckIn({
      lineId,
      pointId,
      driverId: req.auth.id,
      date,
      location,
    });

    if (result.success) {
      return res.status(200).json(result);
    }

    return res.status(mapServiceErrorToStatus(result.error)).json(result);
  } catch (error) {
    return next(error);
  }
});

router.get("/lines/:lineId/execution", requireAuth, async (req, res, next) => {
  try {
    const { lineId } = req.params;
    const { date } = req.query;

    const result = await getLineExecutionState(lineId, req.auth.id, date);

    if (result.success) {
      return res.status(200).json(result);
    }

    return res.status(mapServiceErrorToStatus(result.error)).json(result);
  } catch (error) {
    return next(error);
  }
});

router.get(
  "/lines/:lineId/notifications/stream",
  requireAuth,
  async (req, res, next) => {
    try {
      const { lineId } = req.params;
      const { date, includeHeartbeat } = req.query;

      const authResult = await getLineExecutionState(lineId, req.auth.id, date);
      if (!authResult.success) {
        return res
          .status(mapServiceErrorToStatus(authResult.error))
          .json(authResult);
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const unsubscribe = subscribeToNextPointNotifications(lineId, (payload) => {
        res.write(`event: next-point\n`);
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      });

      let heartbeat = null;
      if (parseBoolean(includeHeartbeat)) {
        heartbeat = setInterval(() => {
          res.write(`event: heartbeat\n`);
          res.write(`data: ${JSON.stringify({ ts: Date.now() })}\n\n`);
        }, 15000);
      }

      req.on("close", () => {
        unsubscribe();
        if (heartbeat) {
          clearInterval(heartbeat);
        }
      });

      return undefined;
    } catch (error) {
      return next(error);
    }
  },
);

module.exports = router;
