const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const {
  upsertPayment,
  getLinePayments,
  getPassengerPaymentStatus,
  addFinancialEntry,
  getFinancialDashboard,
} = require("../services/paymentService");

const router = express.Router();

function driverOnly(req, res) {
  if (req.auth.role !== "DRIVER") {
    res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente motoristas podem acessar finanças" } });
    return false;
  }
  return true;
}

// Dashboard financeiro
router.get("/dashboard", requireAuth, async (req, res, next) => {
  try {
    if (!driverOnly(req, res)) return;
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const result = await getFinancialDashboard(req.auth.id, month);
    if (!result.success) return res.status(400).json({ success: false, error: { code: "FINANCE_ERROR", message: result.error } });
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

// Mensalidades da linha
router.get("/lines/:lineId/payments", requireAuth, async (req, res, next) => {
  try {
    if (!driverOnly(req, res)) return;
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const result = await getLinePayments(req.params.lineId, month, req.auth.id);
    if (!result.success) return res.status(400).json({ success: false, error: { code: "FINANCE_ERROR", message: result.error } });
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

// Upsert mensalidade de um passageiro
router.put("/lines/:lineId/payments/:passengerId", requireAuth, async (req, res, next) => {
  try {
    if (!driverOnly(req, res)) return;
    const { lineId, passengerId } = req.params;
    const { amount, month, status, dueDay, paidAt, notes } = req.body || {};
    const result = await upsertPayment({ lineId, passengerId, amount, month, status, dueDay, paidAt, notes, driverId: req.auth.id });
    if (!result.success) return res.status(400).json({ success: false, error: { code: "PAYMENT_ERROR", message: result.error } });
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

// Lançar receita ou despesa
router.post("/entries", requireAuth, async (req, res, next) => {
  try {
    if (!driverOnly(req, res)) return;
    const { type, category, description, amount, entryDate } = req.body || {};
    const result = await addFinancialEntry({ driverId: req.auth.id, type, category, description, amount, entryDate });
    if (!result.success) return res.status(400).json({ success: false, error: { code: "ENTRY_ERROR", message: result.error } });
    return res.status(201).json(result);
  } catch (e) { return next(e); }
});

// Status de pagamento do passageiro (próprio)
router.get("/me/payment-status", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role !== "PASSENGER") {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN_RESOURCE", message: "Somente passageiros podem consultar seu status" } });
    }
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const result = await getPassengerPaymentStatus(req.auth.id, month);
    if (!result.success) return res.status(400).json({ success: false, error: { code: "FINANCE_ERROR", message: result.error } });
    return res.status(200).json(result);
  } catch (e) { return next(e); }
});

module.exports = router;
