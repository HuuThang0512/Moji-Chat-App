import User from "../models/User.js";
import Friend from "../models/Friend.js";
import FriendRequest from "../models/FriendRequest.js";
import { sortedFriendPair } from "../utils/sortedFriendPair.js";

export const authMe = async (req, res) => {
  try {
    const user = req.user;
    return res.status(200).json({ user });
  } catch(error) {
    console.error("Error fetching user", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const test = async (req, res) => {
  return res.sendStatus(204);
};

export const searchUserByUsername = async (req, res) => {
  try {
    const { username } = req.query;
    const currentUserId = req.user._id;

    if(!username || username.trim() === "") {
      return res.status(400).json({ message: "Username is required" });
    }
    const normalized = username.trim().toLowerCase();
    const user = await User.findOne({ username: normalized })
      .select("_id displayName username avatarUrl")
      .lean();

    if (!user) {
      return res.status(200).json({ user: null });
    }

    if (user._id.toString() === currentUserId.toString()) {
      return res.status(200).json({
        user: { ...user, relationship: "self" },
      });
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

    return res.status(200).json({
      user: { ...user, relationship },
    });
  } catch(error) {
    console.error("Error searching user by username", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}