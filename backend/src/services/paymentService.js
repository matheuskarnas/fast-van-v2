/**
 * RF24: Controle Financeiro do Motorista
 */

const { query, shouldUseDatabase } = require("../config/database");

const VALID_ENTRY_TYPES = ["income", "expense"];
const VALID_CATEGORIES = ["fuel", "maintenance", "toll", "extra_trip", "other"];

let mockPayments = [];
let mockEntries = [];

function isValidMonth(m) {
  return typeof m === "string" && /^\d{4}-\d{2}$/.test(m);
}

function isValidDate(d) {
  return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(`${d}T00:00:00`).getTime());
}

function isValidDueDay(day) {
  return Number.isInteger(day) && day >= 1 && day <= 31;
}

function getDueDate(month, dueDay) {
  if (!isValidMonth(month) || !isValidDueDay(dueDay)) return null;
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const day = Math.min(dueDay, lastDay);
  return `${month}-${String(day).padStart(2, "0")}`;
}

function getDisplayStatus(status, month, dueDay) {
  if (status === "paid") return "paid";
  const dueDate = getDueDate(month, dueDay);
  if (dueDate && new Date().toISOString().slice(0, 10) > dueDate) return "overdue";
  return "pending";
}

// ─── Mensalidades ──────────────────────────────────────────────

async function upsertPayment({ lineId, passengerId, amount, month, status = "pending", dueDay, paidAt = null, notes = null, driverId = null }) {
  if (!lineId || !passengerId) return { success: false, error: "lineId e passengerId são obrigatórios" };
  if (!isValidMonth(month)) return { success: false, error: "Competência inválida (use YYYY-MM)" };
  if (typeof amount !== "number" || amount <= 0) return { success: false, error: "Valor deve ser maior que zero" };
  if (!["pending", "paid"].includes(status)) return { success: false, error: "Status inválido" };
  if (!isValidDueDay(dueDay)) return { success: false, error: "Dia de vencimento deve estar entre 1 e 31" };
  if (paidAt && !isValidDate(paidAt)) return { success: false, error: "Data de pagamento inválida" };

  if (shouldUseDatabase()) {
    if (driverId) {
      const line = await query(
        `SELECT id FROM lines WHERE id = $1 AND (owner_driver_id = $2 OR driver_id = $2)`,
        [lineId, driverId],
      );
      if (!line.rows[0]) return { success: false, error: "Você não tem permissão para gerenciar esta linha" };
    }

    const enrollment = await query(
      `SELECT id FROM line_enrollments WHERE line_id = $1 AND passenger_id = $2`,
      [lineId, passengerId],
    );
    if (!enrollment.rows[0]) return { success: false, error: "Passageiro não está matriculado nesta linha" };

    const id = `pay_${Date.now()}`;
    const resolvedPaidAt = status === "paid" ? (paidAt || new Date().toISOString().slice(0, 10)) : null;
    await query(
      `INSERT INTO payments (id, line_id, passenger_id, amount, month, status, paid_at, due_day, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (line_id, passenger_id, month) DO UPDATE
         SET amount = $4, status = $6, paid_at = $7, due_day = $8, notes = $9, updated_at = NOW()`,
      [id, lineId, passengerId, amount, month, status, resolvedPaidAt, dueDay, notes],
    );
  } else {
    const idx = mockPayments.findIndex((p) => p.lineId === lineId && p.passengerId === passengerId && p.month === month);
    const record = { lineId, passengerId, amount, month, status, dueDay, notes, paidAt: status === "paid" ? (paidAt || new Date().toISOString().slice(0, 10)) : null };
    if (idx >= 0) mockPayments[idx] = record;
    else mockPayments.push(record);
  }

  return {
    success: true,
    payment: {
      lineId,
      passengerId,
      amount,
      month,
      status,
      displayStatus: getDisplayStatus(status, month, dueDay),
      dueDay,
      dueDate: getDueDate(month, dueDay),
      paidAt: status === "paid" ? paidAt : null,
      notes,
    },
  };
}

async function getLinePayments(lineId, month, driverId = null) {
  if (!isValidMonth(month)) return { success: false, error: "Competência inválida" };

  if (shouldUseDatabase()) {
    if (driverId) {
      const line = await query(
        `SELECT id FROM lines WHERE id = $1 AND (owner_driver_id = $2 OR driver_id = $2)`,
        [lineId, driverId],
      );
      if (!line.rows[0]) return { success: false, error: "Você não tem permissão para acessar esta linha" };
    }

    const res = await query(
      `SELECT e.passenger_id,
              u.name as passenger_name,
              COALESCE(p.amount, template.amount) as amount,
              COALESCE(p.month, $2) as month,
              COALESCE(p.status, 'pending') as status,
              p.paid_at,
              COALESCE(p.due_day, template.due_day) as due_day,
              p.notes
       FROM line_enrollments e
       LEFT JOIN users u ON u.id = e.passenger_id
       LEFT JOIN payments p ON p.line_id = e.line_id AND p.passenger_id = e.passenger_id AND p.month = $2
       LEFT JOIN LATERAL (
         SELECT amount, due_day
           FROM payments previous
          WHERE previous.line_id = e.line_id
            AND previous.passenger_id = e.passenger_id
            AND previous.due_day IS NOT NULL
          ORDER BY previous.month DESC, previous.updated_at DESC
          LIMIT 1
       ) template ON true
       WHERE e.line_id = $1
       ORDER BY COALESCE(p.status, 'pending'), u.name`,
      [lineId, month],
    );
    return {
      success: true,
      payments: res.rows.map((r) => ({
        passengerId: r.passenger_id,
        passengerName: r.passenger_name,
        amount: r.amount === null ? null : parseFloat(r.amount),
        month: r.month,
        status: r.status,
        displayStatus: getDisplayStatus(r.status, r.month, r.due_day),
        dueDay: r.due_day,
        dueDate: getDueDate(r.month, r.due_day),
        paidAt: r.paid_at,
        notes: r.notes,
      })),
    };
  }

  return {
    success: true,
    payments: mockPayments
      .filter((p) => p.lineId === lineId && p.month === month)
      .map((p) => ({ ...p, displayStatus: getDisplayStatus(p.status, p.month, p.dueDay), dueDate: getDueDate(p.month, p.dueDay) })),
  };
}

async function getPassengerPaymentStatus(passengerId, month) {
  if (!isValidMonth(month)) return { success: false, error: "Competência inválida" };

  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT e.line_id,
              l.name as line_name,
              COALESCE(p.amount, template.amount) as amount,
              COALESCE(p.status, 'pending') as status,
              COALESCE(p.month, $2) as month,
              COALESCE(p.due_day, template.due_day) as due_day,
              p.paid_at
       FROM line_enrollments e
       JOIN lines l ON l.id = e.line_id
       LEFT JOIN payments p ON p.line_id = e.line_id AND p.passenger_id = e.passenger_id AND p.month = $2
       LEFT JOIN LATERAL (
         SELECT amount, due_day
           FROM payments previous
          WHERE previous.line_id = e.line_id
            AND previous.passenger_id = e.passenger_id
            AND previous.due_day IS NOT NULL
          ORDER BY previous.month DESC, previous.updated_at DESC
          LIMIT 1
       ) template ON true
       WHERE e.passenger_id = $1`,
      [passengerId, month],
    );
    return {
      success: true,
      payments: res.rows.map((r) => ({
        lineId: r.line_id,
        lineName: r.line_name,
        amount: r.amount === null ? null : parseFloat(r.amount),
        status: r.status,
        displayStatus: getDisplayStatus(r.status, r.month, r.due_day),
        month: r.month,
        dueDay: r.due_day,
        dueDate: getDueDate(r.month, r.due_day),
        paidAt: r.paid_at,
      })),
    };
  }

  return {
    success: true,
    payments: mockPayments
      .filter((p) => p.passengerId === passengerId && p.month === month)
      .map((p) => ({ ...p, displayStatus: getDisplayStatus(p.status, p.month, p.dueDay), dueDate: getDueDate(p.month, p.dueDay) })),
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

  const [paymentsRes, entriesRes] = await Promise.all([
    shouldUseDatabase()
      ? query(
          `SELECT effective.status, SUM(effective.amount) as total, COUNT(*) as count
             FROM (
               SELECT COALESCE(p.status, 'pending') as status,
                      COALESCE(p.amount, template.amount) as amount
                 FROM line_enrollments e
                 JOIN lines l ON l.id = e.line_id
                 LEFT JOIN payments p ON p.line_id = e.line_id AND p.passenger_id = e.passenger_id AND p.month = $2
                 LEFT JOIN LATERAL (
                   SELECT amount, due_day
                     FROM payments previous
                    WHERE previous.line_id = e.line_id
                      AND previous.passenger_id = e.passenger_id
                      AND previous.due_day IS NOT NULL
                    ORDER BY previous.month DESC, previous.updated_at DESC
                    LIMIT 1
                 ) template ON true
                WHERE (l.owner_driver_id = $1 OR l.driver_id = $1)
                  AND COALESCE(p.amount, template.amount) IS NOT NULL
             ) effective
            GROUP BY effective.status`,
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
