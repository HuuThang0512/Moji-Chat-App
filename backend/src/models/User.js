import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    hashedPassword: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
    },
    avatarId: {
      type: String,
    },
    bio: {
      type: String,
      maxLength: 500,
    },
    /** Thời điểm người dùng bấm link xác minh. Rỗng nghĩa là chưa xác minh. */
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    phone: {
      type: String,
      sparse: true, // Có thể để trống nhưng khi nhập thì không được nhập trùng
    },
  },
  { timestamps: true } // Sẽ tự động thêm createdAt và updatedAt
);

const User = mongoose.model("User", userSchema);
export default User;