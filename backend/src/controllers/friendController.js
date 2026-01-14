import FriendRequest from "../models/FriendRequest.js";
import Friend from "../models/Friend.js";
import User from "../models/User.js";

/**
 * Gửi lời mời kết bạn
 */
export const sendFriendRequest = async (req, res) => {
  try {
    const { to, message } = req.body;
    const from = req.user._id;

    if (from === to) {
      return res
        .status(400)
        .json({ message: "You cannot send friend request to yourself" });
    }

    const userTo = await User.findById(to);
    if (!userTo) {
      return res.status(404).json({ message: "User not found" });
    }

    const userA = from.toString();
    const userB = to.toString();
    if (userA > userB) {
      [userA, userB] = [userB, userA];
    }
    const [alreadyFriend, alreadyRequested] = await Promise.all([
      Friend.findOne({ userA, userB }),
      FriendRequest.findOne({
        $or: [
          { from, to },
          { from: to, to: from },
        ],
      }),
    ]);

    if (alreadyFriend) {
      return res.status(400).json({ message: "You are already friends" });
    }
    if (alreadyRequested) {
      return res.status(400).json({ message: "Friend request already sent" });
    }
    const newFriendRequest = await FriendRequest.create({
      from,
      to,
      message,
    });
    return res.status(201).json({
      message: "Friend request sent",
      friendRequest: newFriendRequest,
    });
  } catch (error) {
    console.error("Error sending friend request", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Chấp nhận lời mời kết bạn
 */
export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }
    if (friendRequest.to.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You are not authorized to accept this friend request",
      });
    }

    const newFriend = await Friend.create({
      userA: friendRequest.from,
      userB: userId,
    });
    await FriendRequest.findByIdAndDelete(requestId);
    const fromUser = await User.findById(friendRequest.from)
      .select("_id displayName avatarUrl")
      .lean();
    return res.status(200).json({
      message: "Friend request accepted",
      newFriend: fromUser,
      displayName: fromUser?.displayName,
      avatarUrl: fromUser?.avatarUrl,
    });
  } catch (error) {
    console.error("Error accepting friend request", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

/**
 * Từ chối lời mời kết bạn
 */
export const declineFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }
    if (friendRequest.to.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You are not authorized to decline this friend request",
      });
    }

    await FriendRequest.findByIdAndDelete(requestId);
    return res.status(204).json({ message: "Friend request declined" });
  } catch (error) {
    console.error("Error declining friend request", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 *  Lấy danh sách bạn bè
 */
export const getAllFriends = async (req, res) => {
  try {
    const userId = req.user._id;
    // Tìm trong bảng friend, lấy ra các mối quan hệ friend của user
    const friendShips = await Friend.find({
      $or: [{ userA: userId }, { userB: userId }],
    })
      .populate("userA", "_id displayName avatarUrl")
      .populate("userB", "_id displayName avatarUrl")
      .lean();

    // Map qua các bản ghi, trả về thông tin của friend _id, displayName, avatarUrl
    const friends = friendShips.map((f) =>
      f._id.toString() === userId.toString() ? f.userB : f.userA
    );

    return res.status(200).json({ friends });
  } catch (error) {
    console.error("Error getting all friends", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/** Lấy danh sách lời mời kết bạn đã gửi và đã nhận */
export const getFriendRequests = async (req, res) => {
  try {
    // Lấy userId hiện tại
    const userId = req.user._id;
    const populateFields = "_id displayName avatarUrl";

    // Tìm trong bảng friendRequest, dùng promiseAll để lấy ra 2 loại, sau đó trả về 2 loại đó luôn
    const [sentRequests, receivedRequests] = await Promise.all([
      FriendRequest.find({ from: userId }).populate("to", populateFields),
      FriendRequest.find({ to: userId }).populate("from", populateFields),
    ]);

    return res.status(200).json({ sentRequests, receivedRequests });
  } catch (error) {
    console.error("Error getting friend requests", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
