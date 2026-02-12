import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import Message from "../models/Message.js";

export const createConversation = async (req, res) => {
  try {
    const { type, memberIds, name } = req.body;
    const senderId = req.user._id;
    // Kiểm tra nếu như không có type, hoặc là group nhưng điều kiện group sai
    if(
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
    if(type == "direct") {
      const toUserId = memberIds[0];
      conversation = await Conversation.findOne({
        type: "direct",
        "participants.userId": { $all: [senderId, toUserId] },
      });
      if(!conversation) {
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
    if((type == "group")) {
      conversation = await Conversation.create({
        type: "group",
        participants: [
          { userId: senderId, joinedAt: new Date() },
          ...memberIds.map((id) => ({ userId: id, joinedAt: new Date() })),
        ],
        group: { name: name, createdBy: senderId },
        lastMessageAt: new Date(),
        unreadCount: new Map(),
      });
      await conversation.save();
    }

    if(!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Populate để trả về thêm thông tin của conversation
    conversation.populate([
      { path: "participants.userId", select: "_id displayName avatarUrl" },
      { path: "seenBy.userId", select: "_id displayName avatarUrl" },
      { path: "lastMessage.senderId", select: "_id displayName avatarUrl" },
    ]);
    return res.status(201).json({ conversation });
  } catch(error) {
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
      const conversationObject = convo.toObject({ flattenMaps: true });
      // const unreadCount = conversationObject.unreadCount ?? {};
      // const lastMessage = conversationObject.lastMessage ?? null;
      return {
        ...conversationObject,
        // unreadCount,
        // lastMessage,
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
  /**
   * Giải thích đoạn code:
   * Đây là hàm lấy danh sách tin nhắn cho một cuộc trò chuyện với phân trang (cursor-based pagination).
   * 
   * 1. Lấy conversationId từ tham số đường dẫn (req.params), lấy limit (mặc định 50) và cursor (thời gian tin nhắn) từ query string.
   * 2. Tạo query để tìm các tin nhắn thuộc conversationId đã cho.
   *    - Nếu có cursor, chỉ lấy các tin nhắn có createdAt nhỏ hơn cursor (tức là các tin nhắn cũ hơn cursor).
   * 3. Tìm các tin nhắn theo query, sắp xếp giảm dần theo createdAt (tin nhắn mới nhất trước), 
   *    và lấy limit + 1 tin nhắn (để kiểm tra còn tin nhắn cũ hơn nữa không).
   * 4. Kiểm tra nếu có nhiều hơn limit tin nhắn, nghĩa là còn trang sau:
   *    - nextCursor sẽ là createdAt của tin nhắn cuối cùng (dùng cho lần truy vấn tiếp theo).
   *    - Xóa tin nhắn thừa ra khỏi danh sách trả về cho client.
   * 5. Đảo ngược mảng tin nhắn trước khi trả về để client hiển thị đúng thứ tự tăng dần thời gian.
   * 6. Trả về JSON gồm messages và nextCursor (nếu có tiếp).
   */

  try {
    const { conversationId } = req.params; // Lấy conversationId từ URL
    const { limit = 50, cursor } = req.query; // limit mặc định là 50, cursor là mốc thời gian
    const query = { conversationId };
    if(cursor) {
      // Nếu có cursor thì chỉ lấy các tin nhắn cũ hơn nó
      query.createdAt = { $lt: new Date(cursor) };
    }
    let messages = await Message.find(query)
      .sort({ createdAt: -1 }) // Sắp xếp mới nhất trước
      .limit(Number(limit) + 1); // Lấy thừa 1 tin nhắn để kiểm tra còn nữa không

    const hasMore = messages.length > limit;
    let nextCursor = null;
    if(hasMore) {
      // Nếu còn trang sau thì trả về cursor cho lần sau, và bỏ tin nhắn thừa đi
      nextCursor = messages[messages.length - 1].createdAt.toISOString();
      messages.pop();
    }
    messages.reverse(); // Đảo thứ tự lại cho client hiện thị từ cũ đến mới
    return res.status(200).json({ messages, nextCursor });
  } catch(error) {
    console.error("Error getting messages", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const getUserConversationsForSocketIO = async (userId) => {
  try {
    const conversations = await Conversation.find({
      "participants.userId": userId,
    }, {
      _id: 1,
    })
    return conversations.map((convo) => convo._id.toString());
  } catch(error) {
    console.error("Error getting user conversations for socketIO", error);
    return [];
  }
}