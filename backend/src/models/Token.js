import mongoose from "mongoose";

/**
 * Token dùng một lần gửi qua email: xác minh địa chỉ hoặc đặt lại mật khẩu.
 *
 * Chỉ lưu bản băm SHA-256, không lưu token thô. Ai đọc được database cũng không
 * dựng lại được link, vì link chứa token thô.
 */
const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["verify_email", "reset_password"],
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Mongo tự xoá bản ghi hết hạn, không cần job dọn dẹp.
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Token = mongoose.model("Token", tokenSchema);
export default Token;
