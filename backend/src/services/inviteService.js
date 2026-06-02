const crypto = require("crypto");
const { query, shouldUseDatabase } = require("../config/database");
const lineService = require("./lineService");

const mockInvites = {};

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

async function createInvite(lineId, driverId, options = {}) {
  try {
    const lineResult = await lineService.getLineById(lineId, driverId);
    if (!lineResult.success) {
      return { success: false, error: "Linha não encontrada ou sem permissão" };
    }

    const token = generateToken();
    const expiresInHours = options.expiresInHours || 72;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    if (shouldUseDatabase()) {
      await query(
        `INSERT INTO invites (token, line_id, created_by, expires_at) VALUES ($1, $2, $3, $4)`,
        [token, lineId, driverId, expiresAt.toISOString()],
      );
    } else {
      mockInvites[token] = {
        lineId,
        createdBy: driverId,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
    }

    const baseUrl = process.env.APP_URL || process.env.FRONTEND_URL || "fastvanmobile://invite";
    const url = `${baseUrl.replace(/\/$/, "")}/${token}`;

    return { success: true, token, url, expiresAt: expiresAt.toISOString() };
  } catch (error) {
    return { success: false, error: `Erro ao criar invite: ${error.message}` };
  }
}

async function getInvite(token) {
  try {
    if (shouldUseDatabase()) {
      const res = await query(
        `SELECT token, line_id, created_by, expires_at FROM invites WHERE token = $1`,
        [token],
      );
      if (!res.rows[0]) return { success: false, error: "Invite não encontrado" };
      const row = res.rows[0];
      if (new Date(row.expires_at) < new Date()) return { success: false, error: "Invite expirado" };
      return { success: true, invite: { lineId: row.line_id, createdBy: row.created_by, expiresAt: row.expires_at } };
    }

    const invite = mockInvites[token];
    if (!invite) return { success: false, error: "Invite não encontrado" };
    if (new Date(invite.expiresAt) < new Date()) return { success: false, error: "Invite expirado" };
    return { success: true, invite };
  } catch (error) {
    return { success: false, error: `Erro ao buscar invite: ${error.message}` };
  }
}

async function acceptInvite(token, passengerId) {
  try {
    const lookup = await getInvite(token);
    if (!lookup.success) return lookup;

    const { lineId } = lookup.invite;

    if (shouldUseDatabase()) {
      await query(
        `INSERT INTO line_enrollments (id, line_id, passenger_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (line_id, passenger_id) DO NOTHING`,
        [`enroll_${Date.now()}`, lineId, passengerId],
      );
    } else {
      const { addPassengerToLine } = require("./presenceService");
      const result = await addPassengerToLine(lineId, passengerId, null);
      if (!result.success) return { success: false, error: result.error };
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
  __internal: { mockInvites },
};
