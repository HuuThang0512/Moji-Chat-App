import Conversation from "../models/Conversation.js";
import { forbidden, notFound } from "../utils/AppError.js";

export const isParticipant = (conversation, userId) =>
  (conversation.participants ?? []).some(
    (participant) => participant.userId.toString() === userId.toString()
  );

/**
 * Chặn việc đọc/ghi vào conversation mà người dùng không thuộc về.
 * Không có middleware này thì bất kỳ ai biết một conversationId đều gửi và
 * đọc được tin nhắn trong đó.
 *
 * @param {object} options
 * @param {"params"|"body"} options.from Nơi lấy conversationId
 * @param {boolean} options.optional Cho phép thiếu id (dùng khi DM có thể tạo conversation mới)
 * @param {"direct"|"group"} [options.type] Bắt buộc conversation phải đúng loại này
 */
export const requireConversationAccess =
  ({ from = "params", optional = false, type } = {}) =>
  async (req, res, next) => {
    try {
      const conversationId = req[from]?.conversationId;

      if (!conversationId) {
        if (optional) return next();
        return next(notFound("Conversation not found"));
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return next(notFound("Conversation not found"));
      }

      if (!isParticipant(conversation, req.user._id)) {
        return next(forbidden("Bạn không thuộc cuộc trò chuyện này"));
      }

      if (type && conversation.type !== type) {
        return next(
          forbidden(
            type === "group"
              ? "Đây không phải cuộc trò chuyện nhóm"
              : "Đây không phải cuộc trò chuyện riêng"
          )
        );
      }

      req.conversation = conversation;
      return next();
    } catch (error) {
      return next(error);
    }
  };
