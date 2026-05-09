const DEFAULT_FALLBACK_DATE = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
};

function parseDateStringToDate(dateString) {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return null;
  }

  const parsed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTomorrowDate() {
  return DEFAULT_FALLBACK_DATE();
}

function getDashboardErrorMessage(errorCode, fallback) {
  const messages = {
    FORBIDDEN_RESOURCE:
      "Você não tem permissão para visualizar o dashboard desta linha.",
    LINE_NOT_FOUND: "Linha não encontrada. Verifique o ID informado.",
    INVALID_OCCUPANCY_DATE: "A data informada é inválida para consulta.",
    NEXT_DATE_ONLY:
      "A consulta só pode ser feita para a próxima data da linha.",
    INVALID_LINE_CAPACITY:
      "A linha está com capacidade inválida e não pode ser analisada.",
    NETWORK_ERROR:
      "Sem conexão com o servidor. Verifique sua internet e tente novamente.",
  };

  return (
    messages[errorCode || ""] ||
    fallback ||
    "Não foi possível carregar o dashboard operacional."
  );
}

function getAlertVisual(level, theme) {
  if (level === "capacity-exceeded") {
    return {
      bg: `${theme.colors.feedback.error}22`,
      border: theme.colors.feedback.error,
      text: theme.colors.feedback.error,
      title: "Capacidade Excedida",
    };
  }

  return {
    bg: `${theme.colors.feedback.warning}25`,
    border: theme.colors.feedback.warning,
    text: theme.colors.text.primary,
    title: "Lotação Crítica",
  };
}

function getSelectedDateForLine(line, fallbackDate = getTomorrowDate()) {
  return parseDateStringToDate(line?.nextDate) || fallbackDate;
}

function getInitialOperationalSelection(
  lines,
  fallbackDate = getTomorrowDate(),
) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return {
      lineId: null,
      selectedDate: fallbackDate,
    };
  }

  const preferredLine = lines[0];

  return {
    lineId: preferredLine.lineId || null,
    selectedDate: getSelectedDateForLine(preferredLine, fallbackDate),
  };
}

module.exports = {
  getTomorrowDate,
  getDashboardErrorMessage,
  getAlertVisual,
  parseDateStringToDate,
  toISODate,
  getSelectedDateForLine,
  getInitialOperationalSelection,
};
