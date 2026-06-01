/**
 * Serviço de Linhas (Rotas)
 * Responsável pela criação, atualização e gerenciamento de linhas de transporte
 */

// Lazy require em createLine para evitar dependência circular com vehicleService

let mockLines = [];
let mockPointId = 0;
let lineIdCounter = 0;

/**
 * Cria uma nova linha de transporte
 */
async function createLine(lineData, ownerDriverId) {
  try {
    if (!lineData.originCity || lineData.originCity.trim() === "") {
      return {
        success: false,
        error: "Cidade de origem é obrigatória",
      };
    }

    if (!lineData.destinationPlace || lineData.destinationPlace.trim() === "") {
      return {
        success: false,
        error: "Ponto de destino é obrigatório",
      };
    }

    if (!lineData.vehicleId) {
      return {
        success: false,
        error: "Você deve cadastrar um veículo antes de criar uma linha",
      };
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
      vehicleId: lineData.vehicleId,
      originCity: lineData.originCity,
      destinationPlace: lineData.destinationPlace,
      ownerDriverId,
      driverId: lineData.driverId || null,
      departureTime: lineData.departureTime || null,
      arrivalTime: lineData.arrivalTime || null,
      returnTime: lineData.returnTime || null,
      pickupDropoffPoints: [],
      capacity: vehicleCapacity,
      createdAt: new Date().toISOString(),
    };

    if (process.env.USE_MOCK_DB === "true") {
      mockLines.push(newLine);
    }

    return {
      success: true,
      line: newLine,
    };
  } catch (error) {
    return {
      success: false,
      error: `Erro ao criar linha: ${error.message}`,
    };
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
    if (process.env.USE_MOCK_DB === "true") {
      line = mockLines.find((l) => l.id === lineId);
    }

    if (!line) {
      return {
        success: false,
        error: "Linha não encontrada",
      };
    }

    if (line.ownerDriverId !== driverId && line.driverId !== driverId) {
      return {
        success: false,
        error: "Você não tem permissão para gerenciar esta linha",
      };
    }

    const passengers = pointData.passengerId ? [pointData.passengerId] : [];

    const newPoint = {
      id: `point-${++mockPointId}`,
      address: pointData.address,
      type: pointData.type || "pickup",
      passengers,
      createdAt: new Date().toISOString(),
    };

    line.pickupDropoffPoints.push(newPoint);

    return {
      success: true,
      point: newPoint,
    };
  } catch (error) {
    return {
      success: false,
      error: `Erro ao adicionar ponto: ${error.message}`,
    };
  }
}

/**
 * Atualiza um ponto de embarque/desembarque existente
 */
async function updatePickupDropoffPoint(lineId, pointId, updateData, driverId) {
  try {
    let line = null;
    if (process.env.USE_MOCK_DB === "true") {
      line = mockLines.find((l) => l.id === lineId);
    }

    if (!line) {
      return { success: false, error: "Linha não encontrada" };
    }

    if (line.ownerDriverId !== driverId && line.driverId !== driverId) {
      return { success: false, error: "Você não tem permissão para gerenciar esta linha" };
    }

    const point = line.pickupDropoffPoints.find((p) => p.id === pointId);

    if (!point) {
      return { success: false, error: "Ponto não encontrado" };
    }

    if (updateData.address !== undefined) {
      if (!updateData.address || updateData.address.trim() === "") {
        return { success: false, error: "Endereço é obrigatório para criar um ponto" };
      }
      point.address = updateData.address;
    }

    if (updateData.type !== undefined) {
      point.type = updateData.type;
    }

    return {
      success: true,
      point,
    };
  } catch (error) {
    return {
      success: false,
      error: `Erro ao atualizar ponto: ${error.message}`,
    };
  }
}

/**
 * Remove um ponto de embarque/desembarque.
 * Só pode ser removido se não houver passageiros vinculados.
 */
async function removePickupDropoffPoint(lineId, pointId, driverId) {
  try {
    let line = null;
    if (process.env.USE_MOCK_DB === "true") {
      line = mockLines.find((l) => l.id === lineId);
    }

    if (!line) {
      return { success: false, error: "Linha não encontrada" };
    }

    if (line.ownerDriverId !== driverId && line.driverId !== driverId) {
      return { success: false, error: "Você não tem permissão para gerenciar esta linha" };
    }

    const pointIndex = line.pickupDropoffPoints.findIndex((p) => p.id === pointId);

    if (pointIndex === -1) {
      return { success: false, error: "Ponto não encontrado" };
    }

    const point = line.pickupDropoffPoints[pointIndex];

    if (point.passengers && point.passengers.length > 0) {
      return {
        success: false,
        error: "Remova os passageiros vinculados antes de deletar este ponto",
      };
    }

    line.pickupDropoffPoints.splice(pointIndex, 1);

    return {
      success: true,
      message: "Ponto removido com sucesso",
    };
  } catch (error) {
    return {
      success: false,
      error: `Erro ao remover ponto: ${error.message}`,
    };
  }
}

/**
 * Obtém uma linha pelo ID
 */
async function getLineById(lineId, driverId) {
  try {
    let line = null;

    if (process.env.USE_MOCK_DB === "true") {
      line = mockLines.find((l) => l.id === lineId);
    }

    if (!line) {
      return { success: false, error: "Linha não encontrada" };
    }

    if (line.ownerDriverId !== driverId && line.driverId !== driverId) {
      return { success: false, error: "Você não tem permissão para acessar esta linha" };
    }

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
    let lines = [];

    if (process.env.USE_MOCK_DB === "true") {
      lines = mockLines.filter(
        (l) => l.ownerDriverId === driverId || l.driverId === driverId,
      );
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
  getLineById,
  getLinesByDriver,
  hasActiveLineByVehicleId,
  attachDriverToLine,
  removeLine,
  clearLineDatabase,
};
