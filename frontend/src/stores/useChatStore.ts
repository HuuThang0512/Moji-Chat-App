import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatState } from "@/types/store";
import { chatService } from "@/services/chatService";
import { useAuthStore } from "./useAuthStore";
import { toast } from "sonner";
import type { Conversation, Message } from "@/types/chat";
import { useSocketStore } from "./useSocketStore";

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      messages: {},
      activeConversationId: null,
      conversationLoading: false,
      messagesLoading: false,
      loading: false,

      setActiveConversationId: (id: string | null) => {
        set({ activeConversationId: id });
      },
      reset: () => {
        set({ conversations: [], messages: {}, activeConversationId: null, conversationLoading: false, messagesLoading: false });
      },

      fetchConversations: async () => {
        try {
          set({ conversationLoading: true });
          const { conversations } = await chatService.fetchConversations();
          set({ conversations, conversationLoading: false });
        } catch(error) {
          console.error("Error fetching conversations", error);
          set({ conversationLoading: false });
        }
      },

      fetchMessages: async (conversationId?: string) => {
        const { activeConversationId, messages } = get();
        const { user } = useAuthStore.getState();
        const convoId = conversationId ?? activeConversationId;
        if(!convoId) return;

        const current = messages?.[convoId]
        if(current && !current.hasMore) return;

        const nextCursor = current?.nextCursor ?? "";

        set({ messagesLoading: true });
        try {
          const { messages: fetched, cursor } = await chatService.fetchMessages(convoId, nextCursor);
          const processed = fetched.map((m) => {
            return {
              ...m,
              isOwn: m.senderId === user?._id
            }
          })

          /**
           * Đoạn code này dùng để cập nhật state trong store khi fetch thêm message về.
           * 
           * - Hàm `set` nhận vào một function có tham số là `state` (đại diện cho state hiện tại).
           * - Trong context này, `state` chính là toàn bộ state của chat store, bao gồm: conversations, messages, activeConversationId, conversationLoading, messagesLoading, ...
           * 
           * Ở đây chỉ return về một object với key là `messages` (ví dụ: `{ messages: ... }`):
           *  - Nghĩa là chỉ cập nhật lại field `messages` trong state, những key khác (conversations, activeConversationId, ...) sẽ giữ nguyên giá trị cũ.
           *  - Nếu muốn cập nhật nhiều key thì return `{ messages: ..., conversations: ... }` v.v.
           * 
           * Lý do chỉ return mỗi `messages` là vì trong action này chỉ cần cập nhật danh sách message cho 1 conversation cụ thể, các phần còn lại không cần thay đổi.
           */
          set((state) => {
            const prev = state.messages[convoId]?.items ?? []
            // Đẩy tin nhắn mới nhất về phía trước
            const merged = prev.length > 0 ? [...processed, ...prev] : processed
            return {
              messages: {
                ...state.messages,
                [convoId]: {
                  items: merged,
                  hasMore: !!cursor,
                  nextCursor: cursor
                }
              }
              // Các field khác như conversations, activeConversationId, ... không bị affect vì không return trong object này.
            }
          })

        } catch(error) {
          console.error("Error fetching messages", error);
          set({ messagesLoading: false });
        } finally {
          set({ messagesLoading: false });
        }
      },

      sendDirectMessage: async (recipientId: string, content: string, imgUrl?: string, conversationId?: string): Promise<void> => {
        try {
          const { activeConversationId } = get();
          await chatService.sendDirectMessage(recipientId, content, imgUrl, activeConversationId ?? conversationId ?? undefined);

          set((state) => (
            {
              conversations: state.conversations.map((c) => c._id === activeConversationId ? { ...c, seenBy: [] } : c)
            }
          ))
        } catch(error) {
          console.error("Error sending direct message", error);
          toast.error("Failed to send direct message");
        }
      },
      sendGroupMessage: async (conversationId: string, content: string, imgUrl?: string): Promise<void> => {
        try {
          await chatService.sendGroupMessage(conversationId, content, imgUrl);

          set((state) => (
            {
              conversations: state.conversations.map((c) => c._id === conversationId ? { ...c, seenBy: [] } : c)
            }
          ))
        } catch(error) {
          console.error("Error sending group message", error);
          toast.error("Failed to send group message");
        }
      },

      addMessage: async (message: Message): Promise<void> => {
        try {
          const { user } = useAuthStore.getState();
          const { fetchMessages } = get();
          const convoId = message.conversationId;

          message.isOwn = message.senderId === user?._id;
          let prevMessages = get().messages[convoId]?.items ?? [];

          if(prevMessages.length === 0) {
            await fetchMessages(convoId);
            prevMessages = get().messages[convoId]?.items ?? [];
          }

          set((state) => {
            if(prevMessages.some((m) => m._id === message._id)) return state;

            return ({
              messages: {
                ...state.messages,
                [convoId]: {
                  items: [...prevMessages, message],
                  hasMore: state.messages[convoId]?.hasMore ?? false,
                  nextCursor: state.messages[convoId]?.nextCursor ?? null
                }
              }
            })
          })

        } catch(error) {
          console.error("Error adding message", error);
        }
      },

      updateConversation: (conversation: Conversation): void => {
        set((state) => ({
          conversations: state.conversations.map((c) => c._id === conversation._id ? conversation : c)
        }))
      },

      markAsSeen: async (): Promise<void> => {
        try {
          const { user } = useAuthStore.getState();
          const { activeConversationId, conversations } = get();

          if(!activeConversationId || !user) {
            return;
          }
          const convo = conversations.find((c) => c._id === activeConversationId);
          if(!convo) {
            return
          }

          // Skip if the current user is the sender of the last message
          if(convo.lastMessage?.sender?._id === user._id) {
            return;
          }

          if(typeof convo.unreadCount?.[user._id] === "number" && convo.unreadCount[user._id] === 0) return;

          await chatService.markAsSeen(activeConversationId);

          set((state) => ({
            conversations: state.conversations.map((c) => c._id === activeConversationId && c.lastMessage ? {
              ...c, unreadCount: {
                ...c.unreadCount,
                [user?._id]: 0
              }
            } : c)
          }))

        } catch(error) {
          console.error("Error marking as seen", error);
        }
      },

      addConvo: (convo: Conversation): void => {
        set((state) => {
          const exists = state.conversations.some((c) => c._id.toString() === convo._id.toString())
          return {
            conversations: exists ? state.conversations : [convo, ...state.conversations],
            activeConversationId: convo._id
          }
        })
      },
      createConversation: async (type: "direct" | "group", memberIds: string[], name?: string): Promise<void> => {
        try {
          set({ loading: true });
          const convo = await chatService.createConversation(type, memberIds, name);
          get().addConvo(convo);
          useSocketStore.getState().socket?.emit("join-conversation", convo._id);
        } catch(error) {
          console.error("Error creating conversation", error);
          toast.error("Failed to create conversation");
        }
        finally {
          set({ loading: false });
        }
      }
    }), {
    name: "chat-storage",
    partialize: (state) => ({
      conversations: state.conversations,
    })
  }
  )
)