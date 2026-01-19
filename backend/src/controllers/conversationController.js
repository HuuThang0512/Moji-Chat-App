import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import Message from "../models/Message.js";

export const createConversation = async (req, res) => {
  try {
    const { type, memberIds, name } = req.body;
    const senderId = req.user._id;
    // Kiểm tra nếu như không có type, hoặc là group nhưng điều kiện group sai
    if (
      !type ||
      (type == "group" &&
        (!name ||
          !memberIds ||
          !Array.isArray(memberIds) ||
          memberIds.length < 2))
    ) {
      return res.status(400).json({ message: "Invalid request body" });
    }

    let conversation;

    // Nếu là direct thì kiểm tra conversation đã có chưa, nếu chưa thì tạo mới
    if (type == "direct") {
      const toUserId = memberIds[0];
      conversation = await Conversation.findOne({
        type: "direct",
        "participants.userId": { $all: [senderId, toUserId] },
      });
      if (!conversation) {
        conversation = await Conversation.create({
          type: "direct",
          participants: [
            { userId: senderId, joinedAt: new Date() },
            { userId: toUserId, joinedAt: new Date() },
          ],
          lastMessageAt: new Date(),
          unreadCount: new Map(),
        });
      }
      await conversation.save();
    }

    // Nếu là nhóm thì tạo nhóm mới
    if ((type == "group")) {
      conversation = await Conversation.create({
        type: "group",
        participants: [
          { userId: senderId, joinedAt: new Date() },
          ...memberIds.map((id) => ({ userId: id, joinedAt: new Date() })),
        ],
        group: { name: name, createdBy: senderId },
        lastMessageAt: new Date(),
      });
      await conversation.save();
    }

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Populate để trả về thêm thông tin của conversation
    conversation.populate([
      { path: "participants.userId", select: "_id displayName avatarUrl" },
      { path: "seenBy.userId", select: "_id displayName avatarUrl" },
      { path: "lastMessage.senderId", select: "_id displayName avatarUrl" },
    ]);
    return res.status(201).json({ conversation });
  } catch (error) {
    console.error("Error creating conversation", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({
      "participants.userId": userId,
    })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate([
        { path: "participants.userId", select: "_id displayName avatarUrl" },
        { path: "seenBy.userId", select: "_id displayName avatarUrl" },
        { path: "lastMessage.senderId", select: "_id displayName avatarUrl" },
      ]);

    // Format lại data conversation để trả về js dễ sử dụng
    const fomatted = conversations.map((convo) => {
      const paticipants = (convo.participants || []).map((p) => ({
        _id: p.userId?._id,
        displayName: p.userId?.displayName,
        avatarUrl: p.userId?.avatarUrl ?? null,
        joinedAt: p.joinedAt,
      }));
      return {
        ...convo.toObject(),
        unreadCount: convo.unreadCount ?? {},
        participants: paticipants,
      };
    });
    return res.status(200).json({ conversations: fomatted });
  } catch {
    console.error("Error getting conversations", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, cursor } = req.query;
    const query = { conversationId };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }
    let messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .sort({ createdAt: -1 });
    const hasMore = messages.length > limit;
    let nextCursor = null;
    if (hasMore) {
      nextCursor = messages[messages.length - 1].createdAt.toISOString();
      messages.pop();
    }
    messages.reverse();
    return res.status(200).json({ messages, nextCursor });
  } catch (error) {
    console.error("Error getting messages", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
