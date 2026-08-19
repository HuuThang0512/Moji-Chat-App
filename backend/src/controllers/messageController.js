import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { io } from "../socket/index.js";
import { asyncHandler } from "../utils/AppError.js";
import { emitNewMessage, updateConversationAfterCreateMessage } from "../utils/messageHelper.js";

/**
 * Gửi tin nhắn riêng.
 * conversationId là tuỳ chọn: nếu có thì requireConversationAccess đã kiểm tra
 * người gửi thuộc cuộc trò chuyện đó và gắn vào req.conversation; nếu không có
 * thì tìm theo cặp người dùng, chưa có mới tạo mới.
 */
export const sendDirectMessage = asyncHandler(async (req, res) => {
  const { recipientId, content, imgUrl } = req.body;
  const senderId = req.user._id;

  let conversation = req.conversation;

  if (!conversation) {
    conversation = await Conversation.findOne({
      type: "direct",
      "participants.userId": { $all: [senderId, recipientId] },
    });
  }

  if (!conversation) {
    conversation = await Conversation.create({
      type: "direct",
      participants: [
        { userId: senderId, joinedAt: new Date() },
        { userId: recipientId, joinedAt: new Date() },
      ],
      lastMessageAt: new Date(),
      unreadCount: new Map(),
    });
  }

  const newMessage = await Message.create({
    conversationId: conversation._id,
    senderId,
    content,
    imgUrl,
  });

  updateConversationAfterCreateMessage(conversation, newMessage, senderId);
  await conversation.save();

  emitNewMessage(io, conversation, newMessage, req.user);

  return res.status(201).json({ newMessage });
});

/** Gửi tin nhắn nhóm. req.conversation do requireConversationAccess cung cấp. */
export const sendGroupMessage = asyncHandler(async (req, res) => {
  const { content, imgUrl } = req.body;
  const conversation = req.conversation;
  const senderId = req.user._id;

  const newMessage = await Message.create({
    conversationId: conversation._id,
    senderId,
    content,
    imgUrl,
  });

  updateConversationAfterCreateMessage(conversation, newMessage, senderId);
  await conversation.save();

  emitNewMessage(io, conversation, newMessage, req.user);

  return res.status(201).json({ newMessage });
});
