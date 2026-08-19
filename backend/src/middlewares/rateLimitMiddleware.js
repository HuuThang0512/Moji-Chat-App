import rateLimit, { ipKeyGenerator } from "express-rate-limit";

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

/**
 * Giới hạn việc sinh email, đếm theo địa chỉ nhận chứ không theo IP.
 *
 * Đếm theo IP thì một người vẫn spam được hòm thư của người khác chỉ bằng cách
 * đổi mạng. Đếm theo email thì hòm thư nạn nhân được bảo vệ dù kẻ gửi ở đâu.
 * Route không có email trong body (gửi lại mail cho chính mình) đếm theo id
 * người dùng; cuối cùng mới lùi về IP.
 */
export const mailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    const email = req.body?.email?.trim().toLowerCase();
    if (email) return `mail:${email}`;
    if (req.user?._id) return `mail:user:${req.user._id}`;
    // ipKeyGenerator chuẩn hoá IPv6; tự nối chuỗi IP sẽ đếm sai vì mỗi thiết bị
    // trong cùng một dải /64 lại ra một key khác nhau.
    return `mail:ip:${ipKeyGenerator(req, res)}`;
  },
  handler: jsonMessage("Bạn đã yêu cầu quá nhiều email, vui lòng thử lại sau một giờ"),
});

/** Giới hạn riêng cho upload vì mỗi lần gọi tốn băng thông và quota Cloudinary. */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: jsonMessage("Bạn đã tải lên quá nhiều lần trong một giờ"),
});
