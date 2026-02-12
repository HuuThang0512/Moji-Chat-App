import Conversation from "../models/Conversation.js";

export const updateConversationAfterCreateMessage = (
  conversation,
  message,
  senderId
) => {
  try {
    conversation.set({
      seenBy: [],
      lastMessageAt: new Date(),
      lastMessage: {
        _id: message._id,
        senderId: senderId,
        content: message.content,
        createdAt: message.createdAt,
      },
    });
    conversation.participants.forEach((user) => {
      const memberId = user.userId.toString();
      const isSender = memberId === senderId.toString();
      const prevCount = conversation.unreadCount.get(memberId) || 0;
      conversation.unreadCount.set(memberId, isSender ? 0 : prevCount + 1);
    });
  } catch (error) {
    console.error("Error updating conversation after create message", error);
    throw error;
  }
};

export const emitNewMessage = (io, conversation, message) => {
  io.to(conversation._id.toString()).emit("new-message", {
    message,
    conversation: {
      _id: conversation._id,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
    },
    unreadCount: conversation.unreadCount,
  })
}