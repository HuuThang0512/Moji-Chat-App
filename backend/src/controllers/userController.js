import User from "../models/User.js";
import Friend from "../models/Friend.js";
import FriendRequest from "../models/FriendRequest.js";
import { sortedFriendPair } from "../utils/sortedFriendPair.js";
import { destroyImage, uploadImageFromBuffer } from "../middlewares/uploadMiddleware.js";
import { isCloudinaryConfigured } from "../config/env.js";
import { AppError, asyncHandler, badRequest } from "../utils/AppError.js";

export const authMe = asyncHandler(async (req, res) => {
  return res.status(200).json({ user: req.user });
});

export const searchUserByUsername = asyncHandler(async (req, res) => {
  const { username } = req.validatedQuery;
  const currentUserId = req.user._id;

  const user = await User.findOne({ username })
    .select("_id displayName username avatarUrl bio")
    .lean();

  if (!user) {
    return res.status(200).json({ user: null });
  }

  if (user._id.toString() === currentUserId.toString()) {
    return res.status(200).json({ user: { ...user, relationship: "self" } });
  }

  const [userA, userB] = sortedFriendPair(currentUserId, user._id);
  const [friendship, sentReq, recvReq] = await Promise.all([
    Friend.findOne({ userA, userB }).lean(),
    FriendRequest.findOne({ from: currentUserId, to: user._id }).lean(),
    FriendRequest.findOne({ from: user._id, to: currentUserId }).lean(),
  ]);

  let relationship = "none";
  if (friendship) relationship = "friends";
  else if (sentReq) relationship = "request_sent";
  else if (recvReq) relationship = "request_received";

  return res.status(200).json({ user: { ...user, relationship } });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!isCloudinaryConfigured) {
    throw new AppError(503, "Máy chủ chưa cấu hình Cloudinary nên chưa thể tải ảnh lên");
  }

  const file = req.file;
  if (!file) {
    throw badRequest("Chưa chọn file để tải lên");
  }

  const previousAvatarId = req.user.avatarId;
  const result = await uploadImageFromBuffer(file.buffer);

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { avatarUrl: result.secure_url, avatarId: result.public_id },
    { new: true }
  ).select("-hashedPassword");

  // Xoá ảnh cũ sau khi đã ghi ảnh mới, để lỗi xoá không làm hỏng cập nhật.
  await destroyImage(previousAvatarId);

  return res.status(200).json({ user: updatedUser, avatarUrl: updatedUser.avatarUrl });
});
