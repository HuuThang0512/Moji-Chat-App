import crypto from "crypto";
import Token from "../models/Token.js";
import { env } from "../config/env.js";

/** Hạn sử dụng tính bằng mili giây. */
export const TOKEN_TTL = {
  verify_email: 24 * 60 * 60 * 1000,
  reset_password: 60 * 60 * 1000,
};

export const hashToken = (raw) =>
  crypto.createHash("sha256").update(raw).digest("hex");

/**
 * Sinh token mới cho một người dùng và chỉ lưu bản băm.
 *
 * Xoá hết token cùng loại còn tồn của người đó trước: mỗi lúc chỉ một link sống,
 * nên link gửi lần trước mất hiệu lực ngay khi người dùng bấm "gửi lại".
 */
export const issueToken = async (userId, type) => {
  await Token.deleteMany({ userId, type });

  const raw = crypto.randomBytes(32).toString("hex");
  await Token.create({
    userId,
    tokenHash: hashToken(raw),
    type,
    expiresAt: new Date(Date.now() + TOKEN_TTL[type]),
  });

  /**
   * Chỉ ở môi trường test: giữ token thô trong bộ nhớ để endpoint dev đọc lại,
   * vì từ bản băm không suy ngược ra được. env.exposeMailTokens đã chặn cứng
   * production nên nhánh này không bao giờ chạy ở đó.
   */
  if (env.exposeMailTokens) {
    global.__devTokens ??= new Map();
    global.__devTokens.set(hashToken(raw), raw);
  }

  return raw;
};

/**
 * Đổi token thô lấy bản ghi tương ứng rồi xoá nó đi.
 *
 * Tìm và xoá trong cùng một thao tác nguyên tử để token chỉ dùng được đúng một
 * lần, kể cả khi hai request tới cùng lúc.
 */
export const consumeToken = async (raw, type) => {
  if (!raw) return null;

  return Token.findOneAndDelete({
    tokenHash: hashToken(raw),
    type,
    expiresAt: { $gt: new Date() },
  });
};
