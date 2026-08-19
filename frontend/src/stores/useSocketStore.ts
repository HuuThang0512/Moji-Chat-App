import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "./useAuthStore";
import type { SocketState } from "@/types/store";
import { useChatStore } from "./useChatStore";
import type { Conversation, LastMessage, Message } from "@/types/chat";

/**
 * VITE_SOCKET_URL để trống nghĩa là kết nối tới chính origin đang mở trang.
 * socket.io-client hiểu undefined theo đúng nghĩa đó, còn chuỗi rỗng thì không.
 */
const baseURL = import.meta.env.VITE_SOCKET_URL?.trim() || undefined;

interface NewMessagePayload {
  message: Message;
  conversation: {
    _id: string;
    type: Conversation["type"];
    lastMessage: LastMessage;
    lastMessageAt: string;
    seenBy: [];
  };
  unreadCount: Record<string, number>;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  onlineUsers: [],

  connectSocket: () => {
    if (get().socket) return;

    const socket: Socket = io(baseURL, {
      transports: ["websocket"],
      // auth dạng callback được gọi lại ở mỗi lần kết nối lại, nên sau khi
      // access token được làm mới socket vẫn xác thực được.
      auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
    });
    set({ socket });

    let hasConnectedBefore = false;
    socket.on("connect", () => {
      // Sau khi mất kết nối, các sự kiện trong lúc offline đã bị bỏ lỡ nên
      // phải tải lại danh sách cuộc trò chuyện để đồng bộ.
      if (hasConnectedBefore) {
        useChatStore.getState().fetchConversations();
      }
      hasConnectedBefore = true;
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connect error", error.message);
    });

    socket.on("online-users", (userIds: string[]) => {
      set({ onlineUsers: userIds });
    });

    /**
     * Tin nhắn mới. Server phát tới phòng riêng của từng thành viên, nên sự
     * kiện tới cả khi cuộc trò chuyện vừa được tạo và client chưa join phòng.
     */
    socket.on("new-message", async ({ message, conversation, unreadCount }: NewMessagePayload) => {
      const chat = useChatStore.getState();
      chat.addMessage(message);

      const known = chat.conversations.some((c) => c._id === conversation._id);
      if (!known) {
        // Cuộc trò chuyện lần đầu xuất hiện: kéo về đầy đủ kèm participants,
        // vì payload realtime cố tình không mang theo dữ liệu nặng đó.
        await chat.fetchConversations();
      } else {
        chat.updateConversation({
          _id: conversation._id,
          lastMessage: conversation.lastMessage,
          lastMessageAt: conversation.lastMessageAt,
          seenBy: [],
          unreadCount,
        });
      }

      if (useChatStore.getState().activeConversationId === message.conversationId) {
        await useChatStore.getState().markAsSeen();
      }
    });

    /** Ai đó đã đọc tin nhắn: chỉ trộn seenBy và unreadCount, giữ nguyên phần còn lại. */
    socket.on(
      "read-message",
      ({
        conversationId,
        seenBy,
        unreadCount,
      }: {
        conversationId: string;
        seenBy: Conversation["seenBy"];
        unreadCount: Record<string, number>;
      }) => {
        useChatStore.getState().updateConversation({ _id: conversationId, seenBy, unreadCount });
      }
    );

    socket.on("new-group", (conversation: Conversation) => {
      useChatStore.getState().addConvo(conversation);
      socket.emit("join-conversation", conversation._id);
    });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (!socket) return;
    socket.removeAllListeners();
    socket.disconnect();
    set({ socket: null, onlineUsers: [] });
  },
}));
