/**
 * RF2: Cadastro de Veículos
 * Testes automatizados para validação do cadastro de veículos por motoristas
 */

process.env.USE_MOCK_DB = "true";

const { createUser } = require("../services/authService");
const { clearDatabase } = require("../services/userService");
const {
  createVehicle,
  getVehiclesByDriver,
  clearVehicleDatabase,
} = require("../services/vehicleService");

describe("RF2: Cadastro de Veículos", () => {
  const validDriver = {
    name: "Carlos Motorista",
    cpf: "123.456.789-09",
    cnh: "12345678901",
    birthYear: 1988,
    email: "carlos.driver@example.com",
    password: "Driver@123",
    role: "DRIVER",
  };

  const validPassenger = {
    name: "Paula Passageira",
    cpf: "987.654.321-00",
    age: 23,
    email: "paula.passenger@example.com",
    password: "Pass@123",
    role: "PASSENGER",
  };

  const validVehicle = {
    plate: "ABC1D23",
    model: "Sprinter 415",
    year: 2019,
    capacity: 16,
  };

  beforeEach(async () => {
    await clearVehicleDatabase();
    await clearDatabase();
  });

  it("Cenário 2.1: deve cadastrar veículo com sucesso para motorista", async () => {
    const userResult = await createUser(validDriver);

    const result = await createVehicle(userResult.user.id, validVehicle);

    expect(result.success).toBe(true);
    expect(result.vehicle.id).toBeDefined();
    expect(result.vehicle.driverId).toBe(userResult.user.id);
    expect(result.vehicle.plate).toBe("ABC1D23");
    expect(result.vehicle.model).toBe(validVehicle.model);
    expect(result.vehicle.capacity).toBe(validVehicle.capacity);
  });

  it("deve bloquear cadastro para usuário que não é motorista", async () => {
    const userResult = await createUser(validPassenger);

    const result = await createVehicle(userResult.user.id, validVehicle);

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("deve rejeitar quando placa é inválida", async () => {
    const userResult = await createUser(validDriver);

    const result = await createVehicle(userResult.user.id, {
      ...validVehicle,
      plate: "12AB34",
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("INVALID_VEHICLE_PLATE");
    expect(result.error.field).toBe("plate");
  });

  it("deve rejeitar quando ano do veículo é inválido", async () => {
    const userResult = await createUser(validDriver);

    const result = await createVehicle(userResult.user.id, {
      ...validVehicle,
      year: 1970,
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("INVALID_VEHICLE_YEAR");
    expect(result.error.field).toBe("year");
  });

  it("deve rejeitar quando capacidade é inválida", async () => {
    const userResult = await createUser(validDriver);

    const result = await createVehicle(userResult.user.id, {
      ...validVehicle,
      capacity: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("INVALID_VEHICLE_CAPACITY");
    expect(result.error.field).toBe("capacity");
  });

  it("deve rejeitar placa duplicada", async () => {
    const driverOne = await createUser(validDriver);
    const driverTwo = await createUser({
      ...validDriver,
      email: "other.driver@example.com",
      cpf: "111.444.777-35",
      cnh: "10987654321",
    });

    await createVehicle(driverOne.user.id, validVehicle);
    const duplicated = await createVehicle(driverTwo.user.id, validVehicle);

    expect(duplicated.success).toBe(false);
    expect(duplicated.error.code).toBe("PLATE_ALREADY_EXISTS");
  });

  it("deve listar apenas veículos do motorista logado", async () => {
    const driverOne = await createUser(validDriver);
    const driverTwo = await createUser({
      ...validDriver,
      email: "third.driver@example.com",
      cpf: "529.982.247-25",
      cnh: "55443322119",
    });

    await createVehicle(driverOne.user.id, validVehicle);
    await createVehicle(driverTwo.user.id, {
      ...validVehicle,
      plate: "DEF2G34",
    });

    const result = await getVehiclesByDriver(driverOne.user.id);

    expect(result.success).toBe(true);
    expect(result.vehicles).toHaveLength(1);
    expect(result.vehicles[0].driverId).toBe(driverOne.user.id);
    expect(result.vehicles[0].plate).toBe("ABC1D23");
  });
});
