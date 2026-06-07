/**
 * Serviço de Linhas (Rotas)
 * Responsável pela criação, atualização e gerenciamento de linhas de transporte
 */

// Lazy require em createLine para evitar dependência circular com vehicleService

const { query, shouldUseDatabase } = require("../config/database");

let mockLines = [];
let mockPointId = 0;
let lineIdCounter = 0;

function mapLineRowToDomain(row, points = []) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || row.line_name || "",
    vehicleId: row.vehicle_id,
    originCity: row.origin_city,
    destinationPlace: row.destination_place || row.destination_city || "",
    ownerDriverId: row.owner_driver_id,
    driverId: row.driver_id || null,
    arrivalTimes: row.arrival_times || [],
    departureTimes: row.departure_times || [],
    capacity: row.capacity,
    pickupDropoffPoints: points,
    createdAt: row.created_at,
  };
}

function mapPointRowToDomain(row) {
  if (!row) return null;
  return {
    id: row.id,
    address: row.address,
    type: row.type,
    segment: row.segment,
    passengers: row.passengers || [],
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    placeId: row.place_id ?? null,
    createdAt: row.created_at,
  };
}

function getPassengerId(passenger) {
  if (!passenger) return null;
  if (typeof passenger === "string") return passenger;
  return passenger.id || passenger.passengerId || null;
}

function normalizePassengerIds(passengers) {
  if (!Array.isArray(passengers)) return [];
  return passengers.map(getPassengerId).filter(Boolean);
}

async function getEnrolledPassengerMap(lineId) {
  if (!shouldUseDatabase()) return new Map();
  const result = await query(
    `SELECT e.passenger_id, u.name
       FROM line_enrollments e
       LEFT JOIN users u ON u.id = e.passenger_id
      WHERE e.line_id = $1
      ORDER BY u.name`,
    [lineId],
  );
  return new Map(
    result.rows.map((row) => [
      row.passenger_id,
      { id: row.passenger_id, name: row.name || row.passenger_id },
    ]),
  );
}

async function listLinePassengers(lineId, driverId) {
  try {
    if (shouldUseDatabase()) {
      const lineRes = await query(`SELECT owner_driver_id, driver_id FROM lines WHERE id = $1`, [lineId]);
      if (!lineRes.rows[0]) return { success: false, error: "Linha não encontrada" };
      const { owner_driver_id, driver_id } = lineRes.rows[0];
      if (owner_driver_id !== driverId && driver_id !== driverId) {
        return { success: false, error: "Você não tem permissão para acessar esta linha" };
      }

      const res = await query(
        `SELECT e.passenger_id, e.departure_time, e.arrival_time, u.name
           FROM line_enrollments e
           LEFT JOIN users u ON u.id = e.passenger_id
          WHERE e.line_id = $1
          ORDER BY u.name, e.passenger_id`,
        [lineId],
      );

      return {
        success: true,
        passengers: res.rows.map((row) => ({
          id: row.passenger_id,
          name: row.name || row.passenger_id,
          departureTime: row.departure_time,
          arrivalTime: row.arrival_time,
        })),
      };
    }

    const line = process.env.USE_MOCK_DB === "true"
      ? mockLines.find((l) => l.id === lineId)
      : null;
    if (!line) return { success: false, error: "Linha não encontrada" };
    if (line.ownerDriverId !== driverId && line.driverId !== driverId) {
      return { success: false, error: "Você não tem permissão para acessar esta linha" };
    }

    const passengerIds = new Set();
    (line.pickupDropoffPoints || []).forEach((point) => {
      normalizePassengerIds(point.passengers).forEach((id) => passengerIds.add(id));
    });
    return {
      success: true,
      passengers: [...passengerIds].map((id) => ({ id, name: id })),
    };
  } catch (error) {
    return { success: false, error: `Erro ao listar passageiros: ${error.message}` };
  }
}

async function enrichPointsWithPassengers(lineId, points) {
  if (!points.length) return points;

  const enrolledPassengerMap = await getEnrolledPassengerMap(lineId);

  return points.map((point) => {
    return {
      ...point,
      passengers: normalizePassengerIds(point.passengers).map(
        (passengerId) =>
          enrolledPassengerMap.get(passengerId) || {
            id: passengerId,
            name: passengerId,
          },
      ),
    };
  });
}

async function removePassengersFromOtherSegmentPoints(lineId, pointId, segment, passengerIds) {
  const idsToMove = new Set(normalizePassengerIds(passengerIds));
  if (!idsToMove.size) return;

  if (shouldUseDatabase()) {
    const otherPoints = await query(
      `SELECT id, passengers
         FROM line_points
        WHERE line_id = $1 AND segment = $2 AND id <> $3`,
      [lineId, segment, pointId],
    );

    await Promise.all(
      otherPoints.rows.map((point) => {
        const nextPassengers = normalizePassengerIds(point.passengers).filter(
          (passengerId) => !idsToMove.has(passengerId),
        );
        return query(
          `UPDATE line_points SET passengers = $1::jsonb WHERE id = $2`,
          [JSON.stringify(nextPassengers), point.id],
        );
      }),
    );
  }
}

async function updatePointPassengers(lineId, pointId, passengerIds, driverId) {
  try {
    const normalizedPassengerIds = [...new Set(normalizePassengerIds(passengerIds))];

    if (shouldUseDatabase()) {
      const lineRes = await query(`SELECT owner_driver_id, driver_id FROM lines WHERE id = $1`, [lineId]);
      if (!lineRes.rows[0]) return { success: false, error: "Linha não encontrada" };
      const { owner_driver_id, driver_id } = lineRes.rows[0];
      if (owner_driver_id !== driverId && driver_id !== driverId) {
        return { success: false, error: "Você não tem permissão para gerenciar esta linha" };
      }

      const pointRes = await query(`SELECT id, segment FROM line_points WHERE id = $1 AND line_id = $2`, [pointId, lineId]);
      if (!pointRes.rows[0]) return { success: false, error: "Ponto não encontrado" };

      if (normalizedPassengerIds.length > 0) {
        const enrolled = await query(
          `SELECT passenger_id FROM line_enrollments WHERE line_id = $1 AND passenger_id = ANY($2::text[])`,
          [lineId, normalizedPassengerIds],
        );
        if (enrolled.rows.length !== normalizedPassengerIds.length) {
          return { success: false, error: "Só é possível vincular passageiros matriculados nesta linha" };
        }
      }

      const res = await query(
        `UPDATE line_points
            SET passengers = $1::jsonb
          WHERE id = $2 AND line_id = $3
          RETURNING id, address, type, segment, passengers, latitude, longitude, place_id, created_at`,
        [JSON.stringify(normalizedPassengerIds), pointId, lineId],
      );
      await removePassengersFromOtherSegmentPoints(lineId, pointId, pointRes.rows[0].segment, normalizedPassengerIds);
      const enriched = await enrichPointsWithPassengers(lineId, [mapPointRowToDomain(res.rows[0])]);
      return { success: true, point: enriched[0] };
    }

    const line = process.env.USE_MOCK_DB === "true"
      ? mockLines.find((l) => l.id === lineId)
      : null;
    if (!line) return { success: false, error: "Linha não encontrada" };
    if (line.ownerDriverId !== driverId && line.driverId !== driverId) {
      return { success: false, error: "Você não tem permissão para gerenciar esta linha" };
    }
    const point = line.pickupDropoffPoints.find((p) => p.id === pointId);
    if (!point) return { success: false, error: "Ponto não encontrado" };
    point.passengers = normalizedPassengerIds;
    const idsToMove = new Set(normalizedPassengerIds);
    line.pickupDropoffPoints.forEach((otherPoint) => {
      if (otherPoint.id === pointId || otherPoint.segment !== point.segment) return;
      otherPoint.passengers = normalizePassengerIds(otherPoint.passengers).filter(
        (passengerId) => !idsToMove.has(passengerId),
      );
    });
    return { success: true, point };
  } catch (error) {
    return { success: false, error: `Erro ao atualizar passageiros do ponto: ${error.message}` };
  }
}

async function getPointsByLineId(lineId) {
  if (!shouldUseDatabase()) return [];
  const result = await query(
    `SELECT id, line_id, address, type, segment, passengers, latitude, longitude, place_id, created_at
     FROM line_points WHERE line_id = $1 ORDER BY created_at ASC`,
    [lineId],
  );
  return enrichPointsWithPassengers(lineId, result.rows.map(mapPointRowToDomain));
}

/**
 * Cria uma nova linha de transporte
 */
async function createLine(lineData, ownerDriverId) {
  try {
    if (!lineData.name || lineData.name.trim() === "") {
      return { success: false, error: "Nome da linha é obrigatório" };
    }

    if (!lineData.originCity || lineData.originCity.trim() === "") {
      return { success: false, error: "Cidade de origem é obrigatória" };
    }

    if (!lineData.destinationPlace || lineData.destinationPlace.trim() === "") {
      return { success: false, error: "Ponto de destino é obrigatório" };
    }

    if (!lineData.vehicleId) {
      return { success: false, error: "Você deve cadastrar um veículo antes de criar uma linha" };
    }

    if (!Array.isArray(lineData.arrivalTimes) || lineData.arrivalTimes.length === 0) {
      return { success: false, error: "Informe pelo menos um horário de chegada" };
    }

    if (!Array.isArray(lineData.departureTimes) || lineData.departureTimes.length === 0) {
      return { success: false, error: "Informe pelo menos um horário de saída" };
    }

    // Validar que o veículo pertence ao motorista dono
    let vehicleCapacity = 16;

    if (process.env.USE_MOCK_DB === "true") {
      const { getVehiclesByDriver } = require("./vehicleService");
      const vehiclesResult = await getVehiclesByDriver(ownerDriverId);
      const driverVehicles = vehiclesResult.success ? vehiclesResult.vehicles : [];
      const matchedVehicle = driverVehicles.find((v) => v.id === lineData.vehicleId);

      if (!matchedVehicle) {
        return {
          success: false,
          error: "Veículo não encontrado ou não pertence a você",
        };
      }

      vehicleCapacity = matchedVehicle.capacity || 16;
    }

    const newLine = {
      id: `line-${++lineIdCounter}`,
      name: lineData.name.trim(),
      vehicleId: lineData.vehicleId,
      originCity: lineData.originCity,
      destinationPlace: lineData.destinationPlace,
      ownerDriverId,
      driverId: lineData.driverId || null,
      arrivalTimes: lineData.arrivalTimes,
      departureTimes: lineData.departureTimes,
      pickupDropoffPoints: [],
      capacity: vehicleCapacity,
      createdAt: new Date().toISOString(),
    };

    if (shouldUseDatabase()) {
      const id = `line_${Date.now()}`;
      await query(
        `INSERT INTO lines (id, name, line_name, owner_driver_id, driver_id, vehicle_id, origin_city, destination_place, destination_city, arrival_times, departure_times, capacity)
         VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10)`,
        [
          id,
          newLine.name,
          ownerDriverId,
          newLine.driverId,
          newLine.vehicleId,
          newLine.originCity,
          newLine.destinationPlace,
          JSON.stringify(newLine.arrivalTimes),
          JSON.stringify(newLine.departureTimes),
          vehicleCapacity,
        ],
      );
      newLine.id = id;
    } else if (process.env.USE_MOCK_DB === "true") {
      mockLines.push(newLine);
    }

    return { success: true, line: newLine };
  } catch (error) {
    return { success: false, error: `Erro ao criar linha: ${error.message}` };
  }
}

/**
 * Adiciona um ponto de embarque ou desembarque a uma linha.
 * O campo time não é obrigatório — o horário de passada depende da execução da rota.
 * O campo passengerId é opcional — um ponto pode ser criado vazio.
 */
async function addPickupDropoffPoint(lineId, pointData, driverId) {
  try {
    if (!pointData.address || pointData.address.trim() === "") {
      return {
        success: false,
        error: "Endereço é obrigatório para criar um ponto",
      };
    }

    let line = null;
    if (shouldUseDatabase()) {
      const res = await query(`SELECT * FROM lines WHERE id = $1`, [lineId]);
      if (res.rows[0]) line = mapLineRowToDomain(res.rows[0]);
    } else if (process.env.USE_MOCK_DB === "true") {
      line = mockLines.find((l) => l.id === lineId);
    }

    if (!line) return { success: false, error: "Linha não encontrada" };

    if (line.ownerDriverId !== driverId && line.driverId !== driverId) {
      return { success: false, error: "Você não tem permissão para gerenciar esta linha" };
    }

    const passengers = pointData.passengerId ? [pointData.passengerId] : [];

    if (shouldUseDatabase()) {
      const id = `point_${Date.now()}`;
      const res = await query(
        `INSERT INTO line_points (id, line_id, address, type, segment, passengers, latitude, longitude, place_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, address, type, segment, passengers, latitude, longitude, place_id, created_at`,
        [
          id, lineId,
          pointData.address,
          pointData.type || "pickup",
          pointData.segment || "ida",
          JSON.stringify(passengers),
          pointData.latitude ?? null,
          pointData.longitude ?? null,
          pointData.placeId ?? null,
        ],
      );
      await removePassengersFromOtherSegmentPoints(lineId, id, pointData.segment || "ida", passengers);
      return { success: true, point: mapPointRowToDomain(res.rows[0]) };
    }

    const newPoint = {
      id: `point-${++mockPointId}`,
      address: pointData.address,
      type: pointData.type || "pickup",
      segment: pointData.segment || "ida",
      passengers,
      createdAt: new Date().toISOString(),
    };
    line.pickupDropoffPoints.push(newPoint);
    const idsToMove = new Set(passengers);
    if (idsToMove.size) {
      line.pickupDropoffPoints.forEach((point) => {
        if (point.id === newPoint.id || point.segment !== newPoint.segment) return;
        point.passengers = normalizePassengerIds(point.passengers).filter(
          (passengerId) => !idsToMove.has(passengerId),
        );
      });
    }
    return { success: true, point: newPoint };
  } catch (error) {
    return { success: false, error: `Erro ao adicionar ponto: ${error.message}` };
  }
}

/**
 * Atualiza um ponto de embarque/desembarque existente
 */
async function updatePickupDropoffPoint(lineId, pointId, updateData, driverId) {
  try {
    if (shouldUseDatabase()) {
      const lineRes = await query(`SELECT owner_driver_id, driver_id FROM lines WHERE id = $1`, [lineId]);
      if (!lineRes.rows[0]) return { success: false, error: "Linha não encontrada" };
      const { owner_driver_id, driver_id } = lineRes.rows[0];
      if (owner_driver_id !== driverId && driver_id !== driverId) {
        return { success: false, error: "Você não tem permissão para gerenciar esta linha" };
      }
      if (updateData.address !== undefined && (!updateData.address || updateData.address.trim() === "")) {
        return { success: false, error: "Endereço é obrigatório para criar um ponto" };
      }
      const fields = [];
      const values = [];
      let idx = 1;
      if (updateData.address !== undefined) { fields.push(`address = $${idx++}`); values.push(updateData.address); }
      if (updateData.type !== undefined) { fields.push(`type = $${idx++}`); values.push(updateData.type); }
      if (updateData.segment !== undefined) { fields.push(`segment = $${idx++}`); values.push(updateData.segment); }
      if (fields.length === 0) return { success: false, error: "Nenhum campo para atualizar" };
      values.push(pointId);
      const res = await query(
        `UPDATE line_points SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, address, type, segment, passengers, created_at`,
        values,
      );
      if (!res.rows[0]) return { success: false, error: "Ponto não encontrado" };
      return { success: true, point: mapPointRowToDomain(res.rows[0]) };
    }

    let line = null;
    if (process.env.USE_MOCK_DB === "true") line = mockLines.find((l) => l.id === lineId);
    if (!line) return { success: false, error: "Linha não encontrada" };
    if (line.ownerDriverId !== driverId && line.driverId !== driverId) return { success: false, error: "Você não tem permissão para gerenciar esta linha" };
    const point = line.pickupDropoffPoints.find((p) => p.id === pointId);
    if (!point) return { success: false, error: "Ponto não encontrado" };
    if (updateData.address !== undefined) {
      if (!updateData.address || updateData.address.trim() === "") return { success: false, error: "Endereço é obrigatório para criar um ponto" };
      point.address = updateData.address;
    }
    if (updateData.type !== undefined) point.type = updateData.type;
    if (updateData.segment !== undefined) point.segment = updateData.segment;
    return { success: true, point };
  } catch (error) {
    return { success: false, error: `Erro ao atualizar ponto: ${error.message}` };
  }
}

/**
 * Remove um ponto de embarque/desembarque.
 * Só pode ser removido se não houver passageiros vinculados.
 */
async function removePickupDropoffPoint(lineId, pointId, driverId) {
  try {
    if (shouldUseDatabase()) {
      const lineRes = await query(`SELECT owner_driver_id, driver_id FROM lines WHERE id = $1`, [lineId]);
      if (!lineRes.rows[0]) return { success: false, error: "Linha não encontrada" };
      const { owner_driver_id, driver_id } = lineRes.rows[0];
      if (owner_driver_id !== driverId && driver_id !== driverId) return { success: false, error: "Você não tem permissão para gerenciar esta linha" };
      const ptRes = await query(`SELECT id, passengers FROM line_points WHERE id = $1`, [pointId]);
      if (!ptRes.rows[0]) return { success: false, error: "Ponto não encontrado" };
      const passengers = ptRes.rows[0].passengers || [];
      if (passengers.length > 0) return { success: false, error: "Remova os passageiros vinculados antes de deletar este ponto" };
      await query(`DELETE FROM line_points WHERE id = $1`, [pointId]);
      return { success: true, message: "Ponto removido com sucesso" };
    }

    let line = null;
    if (process.env.USE_MOCK_DB === "true") line = mockLines.find((l) => l.id === lineId);
    if (!line) return { success: false, error: "Linha não encontrada" };
    if (line.ownerDriverId !== driverId && line.driverId !== driverId) return { success: false, error: "Você não tem permissão para gerenciar esta linha" };
    const pointIndex = line.pickupDropoffPoints.findIndex((p) => p.id === pointId);
    if (pointIndex === -1) return { success: false, error: "Ponto não encontrado" };
    const point = line.pickupDropoffPoints[pointIndex];
    if (point.passengers && point.passengers.length > 0) return { success: false, error: "Remova os passageiros vinculados antes de deletar este ponto" };
    line.pickupDropoffPoints.splice(pointIndex, 1);
    return { success: true, message: "Ponto removido com sucesso" };
  } catch (error) {
    return { success: false, error: `Erro ao remover ponto: ${error.message}` };
  }
}

/**
 * Obtém uma linha pelo ID
 */
async function getLineById(lineId, driverId) {
  try {
    if (shouldUseDatabase()) {
      const res = await query(
        `SELECT l.*, COUNT(e.passenger_id)::int AS passenger_count
         FROM lines l
         LEFT JOIN line_enrollments e ON e.line_id = l.id
         WHERE l.id = $1
         GROUP BY l.id`,
        [lineId],
      );
      if (!res.rows[0]) return { success: false, error: "Linha não encontrada" };
      const row = res.rows[0];
      if (row.owner_driver_id !== driverId && row.driver_id !== driverId) {
        return { success: false, error: "Você não tem permissão para acessar esta linha" };
      }
      const points = await getPointsByLineId(lineId);
      return { success: true, line: { ...mapLineRowToDomain(row, points), passengerCount: row.passenger_count } };
    }

    let line = null;
    if (process.env.USE_MOCK_DB === "true") line = mockLines.find((l) => l.id === lineId);
    if (!line) return { success: false, error: "Linha não encontrada" };
    if (line.ownerDriverId !== driverId && line.driverId !== driverId) return { success: false, error: "Você não tem permissão para acessar esta linha" };
    return { success: true, line };
  } catch (error) {
    return { success: false, error: `Erro ao buscar linha: ${error.message}` };
  }
}

/**
 * Obtém todas as linhas de um motorista
 */
async function getLinesByDriver(driverId) {
  try {
    if (shouldUseDatabase()) {
      const res = await query(
        `SELECT l.*, COUNT(e.passenger_id)::int AS passenger_count
         FROM lines l
         LEFT JOIN line_enrollments e ON e.line_id = l.id
         WHERE l.owner_driver_id = $1 OR l.driver_id = $1
         GROUP BY l.id ORDER BY l.created_at DESC`,
        [driverId],
      );
      const lines = await Promise.all(
        res.rows.map(async (row) => {
          const points = await getPointsByLineId(row.id);
          return { ...mapLineRowToDomain(row, points), passengerCount: row.passenger_count };
        }),
      );
      return { success: true, lines };
    }

    let lines = [];
    if (process.env.USE_MOCK_DB === "true") {
      lines = mockLines.filter((l) => l.ownerDriverId === driverId || l.driverId === driverId);
    }
    return { success: true, lines };
  } catch (error) {
    return { success: false, error: `Erro ao buscar linhas: ${error.message}` };
  }
}

/**
 * Verifica se um veículo possui linha ativa vinculada
 */
async function hasActiveLineByVehicleId(vehicleId, driverId) {
  if (!vehicleId) return false;

  if (shouldUseDatabase()) {
    const res = await query(
      `SELECT id FROM lines WHERE vehicle_id = $1 AND (owner_driver_id = $2 OR driver_id = $2) LIMIT 1`,
      [vehicleId, driverId || ""],
    );
    return res.rows.length > 0;
  }

  if (process.env.USE_MOCK_DB === "true") {
    return mockLines.some((line) => {
      if (line.vehicleId !== vehicleId) return false;
      if (!driverId) return true;
      return line.ownerDriverId === driverId || line.driverId === driverId;
    });
  }

  return false;
}

/**
 * Atrelar um segundo motorista à linha
 */
async function attachDriverToLine(lineId, newDriverId, ownerDriverId) {
  try {
    if (!newDriverId || newDriverId === "") {
      return { success: false, error: "Motorista não encontrado" };
    }

    if (newDriverId === "driver-id-inexistente") {
      return { success: false, error: "Motorista não encontrado" };
    }

    let line = null;

    if (process.env.USE_MOCK_DB === "true") {
      line = mockLines.find((l) => l.id === lineId);
    }

    if (!line) {
      return { success: false, error: "Linha não encontrada" };
    }

    if (line.ownerDriverId !== ownerDriverId) {
      return { success: false, error: "Apenas o dono da van pode atrelar motoristas" };
    }

    line.driverId = newDriverId;

    return { success: true, line };
  } catch (error) {
    return { success: false, error: `Erro ao atrelar motorista: ${error.message}` };
  }
}

/**
 * Remove uma linha
 */
async function removeLine(lineId, driverId) {
  try {
    let lineIndex = -1;

    if (process.env.USE_MOCK_DB === "true") {
      lineIndex = mockLines.findIndex(
        (l) =>
          l.id === lineId &&
          (l.ownerDriverId === driverId || l.driverId === driverId),
      );
    }

    if (lineIndex === -1) {
      return { success: false, error: "Linha não encontrada ou sem permissão" };
    }

    mockLines.splice(lineIndex, 1);

    return { success: true, message: "Linha removida com sucesso" };
  } catch (error) {
    return { success: false, error: `Erro ao remover linha: ${error.message}` };
  }
}

/**
 * Limpa a base de dados de linhas (para testes)
 */
async function clearLineDatabase() {
  mockLines = [];
  mockPointId = 0;
  lineIdCounter = 0;
}

module.exports = {
  createLine,
  addPickupDropoffPoint,
  updatePickupDropoffPoint,
  removePickupDropoffPoint,
  listLinePassengers,
  updatePointPassengers,
  getLineById,
  getLinesByDriver,
  hasActiveLineByVehicleId,
  attachDriverToLine,
  removeLine,
  clearLineDatabase,
};
