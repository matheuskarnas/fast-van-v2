const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const {
  createVehicle,
  getVehiclesByDriver,
} = require("../services/vehicleService");

const router = express.Router();

function mapErrorCodeToStatus(errorCode) {
  const statusByCode = {
    USER_NOT_FOUND: 404,
    FORBIDDEN_ROLE: 403,
    MISSING_REQUIRED_FIELD: 400,
    INVALID_VEHICLE_PLATE: 400,
    INVALID_VEHICLE_YEAR: 400,
    INVALID_VEHICLE_CAPACITY: 400,
    PLATE_ALREADY_EXISTS: 409,
    INTERNAL_ERROR: 500,
  };

  return statusByCode[errorCode] || 400;
}

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const result = await createVehicle(req.auth.id, req.body);

    if (result.success) {
      return res.status(201).json(result);
    }

    return res.status(mapErrorCodeToStatus(result.error?.code)).json(result);
  } catch (error) {
    return next(error);
  }
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const result = await getVehiclesByDriver(req.auth.id);

    if (result.success) {
      return res.status(200).json(result);
    }

    return res.status(mapErrorCodeToStatus(result.error?.code)).json(result);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
