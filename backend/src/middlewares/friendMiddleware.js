import Friend from "../models/Friend.js";
import User from "../models/User.js";

const pair = (a, b) => (a < b ? [a, b] : [b, a]);

export const checkFriendship = async (req, res, next) => {
  try {
    const recipientId = req.body?.recipientId ?? null;
    const userId = req.user._id;

    if (!recipientId) {
      return res.status(400).json({ message: "Recipient ID is required" });
    }

    if (recipientId) {
      const [userA, userB] = pair(userId.toString(), recipientId.toString());
      const friendship = await Friend.findOne({ userA, userB });
      if (!friendship) {
        return res
          .status(400)
          .json({ message: "You must be friends with this user to send direct message" });
      }
      return next();
    }
    // Todo: Chat group
  } catch (error) {
    console.error("Error in checkFriendship middleware", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
