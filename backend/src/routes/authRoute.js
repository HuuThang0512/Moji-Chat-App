import express from "express";
import {
  signUp,
  signIn,
  signOut,
  refreshToken,
  verifyEmail,
  resendVerifyEmail,
} from "../controllers/authController.js";
import { validateBody } from "../middlewares/validateMiddleware.js";
import { signInSchema, signUpSchema, verifyEmailSchema } from "../utils/schemas.js";
import { authLimiter, mailLimiter } from "../middlewares/rateLimitMiddleware.js";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import { env } from "../config/env.js";
import Token from "../models/Token.js";
import User from "../models/User.js";

const router = express.Router();

router.post("/signup", authLimiter, validateBody(signUpSchema), signUp);
router.post("/signin", authLimiter, validateBody(signInSchema), signIn);
router.post("/signout", signOut);
router.post("/refresh", authLimiter, refreshToken);

router.post("/verify-email", authLimiter, validateBody(verifyEmailSchema), verifyEmail);

// protectedRoute gắn riêng cho route này vì cả authRoute nằm trước tầng bảo vệ
// chung trong server.js.
router.post("/verify-email/resend", protectedRoute, mailLimiter, resendVerifyEmail);

/**
 * Chỉ dành cho test tự động: trả token thô mà bình thường chỉ nằm trong email.
 *
 * Khoá hai lớp - env.exposeMailTokens đã đòi cả cờ EXPOSE_MAIL_TOKENS=1 lẫn
 * NODE_ENV khác production. Không thoả thì route này không được đăng ký, gọi vào
 * rơi xuống notFoundHandler của /api như mọi đường dẫn không tồn tại khác.
 */
if (env.exposeMailTokens) {
  console.warn("EXPOSE_MAIL_TOKENS đang bật - endpoint /auth/__dev/last-token đã mở.");

  router.get("/__dev/last-token", async (req, res) => {
    const { email, type } = req.query;

    const user = await User.findOne({ email: String(email).toLowerCase() }).lean();
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    const record = await Token.findOne({ userId: user._id, type })
      .sort({ createdAt: -1 })
      .lean();
    if (!record) return res.status(404).json({ message: "Không có token" });

    // Bản băm không suy ngược được, nên lấy lại token thô từ bộ nhớ tạm mà
    // issueToken ghi vào khi cờ đang bật.
    const raw = global.__devTokens?.get(record.tokenHash);
    return res.json({ token: raw ?? null });
  });
}

export default router;
