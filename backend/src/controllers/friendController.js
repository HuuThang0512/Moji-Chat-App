import FriendRequest from "../models/FriendRequest.js";
import Friend from "../models/Friend.js";
import User from "../models/User.js";
import { sortedFriendPair } from "../utils/sortedFriendPair.js";
import { asyncHandler, badRequest, forbidden, notFound } from "../utils/AppError.js";

const USER_FIELDS = "_id username displayName avatarUrl";

/** Gửi lời mời kết bạn. */
export const sendFriendRequest = asyncHandler(async (req, res) => {
  const { to, message } = req.body;
  const from = req.user._id;

  if (from.toString() === to) {
    throw badRequest("Bạn không thể tự kết bạn với chính mình");
  }

  const userTo = await User.findById(to).select("_id").lean();
  if (!userTo) {
    throw notFound("Không tìm thấy người dùng");
  }

  const [userA, userB] = sortedFriendPair(from, to);
  const [alreadyFriend, alreadyRequested] = await Promise.all([
    Friend.findOne({ userA, userB }).lean(),
    FriendRequest.findOne({
      $or: [
        { from, to },
        { from: to, to: from },
      ],
    }).lean(),
  ]);

  if (alreadyFriend) {
    throw badRequest("Hai bạn đã là bạn bè");
  }
  if (alreadyRequested) {
    throw badRequest(
      alreadyRequested.from.toString() === from.toString()
        ? "Bạn đã gửi lời mời cho người này"
        : "Người này đã gửi lời mời cho bạn, hãy kiểm tra mục thông báo"
    );
  }

  const newFriendRequest = await FriendRequest.create({ from, to, message });

  return res.status(201).json({
    message: "Friend request sent",
    friendRequest: newFriendRequest,
  });
});

/** Chấp nhận lời mời kết bạn. */
export const acceptFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user._id;

  const friendRequest = await FriendRequest.findById(requestId);
  if (!friendRequest) {
    throw notFound("Không tìm thấy lời mời kết bạn");
  }
  if (friendRequest.to.toString() !== userId.toString()) {
    throw forbidden("Bạn không có quyền chấp nhận lời mời này");
  }

  const [userA, userB] = sortedFriendPair(friendRequest.from, userId);
  // upsert thay vì create: nếu hai request chéo cùng được chấp nhận, unique
  // index sẽ không ném lỗi và kết quả vẫn đúng một bản ghi bạn bè.
  await Friend.updateOne({ userA, userB }, { $setOnInsert: { userA, userB } }, { upsert: true });

  // Xoá cả lời mời chiều ngược lại nếu có, tránh để lại lời mời mồ côi.
  await FriendRequest.deleteMany({
    $or: [
      { from: friendRequest.from, to: friendRequest.to },
      { from: friendRequest.to, to: friendRequest.from },
    ],
  });

  const fromUser = await User.findById(friendRequest.from).select(USER_FIELDS).lean();

  return res.status(200).json({
    message: "Friend request accepted",
    newFriend: fromUser,
  });
});

/** Từ chối lời mời kết bạn. */
export const declineFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user._id;

  const friendRequest = await FriendRequest.findById(requestId).lean();
  if (!friendRequest) {
    throw notFound("Không tìm thấy lời mời kết bạn");
  }
  // Cả người nhận (từ chối) lẫn người gửi (thu hồi) đều được phép xoá.
  const isRecipient = friendRequest.to.toString() === userId.toString();
  const isSender = friendRequest.from.toString() === userId.toString();
  if (!isRecipient && !isSender) {
    throw forbidden("Bạn không có quyền thao tác với lời mời này");
  }

  await FriendRequest.deleteOne({ _id: requestId });

  return res.sendStatus(204);
});

/** Lấy danh sách bạn bè. */
export const getAllFriends = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const currentUserId = userId.toString();

  const friendShips = await Friend.find({ $or: [{ userA: userId }, { userB: userId }] })
    .populate("userA", USER_FIELDS)
    .populate("userB", USER_FIELDS)
    .lean();

  const seen = new Set();
  const friends = [];

  for (const friendship of friendShips) {
    const other =
      friendship.userA?._id?.toString() === currentUserId ? friendship.userB : friendship.userA;
    const otherId = other?._id?.toString();
    if (!otherId || otherId === currentUserId || seen.has(otherId)) continue;
    seen.add(otherId);
    friends.push(other);
  }

  return res.status(200).json({ friends });
});

/** Lấy danh sách lời mời đã gửi và đã nhận. */
export const getFriendRequests = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [sentRequests, receivedRequests] = await Promise.all([
    FriendRequest.find({ from: userId }).populate("to", USER_FIELDS).sort({ createdAt: -1 }).lean(),
    FriendRequest.find({ to: userId }).populate("from", USER_FIELDS).sort({ createdAt: -1 }).lean(),
  ]);

  return res.status(200).json({ sentRequests, receivedRequests });
});
