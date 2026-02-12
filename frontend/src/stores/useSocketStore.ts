import { create } from "zustand";
import { io,type Socket } from "socket.io-client";
import { useAuthStore } from "./useAuthStore";
import type { SocketState } from "@/types/store";
import { useChatStore } from "./useChatStore";

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

    // new message
    socket.on("new-message",({ message,conversation,unreadCount }) => {
      useChatStore.getState().addMessage(message);

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


      const currentConversations = useChatStore.getState().conversations;
      const prevConversation = currentConversations.find((c) => c._id === conversation._id);
      const updatedConversation = {
        ...prevConversation,
        lastMessage,
        unreadCount,
      };

      if(useChatStore.getState().activeConversationId == message.conversationId) {
        // Đánh dấu đã đọc
      }

      useChatStore.getState().updateConversation(updatedConversation);
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