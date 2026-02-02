import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatState } from "@/types/store";
import { chatService } from "@/services/chatService";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      messages: {},
      activeConversationId: null,
      conversationLoading: false,
      messagesLoading: false,

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
        } catch (error) {
          console.error("Error fetching conversations", error);
          set({ conversationLoading: false });
        }
      },

      fetchMessages: async (conversationId?: string) => {
        const { activeConversationId, messages } = get();
        const { user } = useAuthStore.getState();
        const convoId = conversationId ?? activeConversationId;
        if (!convoId) return;

        const current = messages?.[convoId]
        if (current && !current.hasMore) return;

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

        } catch (error) {
          console.error("Error fetching messages", error);
          set({ messagesLoading: false });
        } finally {
          set({ messagesLoading: false });
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