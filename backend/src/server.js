// Phải import đầu tiên: module này nạp .env và kiểm tra biến bắt buộc trước khi
// bất kỳ module nào khác đọc process.env.
import { env, isCloudinaryConfigured } from "./config/env.js";

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

import { connectDB } from "./libs/db.js";
import { app, server } from "./socket/index.js";
import { protectedRoute } from "./middlewares/authMiddleware.js";
import { apiLimiter } from "./middlewares/rateLimitMiddleware.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorMiddleware.js";

import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import friendRoute from "./routes/friendRoute.js";
import messageRoute from "./routes/messageRoute.js";
import conversationRoute from "./routes/conversationRoute.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Thư mục chứa bản build của frontend.
 * Trong image Docker, bản build được copy vào backend/public. Nếu không có thư
 * mục này (chạy dev, frontend do Vite phục vụ riêng) thì bỏ qua phần serve tĩnh.
 */
const clientDir = path.resolve(__dirname, "..", "public");
const clientIndexFile = path.join(clientDir, "index.html");
const shouldServeClient = fs.existsSync(clientIndexFile);

/**
 * Render, Railway, Fly và mọi PaaS khác đều đặt ứng dụng sau một reverse proxy.
 * Thiếu dòng này thì Express coi mọi request đến từ IP của proxy: cookie `secure`
 * bị từ chối vì tưởng kết nối là http, và express-rate-limit gộp toàn bộ người
 * dùng vào chung một bộ đếm.
 */
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // Radix và Tailwind gắn style trực tiếp lên thẻ nên cần 'unsafe-inline'.
        styleSrc: ["'self'", "'unsafe-inline'"],
        // Không có dòng res.cloudinary.com thì ảnh đại diện bị CSP chặn.
        imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
        connectSrc: ["'self'", ...(env.isProduction ? [] : ["ws:", "http:"])],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: env.isProduction ? [] : null,
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Khi backend phục vụ luôn frontend thì mọi request đều cùng origin, CORS chỉ
// còn cần cho môi trường dev nơi Vite chạy ở cổng khác.
if (!shouldServeClient) {
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
}

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

// Health check đứng trước rate limit để công cụ giám sát không bị chặn.
app.get("/api/health", (req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  return res.status(200).json({
    status: "ok",
    env: env.nodeEnv,
    database: dbStates[mongoose.connection.readyState] ?? "unknown",
    uptime: Math.round(process.uptime()),
  });
});

app.use("/api", apiLimiter);

// Public routes
app.use("/api/auth", authRoute);

// Từ đây trở xuống bắt buộc phải có access token hợp lệ.
app.use("/api", protectedRoute);
app.use("/api/users", userRoute);
app.use("/api/friends", friendRoute);
app.use("/api/messages", messageRoute);
app.use("/api/conversations", conversationRoute);

// Route /api không khớp phải trả JSON 404, không được rơi xuống SPA fallback.
app.use("/api", notFoundHandler);

if (shouldServeClient) {
  app.use(
    express.static(clientDir, {
      // File có hash trong tên nên cache dài được; index.html thì không, nếu
      // không người dùng sẽ mắc kẹt ở bản build cũ sau mỗi lần deploy.
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        } else {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );

  // SPA fallback: React Router xử lý đường dẫn phía client nên mọi GET còn lại
  // đều trả về index.html. Dùng middleware không gắn path để không phụ thuộc
  // cú pháp wildcard vốn đã đổi ở Express 5.
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    return res.sendFile(clientIndexFile);
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

const shutdown = (signal) => async () => {
  console.log(`\nNhận ${signal}, đang tắt server...`);
  server.close(() => console.log("HTTP server đã đóng"));
  await mongoose.connection.close(false).catch(() => {});
  process.exit(0);
};

process.on("SIGINT", shutdown("SIGINT"));
process.on("SIGTERM", shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

connectDB().then(() => {
  server.listen(env.port, "0.0.0.0", () => {
    console.log(
      `Server đang chạy tại http://localhost:${env.port} (${env.nodeEnv})` +
        (shouldServeClient ? " - đang phục vụ cả frontend" : "")
    );
  });
});
