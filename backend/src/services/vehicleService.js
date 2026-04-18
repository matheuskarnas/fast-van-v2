const { query, shouldUseDatabase } = require("../config/database");
const { getUserById } = require("./userService");

const mockVehicleDatabase = {
  vehicles: [],
};

function normalizePlate(plate) {
  return String(plate || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function validateVehiclePlate(plate) {
  const normalized = normalizePlate(plate);
  const oldPattern = /^[A-Z]{3}[0-9]{4}$/;
  const mercosulPattern = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
  return oldPattern.test(normalized) || mercosulPattern.test(normalized);
}

function validateVehicleYear(year) {
  const numericYear = Number(year);
  const currentYear = new Date().getFullYear();
  return (
    Number.isInteger(numericYear) &&
    numericYear >= 1980 &&
    numericYear <= currentYear + 1
  );
}

function validateVehicleCapacity(capacity) {
  const numericCapacity = Number(capacity);
  return (
    Number.isInteger(numericCapacity) &&
    numericCapacity >= 1 &&
    numericCapacity <= 80
  );
}

function mapVehicleRowToDomain(row) {
  if (!row) return null;

  return {
    id: row.id,
    driverId: row.driver_id,
    plate: row.plate,
    model: row.model,
    year: row.year,
    capacity: row.capacity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findVehicleByPlate(plate) {
  const normalizedPlate = normalizePlate(plate);

  if (shouldUseDatabase()) {
    const result = await query(
      `
        SELECT id, driver_id, plate, model, year, capacity, created_at, updated_at
        FROM vehicles
        WHERE plate = $1
      `,
      [normalizedPlate],
    );

    return mapVehicleRowToDomain(result.rows[0]);
  }

  return (
    mockVehicleDatabase.vehicles.find(
      (vehicle) => vehicle.plate === normalizedPlate,
    ) || null
  );
}

async function createVehicle(driverId, vehicleData) {
  try {
    const driver = await getUserById(driverId);
    if (!driver) {
      return {
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          field: "driverId",
          message: "Usuário não encontrado",
        },
      };
    }

    if (driver.role !== "DRIVER") {
      return {
        success: false,
        error: {
          code: "FORBIDDEN_ROLE",
          field: "role",
          message: "Apenas motoristas podem cadastrar veículos",
        },
      };
    }

    const requiredFields = ["plate", "model", "year", "capacity"];
    for (const field of requiredFields) {
      if (
        vehicleData[field] === undefined ||
        vehicleData[field] === null ||
        String(vehicleData[field]).trim() === ""
      ) {
        return {
          success: false,
          error: {
            code: "MISSING_REQUIRED_FIELD",
            field,
            message: "Preencha todos os campos obrigatórios",
          },
        };
      }
    }

    if (!validateVehiclePlate(vehicleData.plate)) {
      return {
        success: false,
        error: {
          code: "INVALID_VEHICLE_PLATE",
          field: "plate",
          message: "Placa de veículo inválida",
        },
      };
    }

    if (!validateVehicleYear(vehicleData.year)) {
      return {
        success: false,
        error: {
          code: "INVALID_VEHICLE_YEAR",
          field: "year",
          message: "Ano do veículo inválido",
        },
      };
    }

    if (!validateVehicleCapacity(vehicleData.capacity)) {
      return {
        success: false,
        error: {
          code: "INVALID_VEHICLE_CAPACITY",
          field: "capacity",
          message: "Capacidade do veículo deve estar entre 1 e 80",
        },
      };
    }

    const existingVehicle = await findVehicleByPlate(vehicleData.plate);
    if (existingVehicle) {
      return {
        success: false,
        error: {
          code: "PLATE_ALREADY_EXISTS",
          field: "plate",
          message: "Já existe veículo cadastrado com essa placa",
        },
      };
    }

    const normalizedPlate = normalizePlate(vehicleData.plate);

    if (shouldUseDatabase()) {
      const vehicleId = `vehicle_${Date.now()}`;
      const result = await query(
        `
          INSERT INTO vehicles (id, driver_id, plate, model, year, capacity)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, driver_id, plate, model, year, capacity, created_at, updated_at
        `,
        [
          vehicleId,
          driverId,
          normalizedPlate,
          vehicleData.model,
          Number(vehicleData.year),
          Number(vehicleData.capacity),
        ],
      );

      return {
        success: true,
        vehicle: mapVehicleRowToDomain(result.rows[0]),
      };
    }

    const newVehicle = {
      id: `vehicle_${Date.now()}`,
      driverId,
      plate: normalizedPlate,
      model: vehicleData.model,
      year: Number(vehicleData.year),
      capacity: Number(vehicleData.capacity),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockVehicleDatabase.vehicles.push(newVehicle);

    return {
      success: true,
      vehicle: newVehicle,
    };
  } catch (error) {
    console.error("Error creating vehicle:", error);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Erro ao cadastrar veículo. Tente novamente.",
      },
    };
  }
}

async function getVehiclesByDriver(driverId) {
  try {
    if (shouldUseDatabase()) {
      const result = await query(
        `
          SELECT id, driver_id, plate, model, year, capacity, created_at, updated_at
          FROM vehicles
          WHERE driver_id = $1
          ORDER BY created_at DESC
        `,
        [driverId],
      );

      return {
        success: true,
        vehicles: result.rows.map(mapVehicleRowToDomain),
      };
    }

    const vehicles = mockVehicleDatabase.vehicles.filter(
      (vehicle) => vehicle.driverId === driverId,
    );
    return {
      success: true,
      vehicles,
    };
  } catch (error) {
    console.error("Error listing vehicles:", error);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Erro ao buscar veículos. Tente novamente.",
      },
    };
  }
}

async function clearVehicleDatabase() {
  if (shouldUseDatabase()) {
    await query("TRUNCATE TABLE vehicles");
    return;
  }

  mockVehicleDatabase.vehicles = [];
}

module.exports = {
  createVehicle,
  getVehiclesByDriver,
  clearVehicleDatabase,
  validateVehiclePlate,
  validateVehicleYear,
  validateVehicleCapacity,
};
