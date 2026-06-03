/**
 * RF15/30: Dashboard do Motorista — Relatórios e Análises
 */

const { query, shouldUseDatabase } = require("../config/database");

const COST_PER_KM = 0.80;     // R$/km estimado
const WORKING_DAYS_MONTH = 22; // dias úteis estimados

function isValidMonth(m) {
  return typeof m === "string" && /^\d{4}-\d{2}$/.test(m);
}

async function getDriverDashboard(driverId, month, lineId = null, vehicleId = null) {
  if (!isValidMonth(month)) return { success: false, error: "Mês inválido (use YYYY-MM)" };

  if (shouldUseDatabase()) {
    // ── Frota ────────────────────────────────────────────────────────────────
    const vehiclesRes = await query(
      `SELECT COUNT(*) as total FROM vehicles WHERE driver_id = $1`,
      [driverId],
    );

    // ── Linhas ───────────────────────────────────────────────────────────────
    const linesRes = await query(
      `SELECT l.id, l.name, l.origin_city, l.destination_place, l.capacity,
              COUNT(e.passenger_id)::int AS passenger_count
       FROM lines l
       LEFT JOIN line_enrollments e ON e.line_id = l.id
       WHERE l.owner_driver_id = $1 ${lineId ? "AND l.id = $2" : ""}
       GROUP BY l.id`,
      lineId ? [driverId, lineId] : [driverId],
    );

    const totalPassengers = linesRes.rows.reduce((s, r) => s + (r.passenger_count || 0), 0);

    // ── Financeiro (RF24) ────────────────────────────────────────────────────
    const finRes = await query(
      `SELECT type, SUM(amount) as total
       FROM financial_entries
       WHERE driver_id = $1 AND month = $2 ${vehicleId ? "AND FALSE" : ""}
       GROUP BY type`,
      [driverId, month],
    );
    const income = parseFloat(finRes.rows.find((r) => r.type === "income")?.total ?? 0);
    const expense = parseFloat(finRes.rows.find((r) => r.type === "expense")?.total ?? 0);

    // ── Mensalidades (RF24) ──────────────────────────────────────────────────
    const paymentsRes = await query(
      `SELECT status, SUM(amount) as total, COUNT(*) as count
       FROM payments p
       JOIN lines l ON l.id = p.line_id
       WHERE l.owner_driver_id = $1 AND p.month = $2
       GROUP BY status`,
      [driverId, month],
    );
    const paidTotal = parseFloat(paymentsRes.rows.find((r) => r.status === "paid")?.total ?? 0);
    const pendingTotal = parseFloat(paymentsRes.rows.find((r) => r.status === "pending")?.total ?? 0);

    // ── Decisões de van (RF9/RF30) ───────────────────────────────────────────
    const decisionsRes = await query(
      `SELECT decision, COUNT(*) as count
       FROM daily_van_decisions d
       JOIN lines l ON l.id = d.line_id
       WHERE l.owner_driver_id = $1 AND d.date LIKE $2
       GROUP BY decision`,
      [driverId, `${month}%`],
    );
    const singleVanDays = parseInt(decisionsRes.rows.find((r) => r.decision === "single_van")?.count ?? 0);
    const economySaved = singleVanDays * COST_PER_KM * 50; // 50km estimado por dia

    // ── Ausências (RF30) ─────────────────────────────────────────────────────
    const absenceRes = await query(
      `SELECT COUNT(*) as total
       FROM presence_records pr
       JOIN lines l ON l.id = pr.line_id
       WHERE l.owner_driver_id = $1 AND pr.month = $2 AND pr.status = 'não vai e nem volta'`,
      [driverId, month],
    ).catch(() => ({ rows: [{ total: 0 }] }));

    // ── Km estimado (usando distância total das linhas se disponível) ─────────
    const estimatedKm = linesRes.rows.length * 50 * WORKING_DAYS_MONTH; // 50km/linha/dia × 22 dias

    return {
      success: true,
      month,
      fleet: { totalVehicles: parseInt(vehiclesRes.rows[0]?.total ?? 0) },
      lines: {
        total: linesRes.rows.length,
        totalPassengers,
        list: linesRes.rows.map((r) => ({
          lineId: r.id,
          name: r.name,
          originCity: r.origin_city,
          destinationPlace: r.destination_place,
          capacity: r.capacity,
          passengerCount: r.passenger_count,
        })),
      },
      financial: {
        monthlyReceived: paidTotal,
        monthlyPending: pendingTotal,
        extraIncome: income,
        expenses: expense,
        netProfit: paidTotal + income - expense,
      },
      analytics: {
        estimatedKm,
        singleVanDays,
        economySaved: parseFloat(economySaved.toFixed(2)),
        totalAbsences: parseInt(absenceRes.rows[0]?.total ?? 0),
      },
    };
  }

  // Mock path (testes)
  return {
    success: true,
    month,
    fleet: { totalVehicles: 1 },
    lines: { total: 1, totalPassengers: 5, list: [] },
    financial: { monthlyReceived: 0, monthlyPending: 0, extraIncome: 0, expenses: 0, netProfit: 0 },
    analytics: { estimatedKm: 1100, singleVanDays: 3, economySaved: 120, totalAbsences: 0 },
  };
}

module.exports = { getDriverDashboard };
