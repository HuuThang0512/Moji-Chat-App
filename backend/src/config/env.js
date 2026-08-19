import dotenv from "dotenv";

// Nạp biến môi trường ngay khi module này được import lần đầu.
// Mọi module khác phải import từ đây thay vì đọc thẳng process.env,
// vì thân module của ES module chạy trước thân của server.js.
dotenv.config();

const REQUIRED = [
  "MONGODB_CONNECTIONSTRING",
  "ACCESS_TOKEN_SECRET",
];

const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  console.error(
    `Thiếu biến môi trường bắt buộc: ${missing.join(", ")}\n` +
      `Tạo file backend/.env dựa trên backend/.env.example rồi chạy lại.`
  );
  process.exit(1);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT) || 5001,
  mongoUri: process.env.MONGODB_CONNECTIONSTRING,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};

export const isCloudinaryConfigured = Boolean(
  env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret
);

if (!isCloudinaryConfigured) {
  console.warn(
    "Cloudinary chưa được cấu hình - chức năng upload avatar sẽ trả về lỗi 503."
  );
}
