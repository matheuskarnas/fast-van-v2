/**
 * RF2: Cadastro e Gerenciamento de Rotas (Linhas)
 * Testes automatizados para validação de criação e gerenciamento de linhas por motoristas
 */

process.env.USE_MOCK_DB = "true";

const { createUser } = require("../services/authService");
const { clearDatabase } = require("../services/userService");
const {
  createVehicle,
  clearVehicleDatabase,
} = require("../services/vehicleService");
const {
  createLine,
  addPickupDropoffPoint,
  updatePickupDropoffPoint,
  removePickupDropoffPoint,
  removeLine,
  getLinesByDriver,
  getLineById,
  attachDriverToLine,
  clearLineDatabase,
} = require("../services/lineService");
const { createInvite } = require("../services/inviteService");

describe("RF2: Cadastro e Gerenciamento de Rotas (Linhas)", () => {
  const driverOwner = {
    name: "João Dono da Van",
    cpf: "123.456.789-09",
    cnh: "12345678901",
    birthDate: "1988-01-01T00:00:00.000Z",
    email: "joao.owner@example.com",
    password: "Driver@123",
    role: "DRIVER",
  };

  const driverOperator = {
    name: "Pedro Motorista Operador",
    cpf: "987.654.321-00",
    cnh: "98765432100",
    birthDate: "1990-01-01T00:00:00.000Z",
    email: "pedro.operator@example.com",
    password: "Driver@123",
    role: "DRIVER",
  };

  const validVehicle = {
    plate: "ABC1D23",
    model: "Sprinter 415",
    year: 2019,
    capacity: 16,
  };

  const validLineData = {
    originCity: "Caçapava",
    destinationPlace: "Fatec-SJC",
  };

  let driverOwnerId;
  let driverOperatorId;
  let vehicleId;

  beforeEach(async () => {
    await clearLineDatabase();
    await clearVehicleDatabase();
    await clearDatabase();

    const ownerResult = await createUser(driverOwner);
    if (!ownerResult.success) {
      throw new Error(`Erro ao criar motorista dono: ${ownerResult.error.message}`);
    }
    driverOwnerId = ownerResult.user.id;

    const operatorResult = await createUser(driverOperator);
    if (!operatorResult.success) {
      throw new Error(`Erro ao criar motorista operador: ${operatorResult.error.message}`);
    }
    driverOperatorId = operatorResult.user.id;

    const vehicleResult = await createVehicle(driverOwnerId, validVehicle);
    if (!vehicleResult.success) {
      const errorMsg =
        typeof vehicleResult.error === "object"
          ? JSON.stringify(vehicleResult.error)
          : vehicleResult.error;
      throw new Error(`Erro ao criar veículo: ${errorMsg}`);
    }
    vehicleId = vehicleResult.vehicle.id;
  });

  // ===== CENÁRIOS DE SUCESSO =====

  describe("Cenários de Sucesso", () => {
    it("Cenário 2.10: deve criar linha com dados mínimos (sem pontos de embarque)", async () => {
      const lineResult = await createLine(
        {
          vehicleId,
          originCity: validLineData.originCity,
          destinationPlace: validLineData.destinationPlace,
        },
        driverOwnerId,
      );

      expect(lineResult.success).toBe(true);
      expect(lineResult.line).toBeDefined();
      expect(lineResult.line.vehicleId).toBe(vehicleId);
      expect(lineResult.line.originCity).toBe(validLineData.originCity);
      expect(lineResult.line.destinationPlace).toBe(validLineData.destinationPlace);
      expect(lineResult.line.ownerDriverId).toBe(driverOwnerId);
      expect(lineResult.line.driverId).toBeNull();
      expect(lineResult.line.pickupDropoffPoints).toEqual([]);
      expect(lineResult.line.capacity).toBe(validVehicle.capacity);
    });

    it("Cenário 2.11: deve atrelar segundo motorista à linha", async () => {
      const lineResult = await createLine(
        {
          vehicleId,
          originCity: validLineData.originCity,
          destinationPlace: validLineData.destinationPlace,
        },
        driverOwnerId,
      );

      const lineId = lineResult.line.id;

      const attachResult = await attachDriverToLine(
        lineId,
        driverOperatorId,
        driverOwnerId,
      );

      expect(attachResult.success).toBe(true);
      expect(attachResult.line.driverId).toBe(driverOperatorId);

      const fetchedLine = await getLineById(lineId, driverOperatorId);
      expect(fetchedLine.success).toBe(true);
      expect(fetchedLine.line.driverId).toBe(driverOperatorId);
    });

    it("Cenário 2.12: deve adicionar ponto de embarque com endereço e tipo (sem horário)", async () => {
      const lineResult = await createLine(
        {
          vehicleId,
          originCity: validLineData.originCity,
          destinationPlace: validLineData.destinationPlace,
        },
        driverOwnerId,
      );

      const lineId = lineResult.line.id;

      const pointData = {
        address: "Rua das Flores, 100 - Caçapava",
        type: "pickup",
        passengerId: "passenger-1",
      };

      const pointResult = await addPickupDropoffPoint(
        lineId,
        pointData,
        driverOwnerId,
      );

      expect(pointResult.success).toBe(true);
      expect(pointResult.point).toBeDefined();
      expect(pointResult.point.address).toBe(pointData.address);
      expect(pointResult.point.type).toBe("pickup");
      expect(pointResult.point.passengers).toContain("passenger-1");
    });

    it("Cenário 2.13: deve adicionar múltiplos pontos conforme passageiros entram", async () => {
      const lineResult = await createLine(
        {
          vehicleId,
          originCity: validLineData.originCity,
          destinationPlace: validLineData.destinationPlace,
        },
        driverOwnerId,
      );

      const lineId = lineResult.line.id;

      const point1 = { address: "Ponto A - Caçapava", type: "pickup", passengerId: "passenger-1" };
      const point2 = { address: "Ponto B - Jacareí", type: "pickup", passengerId: "passenger-2" };
      const dropoff = { address: "Fatec-SJC", type: "dropoff", passengerId: "passenger-1" };

      const result1 = await addPickupDropoffPoint(lineId, point1, driverOwnerId);
      const result2 = await addPickupDropoffPoint(lineId, point2, driverOwnerId);
      const result3 = await addPickupDropoffPoint(lineId, dropoff, driverOwnerId);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);

      const line = await getLineById(lineId, driverOwnerId);
      expect(line.line.pickupDropoffPoints.length).toBe(3);
    });

    it("Cenário 2.14: deve gerar link de convite para passageiro via inviteService", async () => {
      const lineResult = await createLine(
        {
          vehicleId,
          originCity: validLineData.originCity,
          destinationPlace: validLineData.destinationPlace,
        },
        driverOwnerId,
      );

      const lineId = lineResult.line.id;

      const inviteResult = await createInvite(lineId, driverOwnerId);

      expect(inviteResult.success).toBe(true);
      expect(inviteResult.token).toBeDefined();
      expect(inviteResult.url).toBeDefined();
      expect(inviteResult.expiresAt).toBeDefined();
    });

    it("Cenário 2.15: deve editar ponto de embarque/desembarque", async () => {
      const lineResult = await createLine(
        {
          vehicleId,
          originCity: validLineData.originCity,
          destinationPlace: validLineData.destinationPlace,
        },
        driverOwnerId,
      );

      const lineId = lineResult.line.id;

      const addResult = await addPickupDropoffPoint(
        lineId,
        { address: "Endereço Original", type: "pickup", passengerId: "passenger-1" },
        driverOwnerId,
      );

      const pointId = addResult.point.id;

      const updateResult = await updatePickupDropoffPoint(
        lineId,
        pointId,
        { address: "Endereço Atualizado", type: "dropoff" },
        driverOwnerId,
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.point.address).toBe("Endereço Atualizado");
      expect(updateResult.point.type).toBe("dropoff");
    });

    it("Cenário 2.16: deve remover ponto sem passageiros vinculados", async () => {
      const lineResult = await createLine(
        {
          vehicleId,
          originCity: validLineData.originCity,
          destinationPlace: validLineData.destinationPlace,
        },
        driverOwnerId,
      );

      const lineId = lineResult.line.id;

      const addResult = await addPickupDropoffPoint(
        lineId,
        { address: "Ponto Temporário", type: "pickup" },
        driverOwnerId,
      );

      const pointId = addResult.point.id;

      const removeResult = await removePickupDropoffPoint(
        lineId,
        pointId,
        driverOwnerId,
      );

      expect(removeResult.success).toBe(true);

      const line = await getLineById(lineId, driverOwnerId);
      const removed = line.line.pickupDropoffPoints.find((p) => p.id === pointId);
      expect(removed).toBeUndefined();
    });

    it("Cenário 2.17: deve listar múltiplas linhas do motorista", async () => {
      await createLine(
        { vehicleId, originCity: "Caçapava", destinationPlace: "Fatec-SJC" },
        driverOwnerId,
      );

      await createLine(
        { vehicleId, originCity: "Caçapava", destinationPlace: "Centro-SP" },
        driverOwnerId,
      );

      const lines = await getLinesByDriver(driverOwnerId);

      expect(lines.success).toBe(true);
      expect(lines.lines.length).toBe(2);
      expect(lines.lines[0].originCity).toBe("Caçapava");
      expect(lines.lines[1].destinationPlace).toBe("Centro-SP");
    });
  });

  // ===== CENÁRIOS DE ERRO =====

  describe("Cenários de Erro", () => {
    it("Cenário 2.18: motorista sem veículo não pode criar linha", async () => {
      const newDriverResult = await createUser({
        name: "Novo Motorista",
        cpf: "111.444.777-35",
        cnh: "12312312345",
        birthDate: "1985-01-01T00:00:00.000Z",
        email: "novo.driver@example.com",
        password: "Driver@123",
        role: "DRIVER",
      });

      const newDriverId = newDriverResult.user.id;

      const lineResult = await createLine(
        {
          vehicleId: null,
          originCity: validLineData.originCity,
          destinationPlace: validLineData.destinationPlace,
        },
        newDriverId,
      );

      expect(lineResult.success).toBe(false);
      expect(lineResult.error).toContain("veículo");
    });

    it("Cenário 2.19: não pode criar linha sem origem e destino", async () => {
      const lineResult = await createLine(
        { vehicleId, originCity: "", destinationPlace: "" },
        driverOwnerId,
      );

      expect(lineResult.success).toBe(false);
      expect(lineResult.error).toContain("origem");
    });

    it("Cenário 2.20: veículo de outro motorista deve ser rejeitado", async () => {
      const otherDriverResult = await createUser({
        name: "Outro Motorista",
        cpf: "222.333.444-05",
        cnh: "22233344405",
        birthDate: "1992-01-01T00:00:00.000Z",
        email: "outro.driver@example.com",
        password: "Driver@123",
        role: "DRIVER",
      });

      const otherDriverId = otherDriverResult.user.id;

      const lineResult = await createLine(
        {
          vehicleId,
          originCity: validLineData.originCity,
          destinationPlace: validLineData.destinationPlace,
        },
        otherDriverId,
      );

      expect(lineResult.success).toBe(false);
      expect(lineResult.error).toMatch(/veículo|pertence|não encontrado/i);
    });

    it("Cenário 2.21: ponto sem endereço não pode ser adicionado", async () => {
      const lineResult = await createLine(
        {
          vehicleId,
          originCity: validLineData.originCity,
          destinationPlace: validLineData.destinationPlace,
        },
        driverOwnerId,
      );

      const lineId = lineResult.line.id;

      const result = await addPickupDropoffPoint(
        lineId,
        { address: "", type: "pickup", passengerId: "passenger-1" },
        driverOwnerId,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("obrigatório");
    });

    it("Cenário 2.22: não pode remover ponto com passageiros vinculados", async () => {
      const lineResult = await createLine(
        {
          vehicleId,
          originCity: validLineData.originCity,
          destinationPlace: validLineData.destinationPlace,
        },
        driverOwnerId,
      );

      const lineId = lineResult.line.id;

      const addResult = await addPickupDropoffPoint(
        lineId,
        { address: "Ponto com Passageiro", type: "pickup", passengerId: "passenger-1" },
        driverOwnerId,
      );

      const pointId = addResult.point.id;

      const removeResult = await removePickupDropoffPoint(
        lineId,
        pointId,
        driverOwnerId,
      );

      expect(removeResult.success).toBe(false);
      expect(removeResult.error).toMatch(/passageiros|vinculados/i);
    });

    it("Cenário 2.23: motorista não autorizado não pode gerenciar linha", async () => {
      const lineResult = await createLine(
        {
          vehicleId,
          originCity: validLineData.originCity,
          destinationPlace: validLineData.destinationPlace,
        },
        driverOwnerId,
      );

      const lineId = lineResult.line.id;

      const unauthorizedResult = await getLineById(lineId, driverOperatorId);

      expect(unauthorizedResult.success).toBe(false);
      expect(unauthorizedResult.error).toContain("permissão");
    });

    it("Cenário 2.24: motorista inválido não pode ser atrelado à linha", async () => {
      const lineResult = await createLine(
        {
          vehicleId,
          originCity: validLineData.originCity,
          destinationPlace: validLineData.destinationPlace,
        },
        driverOwnerId,
      );

      const lineId = lineResult.line.id;

      const attachResult = await attachDriverToLine(
        lineId,
        "driver-id-inexistente",
        driverOwnerId,
      );

      expect(attachResult.success).toBe(false);
      expect(attachResult.error).toContain("não encontrado");
    });
  });
});
