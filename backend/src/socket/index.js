import { Server } from "socket.io";
import http from "http";
import express from "express";
import { env } from "../config/env.js";
import { socketAuthMiddleware } from "../middlewares/socketMiddleware.js";
import { getUserConversationsForSocketIO, isUserInConversation } from "../controllers/conversationController.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.clientUrl,
    credentials: true,
  },
});

io.use(socketAuthMiddleware);

/**
 * userId (string) -> Set các socketId đang mở.
 * Dùng Set vì một người có thể mở nhiều tab; chỉ coi là offline khi tab cuối đóng.
 * Trước đây Map dùng ObjectId làm key nên hai tab tạo ra hai key khác nhau và
 * đóng một tab đã báo offline sai.
 */
const onlineUsers = new Map();

export const getOnlineUserIds = () => Array.from(onlineUsers.keys());

io.on("connection", async (socket) => {
  const userId = socket.userId;

  const sockets = onlineUsers.get(userId) ?? new Set();
  const justCameOnline = sockets.size === 0;
  sockets.add(socket.id);
  onlineUsers.set(userId, sockets);

  // Chỉ phát lại danh sách khi trạng thái thực sự đổi, tránh spam mỗi lần mở tab.
  if (justCameOnline) {
    io.emit("online-users", getOnlineUserIds());
  } else {
    socket.emit("online-users", getOnlineUserIds());
  }

  // Phòng riêng theo user để gửi sự kiện hướng tới đúng một người.
  socket.join(userId);

  const conversationIds = await getUserConversationsForSocketIO(userId);
  conversationIds.forEach((id) => socket.join(id));

  socket.on("join-conversation", async (conversationId, ack) => {
    // Bắt buộc kiểm tra thành viên: nếu không, client chỉ cần biết một id là
    // nghe lén được toàn bộ tin nhắn của cuộc trò chuyện đó.
    const allowed = await isUserInConversation(conversationId, userId);
    if (!allowed) {
      if (typeof ack === "function") ack({ ok: false, message: "Forbidden" });
      return;
    }
    socket.join(conversationId.toString());
    if (typeof ack === "function") ack({ ok: true });
  });

  socket.on("disconnect", () => {
    const current = onlineUsers.get(userId);
    if (!current) return;
    current.delete(socket.id);
    if (current.size === 0) {
      onlineUsers.delete(userId);
      io.emit("online-users", getOnlineUserIds());
    }
  });
});

export { io, app, server };
