import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { unauthorized } from "../utils/AppError.js";

/**
 * Xác thực access token trong header Authorization.
 * Trả 401 cho mọi trường hợp token thiếu / sai / hết hạn để client biết cần
 * gọi /auth/refresh. Mã 403 được dành riêng cho "đã đăng nhập nhưng không đủ quyền".
 */
export const protectedRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    if (!token) {
      return next(unauthorized("Thiếu access token"));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.accessTokenSecret);
    } catch {
      return next(unauthorized("Access token không hợp lệ hoặc đã hết hạn"));
    }

    const user = await User.findById(decoded.userId).select("-hashedPassword");
    if (!user) {
      return next(unauthorized("Người dùng không tồn tại"));
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};
