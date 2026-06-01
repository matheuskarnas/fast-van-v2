process.env.USE_MOCK_DB = "true";
const inviteService = require("../services/inviteService");
const lineService = require("../services/lineService");
const presenceService = require("../services/presenceService");
const { createUser, clearDatabase } = require("../services/authService");
const { createVehicle, clearVehicleDatabase } = require("../services/vehicleService");
const { clearDatabase: clearUserDatabase } = require("../services/userService");

describe("inviteService (mock)", () => {
  let driverId;
  let vehicleId;

  beforeEach(async () => {
    await lineService.clearLineDatabase();
    await clearVehicleDatabase();
    await clearUserDatabase();

    const driverResult = await createUser({
      name: "Motorista Invite",
      cpf: "123.456.789-09",
      cnh: "12345678901",
      birthDate: "1988-01-01T00:00:00.000Z",
      email: "invite.driver@example.com",
      password: "Driver@123",
      role: "DRIVER",
    });
    driverId = driverResult.user.id;

    const vehicleResult = await createVehicle(driverId, {
      plate: "INV1T23",
      model: "Sprinter",
      year: 2020,
      capacity: 16,
    });
    vehicleId = vehicleResult.vehicle.id;
  });

  test("cria e aceita um invite com sucesso", async () => {
    const create = await lineService.createLine(
      { originCity: "Cidade A", destinationPlace: "Destino B", vehicleId },
      driverId,
    );
    expect(create.success).toBe(true);
    const line = create.line;

    const pr = await presenceService.createPresenceLine({
      lineId: line.id,
      driverId,
      ownerDriverId: driverId,
      capacity: 16,
      nextDate: "2026-05-10",
      points: [],
    });
    expect(pr.success).toBe(true);

    const invite = await inviteService.createInvite(line.id, driverId);
    expect(invite.success).toBe(true);
    expect(invite.token).toBeDefined();
    expect(invite.url).toMatch(/invite/);

    const accept = await inviteService.acceptInvite(invite.token, "pass-1");
    expect(accept.success).toBe(true);
  });
});
