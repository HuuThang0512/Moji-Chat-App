import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { io } from "../socket/index.js";
import { asyncHandler, notFound } from "../utils/AppError.js";

const POPULATE_CONVERSATION = [
  { path: "participants.userId", select: "_id displayName username avatarUrl" },
  { path: "seenBy.userId", select: "_id displayName avatarUrl" },
  { path: "lastMessage.senderId", select: "_id displayName avatarUrl" },
];

/** Làm phẳng participants để client không phải lặn vào participant.userId. */
const formatConversation = (conversation) => {
  const plain = conversation.toObject ? conversation.toObject({ flattenMaps: true }) : conversation;
  return {
    ...plain,
    participants: (conversation.participants ?? []).map((p) => ({
      _id: p.userId?._id ?? p.userId,
      displayName: p.userId?.displayName,
      username: p.userId?.username,
      avatarUrl: p.userId?.avatarUrl ?? null,
      joinedAt: p.joinedAt,
    })),
  };
};

export const createConversation = asyncHandler(async (req, res) => {
  const { type, memberIds, name } = req.body;
  const senderId = req.user._id;

  let conversation;

  if (type === "direct") {
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
  } else {
    // Loại bỏ trùng lặp và loại chính người tạo ra khỏi memberIds trước khi ghép.
    const uniqueMemberIds = [
      ...new Set(memberIds.map(String).filter((id) => id !== senderId.toString())),
    ];

    conversation = await Conversation.create({
      type: "group",
      participants: [
        { userId: senderId, joinedAt: new Date() },
        ...uniqueMemberIds.map((id) => ({ userId: id, joinedAt: new Date() })),
      ],
      group: { name, createdBy: senderId },
      lastMessageAt: new Date(),
      unreadCount: new Map(),
    });
  }

  await conversation.populate(POPULATE_CONVERSATION);
  const formatted = formatConversation(conversation);

  if (type === "group") {
    formatted.participants
      .map((participant) => participant._id.toString())
      .filter((id) => id !== senderId.toString())
      .forEach((id) => io.to(id).emit("new-group", formatted));
  }

  return res.status(201).json({ conversation: formatted });
});

export const getConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ "participants.userId": req.user._id })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .populate(POPULATE_CONVERSATION);

  return res.status(200).json({ conversations: conversations.map(formatConversation) });
});

/**
 * Lấy tin nhắn theo cursor-based pagination.
 * Sắp xếp giảm dần theo createdAt rồi lấy thừa một bản ghi để biết còn trang cũ
 * hơn hay không; bản ghi thừa bị loại ra và createdAt của nó thành cursor kế tiếp.
 * Mảng được đảo lại trước khi trả về để client hiển thị từ cũ tới mới.
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { limit, cursor } = req.validatedQuery;

  const query = { conversationId };
  if (cursor) {
    query.createdAt = { $lt: new Date(cursor) };
  }

  const messages = await Message.find(query).sort({ createdAt: -1 }).limit(limit + 1).lean();

  const hasMore = messages.length > limit;
  let nextCursor = null;
  if (hasMore) {
    messages.pop();
    nextCursor = messages[messages.length - 1].createdAt.toISOString();
  }

  messages.reverse();
  return res.status(200).json({ messages, nextCursor });
});

export const getUserConversationsForSocketIO = async (userId) => {
  try {
    const conversations = await Conversation.find({ "participants.userId": userId }, { _id: 1 }).lean();
    return conversations.map((conversation) => conversation._id.toString());
  } catch (error) {
    console.error("Error getting user conversations for socketIO", error);
    return [];
  }
};

/** Dùng bởi socket để chặn việc join vào phòng của cuộc trò chuyện không thuộc về mình. */
export const isUserInConversation = async (conversationId, userId) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(String(conversationId ?? ""))) return false;
    const found = await Conversation.exists({
      _id: conversationId,
      "participants.userId": userId,
    });
    return Boolean(found);
  } catch (error) {
    console.error("Error checking conversation membership", error);
    return false;
  }
};

export const markAsSeen = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id.toString();
  const conversation = req.conversation;

  if (!conversation) {
    throw notFound("Conversation not found");
  }

  const last = conversation.lastMessage;
  if (!last) {
    return res.status(200).json({ message: "Conversation has no last message", seenBy: [], myUnreadCount: 0 });
  }
  if (last.senderId.toString() === userId) {
    return res.status(200).json({ message: "You are the last message sender", seenBy: conversation.seenBy ?? [], myUnreadCount: 0 });
  }

  const updated = await Conversation.findByIdAndUpdate(
    conversationId,
    {
      $addToSet: { seenBy: { userId } },
      $set: { [`unreadCount.${userId}`]: 0 },
    },
    { new: true }
  ).populate([
    { path: "seenBy.userId", select: "_id displayName avatarUrl" },
    { path: "lastMessage.senderId", select: "_id displayName avatarUrl" },
  ]);

  const plain = updated?.toObject({ flattenMaps: true });

  // Chỉ phát phần thực sự thay đổi. Trước đây payload chứa một conversation
  // thiếu participants/type khiến client ghi đè mất dữ liệu của conversation.
  io.to(conversationId.toString()).emit("read-message", {
    conversationId: conversationId.toString(),
    seenBy: plain?.seenBy ?? [],
    unreadCount: plain?.unreadCount ?? {},
  });

  return res.status(200).json({
    message: "Marked as seen",
    seenBy: plain?.seenBy ?? [],
    myUnreadCount: plain?.unreadCount?.[userId] ?? 0,
  });
});
