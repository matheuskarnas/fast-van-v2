/**
 * RF25: Passageiro Não Embarcou
 * Valida elegibilidade por segmento e registra ocorrência de no-show.
 */

const { getPassengerPresenceStatus } = require("./presenceService");
const { registerOccurrence } = require("./occurrenceService");

const ELIGIBLE_FOR_IDA = ["vai e volta", "só vou e não volto"];
const ELIGIBLE_FOR_VOLTA = ["vai e volta", "não vou mas volto"];

async function registerNoShow({ lineId, driverId, passengerId, segment, date, latitude = null, longitude = null }) {
  if (!passengerId) return { success: false, error: "passengerId é obrigatório" };
  if (!["ida", "volta"].includes(segment)) return { success: false, error: "Segmento inválido. Use: ida | volta" };

  // Busca status de presença do passageiro na data
  const presenceResult = await getPassengerPresenceStatus(lineId, passengerId, date);
  const status = presenceResult.success ? presenceResult.status : "vai e volta";

  const eligible = segment === "ida" ? ELIGIBLE_FOR_IDA : ELIGIBLE_FOR_VOLTA;
  if (!eligible.includes(status)) {
    return { success: false, error: `Passageiro não confirmado no segmento ${segment} (status: ${status})` };
  }

  return registerOccurrence({
    lineId,
    driverId,
    passengerId,
    type: "passenger_no_show",
    notes: `Não embarcou — segmento: ${segment}`,
    latitude,
    longitude,
  });
}

module.exports = { registerNoShow };
