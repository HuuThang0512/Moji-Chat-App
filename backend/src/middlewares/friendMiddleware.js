import Friend from "../models/Friend.js";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";

const pair = (a, b) => (a < b ? [a, b] : [b, a]);

export const checkFriendship = async (req, res, next) => {
  try {
    const recipientId = req.body?.recipientId ?? null;
    const userId = req.user._id;
    const memberIds = req.body?.memberIds ?? [];

    if (!recipientId && !memberIds?.length) {
      return res
        .status(400)
        .json({ message: "Recipient ID or member IDs are required" });
    }

    if (recipientId) {
      const [userA, userB] = pair(userId.toString(), recipientId.toString());
      const friendship = await Friend.findOne({ userA, userB });
      if (!friendship) {
        return res.status(400).json({
          message: "You must be friends with this user to send direct message",
        });
      }
      return next();
    }
    // Todo: Chat group
    if (memberIds?.length) {
      const friendChecks = memberIds.map(async (memberId) => {
        const [userA, userB] = pair(userId.toString(), memberId.toString());
        const friendShip = await Friend.findOne({ userA, userB });
        return friendShip ? null : memberId;
      });
      const results = await Promise.all(friendChecks);
      const notFriends = results.filter(Boolean);
      if (notFriends.length) {
        return res.status(403).json({
          message: "You must be friends with all users to send group message",
          notFriends,
        });
      }
      return next();
    }
  } catch (error) {
    console.error("Error in checkFriendship middleware", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

export const checkGroupMembership = async (req, res, next) => {
  try {
    const { conversationId } = req.body;
    const senderId = req.user._id;
    const conversation = await Conversation.findOne({ _id: conversationId });
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    if (conversation.type !== "group") {
      return res
        .status(400)
        .json({ message: "This is not a group conversation" });
    }
    const isParticipant = conversation.participants.some(
      (p) => p.userId.toString() === senderId.toString()
    );
    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "You are not a member of this group" });
    }
    req.conversation = conversation;
    return next();
  } catch (error) {
    console.error("Error in checkGroupMembership middleware", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
