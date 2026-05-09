process.env.USE_MOCK_DB = "true";

const inviteService = require("../services/inviteService");
const lineService = require("../services/lineService");
const presenceService = require("../services/presenceService");

describe("inviteService (mock)", () => {
  beforeEach(async () => {
    // limpar linhas mock
    await lineService.clearLineDatabase();
  });

  test("cria e aceita um invite com sucesso", async () => {
    // criar linha pelo owner
    const create = await lineService.createLine(
      { originCity: "Cidade A", destinationPlace: "Destino B", vehicleId: "veh-1" },
      "driver-1",
    );

    expect(create.success).toBe(true);
    const line = create.line;

    // registrar presença (mock) para que presenceService conheça a linha
    const pr = await presenceService.createPresenceLine({
      lineId: line.id,
      driverId: "driver-1",
      ownerDriverId: "driver-1",
      capacity: 16,
      nextDate: "2026-05-10",
      points: [],
    });

    expect(pr.success).toBe(true);

    const invite = await inviteService.createInvite(line.id, "driver-1");
    expect(invite.success).toBe(true);
    expect(invite.token).toBeDefined();
    expect(invite.url).toMatch(/invite/);

    const accept = await inviteService.acceptInvite(invite.token, "pass-1");
    expect(accept.success).toBe(true);
  });
});
