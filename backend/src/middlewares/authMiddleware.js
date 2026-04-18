const { verifyToken } = require("../services/authService");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "Token de autenticação é obrigatório",
      },
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Token inválido ou expirado",
      },
    });
  }

  req.auth = decoded;
  return next();
}

module.exports = {
  requireAuth,
};
