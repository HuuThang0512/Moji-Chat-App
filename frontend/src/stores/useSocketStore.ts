import { create } from "zustand";
import { io,type Socket } from "socket.io-client";
import { useAuthStore } from "./useAuthStore";
import type { SocketState } from "@/types/store";
import { useChatStore } from "./useChatStore";
import type { Conversation } from "@/types/chat";

const baseURL = import.meta.env.VITE_SOCKET_URL;

export const useSocketStore = create<SocketState>((set,get) => ({
  socket: null,
  onlineUsers: [],
  connectSocket: () => {
    const accessToken = useAuthStore.getState().accessToken;
    const existingSocket = get().socket;
    if(existingSocket) {
      return;
    }
    const socket: Socket = io(baseURL,{
      transports: ["websocket"],
      auth: {
        token: accessToken,
      },
    });
    set({ socket });
    socket.on("connect",() => {
      console.log("Socket connected");
    });

    // online users
    socket.on("online-users",(userIds: string[]) => {
      set({ onlineUsers: userIds });
    });

    /**
     * Sự kiện "new-message" được gọi mỗi khi có tin nhắn mới được gửi trong một cuộc trò chuyện nào đó.
     * - Đầu tiên, ta thêm message mới vào state messages của từng cuộc trò chuyện.
     * - Sau đó cập nhật lại lastMessage và số lượng chưa đọc (unreadCount) cho đúng cuộc trò chuyện.
     * 
     * Lưu ý quan trọng: Nếu người dùng đang mở đúng phòng chat này (tức là activeConversationId == message.conversationId)
     * thì gọi hàm markAsSeen để đánh dấu tin nhắn cuối cùng đã "được đọc".
     * 
     * markAsSeen sẽ gửi request tới backend để cập nhật trạng thái đã đọc của người dùng với conversation này,
     * backend sẽ reset số lượng tin chưa đọc (unreadCount) về 0 cho user, đồng thời phát lại sự kiện "read-message" cho những socket
     * khác. Frontend cũng sẽ cập nhật lại conversation với unreadCount mới.
     */
    socket.on("new-message", ({ message, conversation, unreadCount }) => {
      // Thêm tin nhắn mới vào local state (realtime UI)
      useChatStore.getState().addMessage(message);

      // Cập nhật đối tượng lastMessage cho conversation.
      // Lưu ý: Trường sender bên lastMessage chỉ chứa _id, vì thông tin sender đã được populate từ backend rồi.
      const lastMessage = {
        _id: conversation.lastMessage._id,
        content: conversation.lastMessage.content,
        createdAt: conversation.lastMessage.createdAt,
        sender: {
          _id: conversation.lastMessage.senderId,
          displayName: "",
          avatarUrl: null,
        },
      };

      // Tìm hội thoại cũ để cập nhật.
      const currentConversations = useChatStore.getState().conversations;
      const prevConversation = currentConversations.find((c) => c._id === conversation._id);
      const updatedConversation = {
        ...prevConversation,
        lastMessage,
        unreadCount,
      };

      // Cập nhật conversation trên UI (lastMessage + unreadCount)
      useChatStore.getState().updateConversation(updatedConversation as Conversation);

      // Đánh dấu đã đọc sau khi state unreadCount đã được cập nhật
      if (useChatStore.getState().activeConversationId === message.conversationId) {
        useChatStore.getState().markAsSeen();
      }
    });

    // Read message
    socket.on("read-message", ({ conversation, lastMessage }) => {
      const updated = {
        _id: conversation._id,
        lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: conversation.unreadCount,
        seenBy: conversation.seenBy,
      }
      useChatStore.getState().updateConversation(updated as Conversation);
    })



  },
  disconnectSocket: () => {
    const socket = get().socket;
    if(socket) {
      socket.disconnect();
      set({ socket: null });

    }
  }
}))