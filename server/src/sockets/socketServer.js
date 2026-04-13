import { Server } from "socket.io";
import env from "../config/env.js";
import { sendChatMessage } from "../services/chat.service.js";
import { isUserPoliceVerified } from "../services/verification.service.js";
import { verifyAuthToken } from "../utils/jwt.js";
import { socketSendMessageSchema } from "../validators/chat.validator.js";

const CHAT_SEND_WINDOW_MS = 60 * 1000;
const CHAT_SEND_MAX_PER_WINDOW = 25;

function extractToken(socket) {
  const authToken = socket.handshake.auth?.token;
  const authHeader = socket.handshake.headers?.authorization;

  if (authToken) {
    return authToken;
  }

  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

function buildUserRoom(userId) {
  return `user:${userId.toString()}`;
}

function assertChatRateLimit(socket) {
  const now = Date.now();
  const currentRateState = socket.data.chatRateState || {
    windowStartAt: now,
    count: 0
  };

  if (now - currentRateState.windowStartAt >= CHAT_SEND_WINDOW_MS) {
    currentRateState.windowStartAt = now;
    currentRateState.count = 0;
  }

  currentRateState.count += 1;
  socket.data.chatRateState = currentRateState;

  if (currentRateState.count > CHAT_SEND_MAX_PER_WINDOW) {
    throw new Error("Rate limit exceeded. Please slow down your messages.");
  }
}

export function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: env.clientUrl,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    const token = extractToken(socket);

    if (!token) {
      next(new Error("Unauthorized: token missing"));
      return;
    }

    try {
      const decoded = verifyAuthToken(token);

      if (!decoded?.userId) {
        next(new Error("Unauthorized: invalid token"));
        return;
      }

      const isPoliceVerified = await isUserPoliceVerified(decoded.userId);

      if (!isPoliceVerified) {
        next(new Error("Police verification pending approval"));
        return;
      }

      socket.data.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };

      next();
    } catch (_error) {
      next(new Error("Unauthorized: invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const currentUserId = socket.data.user.id;
    const currentUserRoom = buildUserRoom(currentUserId);

    socket.join(currentUserRoom);

    socket.emit("connection:ready", {
      id: socket.id,
      userId: currentUserId,
      message: "Socket connection initialized"
    });

    socket.on("chat:send", async (payload = {}, acknowledgement) => {
      try {
        assertChatRateLimit(socket);

        const validatedPayload = socketSendMessageSchema.parse(payload);

        const message = await sendChatMessage(
          currentUserId,
          validatedPayload.toUserId,
          validatedPayload.content
        );

        io.to(currentUserRoom).emit("chat:new_message", message);
        io.to(buildUserRoom(validatedPayload.toUserId)).emit("chat:new_message", message);

        if (typeof acknowledgement === "function") {
          acknowledgement({
            ok: true,
            data: message
          });
        }
      } catch (error) {
        const validationMessage =
          Array.isArray(error?.issues) && error.issues[0]?.message
            ? error.issues[0].message
            : null;

        const errorPayload = {
          ok: false,
          message: validationMessage || error?.message || "Unable to send message"
        };

        if (typeof acknowledgement === "function") {
          acknowledgement(errorPayload);
          return;
        }

        socket.emit("chat:error", errorPayload);
      }
    });
  });

  return io;
}
