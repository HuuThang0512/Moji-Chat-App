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
  mail: {
    apiKey: process.env.BREVO_API_KEY,
    from: process.env.MAIL_FROM,
    fromName: process.env.MAIL_FROM_NAME || "Moji",
  },

  /**
   * Gốc URL để dựng link trong email.
   * Render tự đặt RENDER_EXTERNAL_URL nên production không phải cấu hình gì thêm.
   * Cắt dấu / ở cuối để nối chuỗi không ra hai dấu gạch liền nhau.
   */
  appUrl: (
    process.env.APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:5173"
  ).replace(/\/$/, ""),

  /**
   * Mở endpoint đọc token dành cho test tự động.
   * Điều kiện kép ngay tại đây: dù có đặt cờ, production vẫn luôn tắt.
   */
  exposeMailTokens:
    process.env.EXPOSE_MAIL_TOKENS === "1" && process.env.NODE_ENV !== "production",
};

export const isCloudinaryConfigured = Boolean(
  env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret
);

if (!isCloudinaryConfigured) {
  console.warn(
    "Cloudinary chưa được cấu hình - chức năng upload avatar sẽ trả về lỗi 503."
  );
}

export const isMailerConfigured = Boolean(env.mail.apiKey && env.mail.from);

if (!isMailerConfigured) {
  console.warn(
    "Chưa cấu hình gửi mail - xác minh email và khôi phục mật khẩu sẽ trả về 503."
  );
}
