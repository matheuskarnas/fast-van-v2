/**
 * RF24: Controle Financeiro do Motorista
 */

const { query, shouldUseDatabase } = require("../config/database");

const VALID_ENTRY_TYPES = ["income", "expense"];
const VALID_CATEGORIES = ["fuel", "maintenance", "toll", "extra_trip", "other"];

let mockPayments = [];
let mockEntries = [];

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function isValidMonth(m) {
  return typeof m === "string" && /^\d{4}-\d{2}$/.test(m);
}

function isValidDate(d) {
  return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(`${d}T00:00:00`).getTime());
}

// ─── Mensalidades ──────────────────────────────────────────────

async function upsertPayment({ lineId, passengerId, amount, month, status = "pending", notes = null }) {
  if (!lineId || !passengerId) return { success: false, error: "lineId e passengerId são obrigatórios" };
  if (!isValidMonth(month)) return { success: false, error: "Competência inválida (use YYYY-MM)" };
  if (typeof amount !== "number" || amount <= 0) return { success: false, error: "Valor deve ser maior que zero" };
  if (!["pending", "paid"].includes(status)) return { success: false, error: "Status inválido" };

  if (shouldUseDatabase()) {
    const id = `pay_${Date.now()}`;
    const paidAt = status === "paid" ? "NOW()" : null;
    await query(
      `INSERT INTO payments (id, line_id, passenger_id, amount, month, status, paid_at, notes)
       VALUES ($1, $2, $3, $4, $5, $6, ${status === "paid" ? "NOW()" : "NULL"}, $7)
       ON CONFLICT (line_id, passenger_id, month) DO UPDATE
         SET amount = $4, status = $6, paid_at = ${status === "paid" ? "NOW()" : "NULL"}, notes = $7, updated_at = NOW()`,
      [id, lineId, passengerId, amount, month, status, notes],
    );
  } else {
    const idx = mockPayments.findIndex((p) => p.lineId === lineId && p.passengerId === passengerId && p.month === month);
    const record = { lineId, passengerId, amount, month, status, notes, paidAt: status === "paid" ? new Date().toISOString() : null };
    if (idx >= 0) mockPayments[idx] = record;
    else mockPayments.push(record);
  }

  return { success: true, payment: { lineId, passengerId, amount, month, status } };
}

async function getLinePayments(lineId, month) {
  if (!isValidMonth(month)) return { success: false, error: "Competência inválida" };

  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT p.passenger_id, u.name as passenger_name, p.amount, p.month, p.status, p.paid_at, p.notes
       FROM payments p
       LEFT JOIN users u ON u.id = p.passenger_id
       WHERE p.line_id = $1 AND p.month = $2
       ORDER BY p.status, u.name`,
      [lineId, month],
    );
    return {
      success: true,
      payments: res.rows.map((r) => ({
        passengerId: r.passenger_id,
        passengerName: r.passenger_name,
        amount: parseFloat(r.amount),
        month: r.month,
        status: r.status,
        paidAt: r.paid_at,
        notes: r.notes,
      })),
    };
  }

  return {
    success: true,
    payments: mockPayments.filter((p) => p.lineId === lineId && p.month === month),
  };
}

async function getPassengerPaymentStatus(passengerId, month) {
  if (!isValidMonth(month)) return { success: false, error: "Competência inválida" };

  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT p.line_id, l.name as line_name, p.amount, p.status, p.month
       FROM payments p
       JOIN lines l ON l.id = p.line_id
       WHERE p.passenger_id = $1 AND p.month = $2`,
      [passengerId, month],
    );
    return {
      success: true,
      payments: res.rows.map((r) => ({
        lineId: r.line_id,
        lineName: r.line_name,
        amount: parseFloat(r.amount),
        status: r.status,
        month: r.month,
      })),
    };
  }

  return {
    success: true,
    payments: mockPayments.filter((p) => p.passengerId === passengerId && p.month === month),
  };
}

// ─── Lançamentos financeiros ────────────────────────────────────

async function addFinancialEntry({ driverId, type, category, description, amount, entryDate }) {
  if (!VALID_ENTRY_TYPES.includes(type)) return { success: false, error: "Tipo inválido. Use: income | expense" };
  if (!VALID_CATEGORIES.includes(category)) return { success: false, error: `Categoria inválida. Use: ${VALID_CATEGORIES.join(", ")}` };
  if (!isValidDate(entryDate)) return { success: false, error: "Data inválida" };
  if (typeof amount !== "number" || amount <= 0) return { success: false, error: "Valor deve ser maior que zero" };

  const month = entryDate.slice(0, 7);
  const id = `entry_${Date.now()}`;

  if (shouldUseDatabase()) {
    await query(
      `INSERT INTO financial_entries (id, driver_id, type, category, description, amount, entry_date, month)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, driverId, type, category, description ?? null, amount, entryDate, month],
    );
  } else {
    mockEntries.push({ id, driverId, type, category, description, amount, entryDate, month });
  }

  return { success: true, entry: { id, type, category, description, amount, entryDate, month } };
}

async function getFinancialEntries(driverId, month) {
  if (!isValidMonth(month)) return { success: false, error: "Competência inválida" };

  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT id, type, category, description, amount, entry_date, month
       FROM financial_entries WHERE driver_id = $1 AND month = $2
       ORDER BY entry_date DESC`,
      [driverId, month],
    );
    return {
      success: true,
      entries: res.rows.map((r) => ({
        id: r.id,
        type: r.type,
        category: r.category,
        description: r.description,
        amount: parseFloat(r.amount),
        entryDate: r.entry_date,
        month: r.month,
      })),
    };
  }

  return {
    success: true,
    entries: mockEntries.filter((e) => e.driverId === driverId && e.month === month),
  };
}

// ─── Dashboard financeiro ────────────────────────────────────────

async function getFinancialDashboard(driverId, month) {
  if (!isValidMonth(month)) return { success: false, error: "Competência inválida" };

  const [linesRes, paymentsRes, entriesRes] = await Promise.all([
    shouldUseDatabase()
      ? query(`SELECT id FROM lines WHERE owner_driver_id = $1`, [driverId])
      : Promise.resolve({ rows: [] }),
    shouldUseDatabase()
      ? query(
          `SELECT p.status, SUM(p.amount) as total, COUNT(*) as count
           FROM payments p
           JOIN lines l ON l.id = p.line_id
           WHERE l.owner_driver_id = $1 AND p.month = $2
           GROUP BY p.status`,
          [driverId, month],
        )
      : Promise.resolve({ rows: [] }),
    getFinancialEntries(driverId, month),
  ]);

  const paymentsByStatus = { pending: { total: 0, count: 0 }, paid: { total: 0, count: 0 } };
  if (shouldUseDatabase()) {
    paymentsRes.rows.forEach((r) => {
      paymentsByStatus[r.status] = { total: parseFloat(r.total), count: parseInt(r.count) };
    });
  } else {
    mockPayments.filter((p) => p.month === month).forEach((p) => {
      paymentsByStatus[p.status].total += p.amount;
      paymentsByStatus[p.status].count += 1;
    });
  }

  const entries = entriesRes.success ? entriesRes.entries : [];
  const totalIncome = entries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const totalMonthly = paymentsByStatus.paid.total;

  return {
    success: true,
    month,
    payments: paymentsByStatus,
    totalMonthlyReceived: totalMonthly,
    totalExtraIncome: totalIncome,
    totalExpenses: totalExpense,
    netProfit: totalMonthly + totalIncome - totalExpense,
    entries,
  };
}

async function clearPaymentDatabase() {
  mockPayments = [];
  mockEntries = [];
}

module.exports = {
  upsertPayment,
  getLinePayments,
  getPassengerPaymentStatus,
  addFinancialEntry,
  getFinancialEntries,
  getFinancialDashboard,
  clearPaymentDatabase,
};
