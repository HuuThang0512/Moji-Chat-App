import Friend from "../models/Friend.js";
import { sortedFriendPair } from "../utils/sortedFriendPair.js";
import { AppError } from "../utils/AppError.js";

/**
 * Chỉ cho phép nhắn tin / mở cuộc trò chuyện với người đã là bạn bè.
 * Lấy danh sách đối tượng cần kiểm tra từ recipientId hoặc memberIds, rồi kiểm
 * tra toàn bộ bằng một truy vấn $or thay vì mỗi người một truy vấn.
 */
export const checkFriendship = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const targets = [
      ...new Set(
        [req.body?.recipientId, ...(req.body?.memberIds ?? [])]
          .filter(Boolean)
          .map(String)
          .filter((id) => id !== userId.toString())
      ),
    ];

    if (targets.length === 0) {
      return next(new AppError(400, "Thiếu người nhận"));
    }

    const pairs = targets.map((targetId) => {
      const [userA, userB] = sortedFriendPair(userId, targetId);
      return { userA, userB };
    });

    const friendships = await Friend.find({ $or: pairs }).lean();

    const friendIds = new Set();
    friendships.forEach(({ userA, userB }) => {
      friendIds.add(userA.toString());
      friendIds.add(userB.toString());
    });

    const notFriends = targets.filter((id) => !friendIds.has(id));
    if (notFriends.length) {
      return next(
        new AppError(403, "Bạn chỉ có thể nhắn tin với những người đã là bạn bè", { notFriends })
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
