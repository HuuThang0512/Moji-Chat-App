/**
 * Cập nhật snapshot lastMessage + bộ đếm chưa đọc trên conversation sau khi tạo
 * message mới. Người gửi luôn được đặt về 0, các thành viên khác tăng thêm một.
 */
export const updateConversationAfterCreateMessage = (conversation, message, senderId) => {
  conversation.set({
    seenBy: [],
    lastMessageAt: message.createdAt ?? new Date(),
    lastMessage: {
      _id: message._id,
      senderId,
      content: message.content,
      createdAt: message.createdAt,
    },
  });

  conversation.participants.forEach((participant) => {
    const memberId = participant.userId.toString();
    const isSender = memberId === senderId.toString();
    const prevCount = conversation.unreadCount.get(memberId) ?? 0;
    conversation.unreadCount.set(memberId, isSender ? 0 : prevCount + 1);
  });
};

/**
 * Phát tin nhắn tới phòng riêng của từng thành viên thay vì phòng của
 * conversation. Với một cuộc trò chuyện vừa được tạo, socket của người nhận
 * chưa kịp join phòng conversation nên nếu phát vào phòng đó tin nhắn đầu tiên
 * sẽ bị mất cho tới khi người nhận tải lại trang.
 */
export const emitNewMessage = (io, conversation, message, sender) => {
  const payload = {
    message,
    conversation: {
      _id: conversation._id.toString(),
      type: conversation.type,
      lastMessageAt: conversation.lastMessageAt,
      lastMessage: {
        _id: message._id,
        content: message.content,
        createdAt: message.createdAt,
        sender: {
          _id: sender?._id?.toString() ?? message.senderId.toString(),
          displayName: sender?.displayName ?? "",
          avatarUrl: sender?.avatarUrl ?? null,
        },
      },
      seenBy: [],
    },
    unreadCount: Object.fromEntries(conversation.unreadCount),
  };

  conversation.participants.forEach((participant) => {
    io.to(participant.userId.toString()).emit("new-message", payload);
  });
};
