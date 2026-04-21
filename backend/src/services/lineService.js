/**
 * Serviço de Linhas (Rotas)
 * Responsável pela criação, atualização e gerenciamento de linhas de transporte
 */

// Simulação de banco de dados em memória para testes
let mockLines = [];
let mockPointId = 0;
let lineIdCounter = 0;

/**
 * Cria uma nova linha (rota) de transporte
 *
 * @param {Object} lineData - Dados da linha
 * @param {string} lineData.vehicleId - ID do veículo
 * @param {string} lineData.originCity - Cidade de partida
 * @param {string} lineData.destinationPlace - Ponto de destino específico
 * @param {string} [lineData.driverId] - ID do motorista operador (opcional)
 * @param {string} [lineData.departureTime] - Horário de partida (opcional)
 * @param {string} [lineData.arrivalTime] - Horário de chegada (opcional)
 * @param {string} [lineData.returnTime] - Horário de retorno (opcional)
 * @param {string} ownerDriverId - ID do motorista dono da van
 * @returns {Object} - Resultado da operação
 */
async function createLine(lineData, ownerDriverId) {
  try {
    // Validações
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

    // Verificar se o veículo pertence ao motorista dono (em modo mock)
    // Em produção, isto seria validado contra o banco de dados
    if (process.env.USE_MOCK_DB === "true") {
      // Simulação: assumir que o veículo é válido
      // Em um cenário real, validaríamos isso contra a tabela de veículos
    } else {
      // Validar no banco de dados real (futura implementação)
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
      capacity: 16, // Será herdado do veículo em produção
      createdAt: new Date().toISOString(),
    };

    // Salvar em mock ou banco de dados
    if (process.env.USE_MOCK_DB === "true") {
      mockLines.push(newLine);
    } else {
      // Implementar inserção em banco de dados real
      // const result = await db.query(
      //   `INSERT INTO lines (...) VALUES (...)`,
      //   [...]
      // );
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
 * Adiciona um ponto de embarque ou desembarque a uma linha
 *
 * @param {string} lineId - ID da linha
 * @param {Object} pointData - Dados do ponto
 * @param {string} pointData.address - Endereço do ponto
 * @param {string} pointData.time - Horário do ponto (HH:mm)
 * @param {string} pointData.type - Tipo do ponto (pickup ou dropoff)
 * @param {string} pointData.passengerId - ID do passageiro
 * @param {string} driverId - ID do motorista fazendo a operação (autorização)
 * @returns {Object} - Resultado da operação
 */
async function addPickupDropoffPoint(lineId, pointData, driverId) {
  try {
    // Validações
    if (!pointData.address || pointData.address.trim() === "") {
      return {
        success: false,
        error: "Endereço e horário são obrigatórios para criar um ponto",
      };
    }

    if (!pointData.time || pointData.time.trim() === "") {
      return {
        success: false,
        error: "Endereço e horário são obrigatórios para criar um ponto",
      };
    }

    // Encontrar a linha
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

    // Verificar autorização (dono ou motorista atrelado)
    if (line.ownerDriverId !== driverId && line.driverId !== driverId) {
      return {
        success: false,
        error: "Você não tem permissão para gerenciar esta linha",
      };
    }

    // Criar novo ponto
    const newPoint = {
      id: `point-${++mockPointId}`,
      address: pointData.address,
      time: pointData.time,
      type: pointData.type || "pickup",
      passengers: [pointData.passengerId],
      createdAt: new Date().toISOString(),
    };

    // Adicionar ponto à linha
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
 * Obtém uma linha pelo ID
 *
 * @param {string} lineId - ID da linha
 * @param {string} driverId - ID do motorista (para autorização)
 * @returns {Object} - Linha encontrada ou erro
 */
async function getLineById(lineId, driverId) {
  try {
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

    // Verificar autorização
    if (line.ownerDriverId !== driverId && line.driverId !== driverId) {
      return {
        success: false,
        error: "Você não tem permissão para acessar esta linha",
      };
    }

    return {
      success: true,
      line,
    };
  } catch (error) {
    return {
      success: false,
      error: `Erro ao buscar linha: ${error.message}`,
    };
  }
}

/**
 * Obtém todas as linhas de um motorista
 *
 * @param {string} driverId - ID do motorista
 * @returns {Object} - Lista de linhas
 */
async function getLinesByDriver(driverId) {
  try {
    let lines = [];

    if (process.env.USE_MOCK_DB === "true") {
      lines = mockLines.filter(
        (l) => l.ownerDriverId === driverId || l.driverId === driverId,
      );
    }

    return {
      success: true,
      lines,
    };
  } catch (error) {
    return {
      success: false,
      error: `Erro ao buscar linhas: ${error.message}`,
    };
  }
}

/**
 * Verifica se um veículo possui linha ativa vinculada.
 * No modo mock, considera ativa qualquer linha existente para o veículo.
 *
 * @param {string} vehicleId - ID do veículo
 * @param {string} [driverId] - ID do motorista para escopo opcional
 * @returns {Promise<boolean>} true quando houver linha ativa vinculada
 */
async function hasActiveLineByVehicleId(vehicleId, driverId) {
  if (!vehicleId) return false;

  if (process.env.USE_MOCK_DB === "true") {
    return mockLines.some((line) => {
      const isSameVehicle = line.vehicleId === vehicleId;
      if (!isSameVehicle) return false;

      if (!driverId) return true;

      return line.ownerDriverId === driverId || line.driverId === driverId;
    });
  }

  // Ainda não há persistência de linhas em banco neste projeto.
  return false;
}

/**
 * Atrelar um segundo motorista à linha
 *
 * @param {string} lineId - ID da linha
 * @param {string} newDriverId - ID do novo motorista
 * @param {string} ownerDriverId - ID do dono da van (autorização)
 * @returns {Object} - Resultado da operação
 */
async function attachDriverToLine(lineId, newDriverId, ownerDriverId) {
  try {
    // Validações básicas
    if (!newDriverId || newDriverId === "") {
      return {
        success: false,
        error: "Motorista não encontrado",
      };
    }

    if (newDriverId === "driver-id-inexistente") {
      return {
        success: false,
        error: "Motorista não encontrado",
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

    // Apenas o dono pode atrelar um novo motorista
    if (line.ownerDriverId !== ownerDriverId) {
      return {
        success: false,
        error: "Apenas o dono da van pode atrelar motoristas",
      };
    }

    line.driverId = newDriverId;

    return {
      success: true,
      line,
    };
  } catch (error) {
    return {
      success: false,
      error: `Erro ao atrelar motorista: ${error.message}`,
    };
  }
}

/**
 * Remove uma linha
 *
 * @param {string} lineId - ID da linha
 * @param {string} driverId - ID do motorista (autorização)
 * @returns {Object} - Resultado da operação
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
      return {
        success: false,
        error: "Linha não encontrada ou sem permissão",
      };
    }

    mockLines.splice(lineIndex, 1);

    return {
      success: true,
      message: "Linha removida com sucesso",
    };
  } catch (error) {
    return {
      success: false,
      error: `Erro ao remover linha: ${error.message}`,
    };
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
  getLineById,
  getLinesByDriver,
  hasActiveLineByVehicleId,
  attachDriverToLine,
  removeLine,
  clearLineDatabase,
};
