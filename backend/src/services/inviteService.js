const crypto = require("crypto");
const lineService = require("./lineService");
const presenceService = require("./presenceService");

// Mock in-memory store para invites (apenas para modo de desenvolvimento/testes)
const mockInvites = {};

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

async function createInvite(lineId, driverId, options = {}) {
  try {
    // Verificar se o motorista tem permissão sobre a linha
    const lineResult = await lineService.getLineById(lineId, driverId);
    if (!lineResult.success) {
      return { success: false, error: "Linha não encontrada ou sem permissão" };
    }

    const token = generateToken();
    const now = new Date();
    const expiresInHours = options.expiresInHours || 72;
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

    mockInvites[token] = {
      lineId,
      createdBy: driverId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const baseUrl = process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl.replace(/\/$/, "")}/invite/${token}`;

    return {
      success: true,
      token,
      url: inviteUrl,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    return { success: false, error: `Erro ao criar invite: ${error.message}` };
  }
}

async function getInvite(token) {
  const invite = mockInvites[token];
  if (!invite) {
    return { success: false, error: "Invite não encontrado" };
  }

  // verificar expiração
  const now = new Date();
  if (new Date(invite.expiresAt) < now) {
    return { success: false, error: "Invite expirado" };
  }

  return { success: true, invite };
}

async function acceptInvite(token, passengerId) {
  try {
    const lookup = await getInvite(token);
    if (!lookup.success) return lookup;

    const { lineId } = lookup.invite;

    // Tenta adicionar o passageiro à linha via presenceService
    const result = await presenceService.addPassengerToLine(lineId, passengerId, null);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: `Erro ao aceitar invite: ${error.message}` };
  }
}

module.exports = {
  createInvite,
  getInvite,
  acceptInvite,
  // expose mock for tests
  __internal: {
    mockInvites,
  },
};
