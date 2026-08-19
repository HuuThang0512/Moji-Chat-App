import rateLimit from "express-rate-limit";

const jsonMessage = (message) => (req, res) => res.status(429).json({ message });

/** Giới hạn chặt cho các route đăng nhập/đăng ký để chống dò mật khẩu. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: jsonMessage("Quá nhiều lần thử, vui lòng đợi 15 phút rồi thử lại"),
});

/** Giới hạn chung cho toàn bộ API. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: jsonMessage("Bạn thao tác quá nhanh, vui lòng thử lại sau ít giây"),
});

/** Giới hạn riêng cho upload vì mỗi lần gọi tốn băng thông và quota Cloudinary. */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: jsonMessage("Bạn đã tải lên quá nhiều lần trong một giờ"),
});
