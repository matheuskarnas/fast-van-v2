const express = require("express");
const { createUser, authenticateUser } = require("../services/authService");

const router = express.Router();

function mapErrorCodeToStatus(errorCode) {
  const statusByCode = {
    MISSING_REQUIRED_FIELD: 400,
    INVALID_CPF: 400,
    INVALID_EMAIL: 400,
    WEAK_PASSWORD: 400,
    INVALID_CNH: 400,
    INVALID_BIRTH_YEAR: 400,
    INVALID_AGE: 400,
    MISSING_CREDENTIALS: 400,
    INVALID_CREDENTIALS: 401,
    CPF_ALREADY_EXISTS: 409,
    EMAIL_ALREADY_EXISTS: 409,
    CNH_ALREADY_EXISTS: 409,
    INTERNAL_ERROR: 500,
  };

  return statusByCode[errorCode] || 400;
}

router.post("/register", async (req, res, next) => {
  try {
    const result = await createUser(req.body);

    if (result.success) {
      return res.status(201).json(result);
    }

    const statusCode = mapErrorCodeToStatus(result.error?.code);
    return res.status(statusCode).json(result);
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authenticateUser(email, password);

    if (result.success) {
      return res.status(200).json(result);
    }

    const statusCode = mapErrorCodeToStatus(result.error?.code);
    return res.status(statusCode).json(result);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
