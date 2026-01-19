import e from "express";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

import { updateConversationAfterCreateMessage } from "../utils/messageHelper.js";

/**
 * Xử lý khi gửi tin nhắn riêng
 */
export const sendDirectMessage = async (req, res) => {
  try {
    // Lấy thông tin tin nhắn gửi lên
    const { recipientId, content, conversationId, imgUrl } = req.body;
    const senderId = req.user._id;
    if (!content) {
      return res.status(400).json({
        message: "Content are required",
      });
    }
    // Tìm conversation, nếu chưa có thì tạo mới
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId });
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

    // Tạo message mới
    const newMessage = await Message.create({
      conversationId: conversation._id,
      senderId: senderId,
      content,
      imgUrl,
    });

    // Xử lý data conversation sau khi tạo message mới
    updateConversationAfterCreateMessage(conversation, newMessage, senderId);
    await conversation.save();
    return res.status(201).json({ newMessage });
  } catch (error) {
    console.error("Error sending direct message", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

/**
 * Xử lý khi gửi tin nhắn nhóm
 */
export const sendGroupMessage = async (req, res) => {
  try {
    const { conversationId, content, imgUrl } = req.body;
    const conversation = req.conversation;
    const senderId = req.user._id;
    if (!content) {
      return res.status(400).json({
        message: "Content are required",
      });
    }
    const newMessage = await Message.create({
      conversationId: conversation._id,
      senderId: senderId,
      content,
      imgUrl,
    });

    updateConversationAfterCreateMessage(
      conversation,
      newMessage,
      senderId
    );
    await conversation.save();
    return res.status(201).json({ newMessage });
  } catch (error) {
    console.error("Error sending group message", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
