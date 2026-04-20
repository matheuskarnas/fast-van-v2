const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const {
  createPrivateConversation,
  sendPrivateMessage,
  getPrivateMessages,
  markPrivateMessagesAsRead,
  subscribeToPrivateConversation,
  createLineGroupChat,
  sendGroupMessage,
  getGroupMessages,
  addUserToGroupChat,
  removeUserFromGroupChat,
  subscribeToGroupConversation,
} = require("../services/chatService");

const router = express.Router();

function mapServiceErrorToStatus(errorMessage) {
  if (!errorMessage) {
    return 400;
  }

  if (errorMessage.includes("não autenticado")) {
    return 401;
  }

  if (errorMessage.includes("não encontrada") || errorMessage.includes("não encontrado")) {
    return 404;
  }

  if (errorMessage.includes("não tem permissão")) {
    return 403;
  }

  return 400;
}

function parseBoolean(value) {
  return String(value).toLowerCase() === "true";
}

router.post("/private/conversations", requireAuth, async (req, res, next) => {
  try {
    const { passengerId, driverId, context } = req.body;

    const result = await createPrivateConversation({
      passengerId,
      driverId,
      context,
      isAuthenticated: true,
    });

    if (result.success) {
      return res.status(201).json(result);
    }

    return res.status(mapServiceErrorToStatus(result.error)).json(result);
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/private/conversations/:conversationId/messages",
  requireAuth,
  async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const { text, forceRealtimeFailure } = req.body;

      const result = await sendPrivateMessage({
        conversationId,
        senderId: req.auth.id,
        text,
        forceRealtimeFailure,
        isAuthenticated: true,
      });

      if (result.success) {
        return res.status(201).json(result);
      }

      return res.status(mapServiceErrorToStatus(result.error)).json(result);
    } catch (error) {
      return next(error);
    }
  },
);

router.get(
  "/private/conversations/:conversationId/messages",
  requireAuth,
  async (req, res, next) => {
    try {
      const { conversationId } = req.params;

      const result = await getPrivateMessages({
        conversationId,
        userId: req.auth.id,
        isAuthenticated: true,
      });

      if (result.success) {
        return res.status(200).json(result);
      }

      return res.status(mapServiceErrorToStatus(result.error)).json(result);
    } catch (error) {
      return next(error);
    }
  },
);

router.patch(
  "/private/conversations/:conversationId/read",
  requireAuth,
  async (req, res, next) => {
    try {
      const { conversationId } = req.params;

      const result = await markPrivateMessagesAsRead({
        conversationId,
        userId: req.auth.id,
        isAuthenticated: true,
      });

      if (result.success) {
        return res.status(200).json(result);
      }

      return res.status(mapServiceErrorToStatus(result.error)).json(result);
    } catch (error) {
      return next(error);
    }
  },
);

router.get(
  "/private/conversations/:conversationId/stream",
  requireAuth,
  async (req, res, next) => {
    try {
      const { conversationId } = req.params;

      const accessResult = await getPrivateMessages({
        conversationId,
        userId: req.auth.id,
        isAuthenticated: true,
      });

      if (!accessResult.success) {
        return res
          .status(mapServiceErrorToStatus(accessResult.error))
          .json(accessResult);
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const unsubscribe = subscribeToPrivateConversation(
        conversationId,
        req.auth.id,
        (message) => {
          res.write(`event: private-message\n`);
          res.write(`data: ${JSON.stringify(message)}\n\n`);
        },
      );

      req.on("close", () => {
        unsubscribe();
      });

      return undefined;
    } catch (error) {
      return next(error);
    }
  },
);

router.post("/groups", requireAuth, async (req, res, next) => {
  try {
    const { lineId, driverIds, passengerIds } = req.body;

    const result = await createLineGroupChat({
      lineId,
      ownerDriverId: req.auth.id,
      driverIds,
      passengerIds,
    });

    if (result.success) {
      return res.status(201).json(result);
    }

    return res.status(mapServiceErrorToStatus(result.error)).json(result);
  } catch (error) {
    return next(error);
  }
});

router.post("/groups/:lineId/messages", requireAuth, async (req, res, next) => {
  try {
    const { lineId } = req.params;
    const { text } = req.body;

    const result = await sendGroupMessage({
      lineId,
      senderId: req.auth.id,
      text,
      isAuthenticated: true,
    });

    if (result.success) {
      return res.status(201).json(result);
    }

    return res.status(mapServiceErrorToStatus(result.error)).json(result);
  } catch (error) {
    return next(error);
  }
});

router.get("/groups/:lineId/messages", requireAuth, async (req, res, next) => {
  try {
    const { lineId } = req.params;
    const { markAsRead } = req.query;

    const result = await getGroupMessages({
      lineId,
      userId: req.auth.id,
      isAuthenticated: true,
      markAsRead: parseBoolean(markAsRead),
    });

    if (result.success) {
      return res.status(200).json(result);
    }

    return res.status(mapServiceErrorToStatus(result.error)).json(result);
  } catch (error) {
    return next(error);
  }
});

router.post("/groups/:lineId/members", requireAuth, async (req, res, next) => {
  try {
    const { lineId } = req.params;
    const { userId, role } = req.body;

    const result = await addUserToGroupChat({
      lineId,
      userId,
      role,
      actorId: req.auth.id,
    });

    if (result.success) {
      return res.status(200).json(result);
    }

    return res.status(mapServiceErrorToStatus(result.error)).json(result);
  } catch (error) {
    return next(error);
  }
});

router.delete(
  "/groups/:lineId/members/:userId",
  requireAuth,
  async (req, res, next) => {
    try {
      const { lineId, userId } = req.params;

      const result = await removeUserFromGroupChat({
        lineId,
        userId,
        actorId: req.auth.id,
      });

      if (result.success) {
        return res.status(200).json(result);
      }

      return res.status(mapServiceErrorToStatus(result.error)).json(result);
    } catch (error) {
      return next(error);
    }
  },
);

router.get("/groups/:lineId/stream", requireAuth, async (req, res, next) => {
  try {
    const { lineId } = req.params;

    const accessResult = await getGroupMessages({
      lineId,
      userId: req.auth.id,
      isAuthenticated: true,
      markAsRead: false,
    });

    if (!accessResult.success) {
      return res.status(mapServiceErrorToStatus(accessResult.error)).json(accessResult);
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const unsubscribe = subscribeToGroupConversation(lineId, req.auth.id, (message) => {
      res.write(`event: group-message\n`);
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    });

    req.on("close", () => {
      unsubscribe();
    });

    return undefined;
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
