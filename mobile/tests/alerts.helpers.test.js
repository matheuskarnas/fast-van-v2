const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getDashboardErrorMessage,
  getAlertVisual,
  parseDateStringToDate,
  toISODate,
  getSelectedDateForLine,
  getInitialOperationalSelection,
} = require("../app/(app)/shared/alerts.helpers.js");

const theme = {
  colors: {
    feedback: {
      error: "#ff4d4f",
      warning: "#faad14",
    },
    text: {
      primary: "#111111",
    },
  },
};

test("getDashboardErrorMessage retorna mensagens específicas por código", () => {
  assert.equal(
    getDashboardErrorMessage("FORBIDDEN_RESOURCE"),
    "Você não tem permissão para visualizar o dashboard desta linha.",
  );
  assert.equal(
    getDashboardErrorMessage("UNKNOWN_CODE", "Mensagem de fallback"),
    "Mensagem de fallback",
  );
});

test("parseDateStringToDate converte e rejeita datas inválidas", () => {
  const parsed = parseDateStringToDate("2026-05-25");
  assert.ok(parsed instanceof Date);
  assert.equal(toISODate(parsed), "2026-05-25");
  assert.equal(parseDateStringToDate("25-05-2026"), null);
  assert.equal(parseDateStringToDate("2026-99-99"), null);
});

test("getAlertVisual distingue capacidade excedida de lotação crítica", () => {
  const exceeded = getAlertVisual("capacity-exceeded", theme);
  const critical = getAlertVisual("critical", theme);

  assert.equal(exceeded.title, "Capacidade Excedida");
  assert.equal(exceeded.border, "#ff4d4f");
  assert.equal(critical.title, "Lotação Crítica");
  assert.equal(critical.border, "#faad14");
});

test("getSelectedDateForLine usa nextDate válida ou fallback", () => {
  const fallbackDate = new Date("2026-05-26T00:00:00");
  const lineWithDate = { nextDate: "2026-06-02" };
  const lineWithoutDate = { nextDate: "data-invalida" };

  assert.equal(
    toISODate(getSelectedDateForLine(lineWithDate, fallbackDate)),
    "2026-06-02",
  );
  assert.equal(
    toISODate(getSelectedDateForLine(lineWithoutDate, fallbackDate)),
    "2026-05-26",
  );
});

test("getInitialOperationalSelection escolhe a primeira linha e a data sugerida", () => {
  const fallbackDate = new Date("2026-05-26T00:00:00");
  const result = getInitialOperationalSelection(
    [
      { lineId: "line-a", nextDate: "2026-05-30" },
      { lineId: "line-b", nextDate: "2026-05-31" },
    ],
    fallbackDate,
  );

  assert.equal(result.lineId, "line-a");
  assert.equal(toISODate(result.selectedDate), "2026-05-30");
});

test("getInitialOperationalSelection usa fallback quando não há linhas", () => {
  const fallbackDate = new Date("2026-05-26T00:00:00");
  const result = getInitialOperationalSelection([], fallbackDate);

  assert.equal(result.lineId, null);
  assert.equal(toISODate(result.selectedDate), "2026-05-26");
});
