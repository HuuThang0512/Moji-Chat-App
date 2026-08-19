import { create } from "zustand";
import { toast } from "sonner";
import type { ChatState } from "@/types/store";
import { chatService } from "@/services/chatService";
import { useAuthStore } from "./useAuthStore";
import type { Conversation, Message } from "@/types/chat";
import { useSocketStore } from "./useSocketStore";

/**
 * Gộp hai danh sách tin nhắn, loại trùng theo _id và sắp xếp từ cũ tới mới.
 * Cần thiết vì tin nhắn có thể tới từ hai nguồn cùng lúc: phản hồi HTTP khi
 * phân trang và sự kiện socket realtime.
 */
const mergeMessages = (existing: Message[], incoming: Message[]): Message[] => {
  const byId = new Map<string, Message>();
  for (const message of existing) byId.set(message._id, message);
  for (const message of incoming) byId.set(message._id, message);
  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};

const withOwnership = (messages: Message[], userId?: string): Message[] =>
  messages.map((message) => ({ ...message, isOwn: message.senderId === userId }));

export const useChatStore = create<ChatState>()((set, get) => ({
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
    set({
      conversations: [],
      messages: {},
      activeConversationId: null,
      conversationLoading: false,
      messagesLoading: false,
      loading: false,
    });
  },

  fetchConversations: async () => {
    try {
      set({ conversationLoading: true });
      const { conversations } = await chatService.fetchConversations();
      set({ conversations });
    } catch (error) {
      console.error("Error fetching conversations", error);
    } finally {
      set({ conversationLoading: false });
    }
  },

  /**
   * Không truyền loadMore: tải trang đầu, và bỏ qua nếu cuộc trò chuyện đã có
   * tin nhắn trong bộ nhớ (realtime giữ cho danh sách luôn mới).
   * loadMore = true: tải tiếp trang cũ hơn bằng cursor.
   */
  fetchMessages: async (conversationId?: string, options?: { loadMore?: boolean }) => {
    const convoId = conversationId ?? get().activeConversationId;
    if (!convoId) return;

    const loadMore = options?.loadMore ?? false;
    const current = get().messages[convoId];

    if (loadMore) {
      if (!current?.hasMore || !current.nextCursor || get().messagesLoading) return;
    } else if (current) {
      return;
    }

    set({ messagesLoading: true });
    try {
      const cursor = loadMore ? current?.nextCursor ?? undefined : undefined;
      const { messages: fetched, cursor: nextCursor } = await chatService.fetchMessages(
        convoId,
        cursor
      );
      const userId = useAuthStore.getState().user?._id;
      const processed = withOwnership(fetched, userId);

      set((state) => ({
        messages: {
          ...state.messages,
          [convoId]: {
            items: mergeMessages(state.messages[convoId]?.items ?? [], processed),
            hasMore: Boolean(nextCursor),
            nextCursor: nextCursor ?? null,
          },
        },
      }));
    } catch (error) {
      console.error("Error fetching messages", error);
      toast.error("Không tải được tin nhắn");
    } finally {
      set({ messagesLoading: false });
    }
  },

  sendDirectMessage: async (
    recipientId: string,
    content: string,
    imgUrl?: string,
    conversationId?: string
  ): Promise<void> => {
    const targetId = conversationId ?? get().activeConversationId ?? undefined;
    try {
      await chatService.sendDirectMessage(recipientId, content, imgUrl, targetId);
      if (targetId) {
        get().updateConversation({ _id: targetId, seenBy: [] });
      }
    } catch (error) {
      console.error("Error sending direct message", error);
      toast.error("Không gửi được tin nhắn");
      throw error;
    }
  },

  sendGroupMessage: async (
    conversationId: string,
    content: string,
    imgUrl?: string
  ): Promise<void> => {
    try {
      await chatService.sendGroupMessage(conversationId, content, imgUrl);
      get().updateConversation({ _id: conversationId, seenBy: [] });
    } catch (error) {
      console.error("Error sending group message", error);
      toast.error("Không gửi được tin nhắn");
      throw error;
    }
  },

  /**
   * Thêm tin nhắn realtime vào bộ nhớ.
   * Nếu cuộc trò chuyện chưa từng được mở thì bỏ qua: toàn bộ lịch sử sẽ được
   * tải khi người dùng mở nó, thêm lẻ một tin ở đây sẽ khiến lần mở sau tưởng
   * là đã tải xong và chỉ hiển thị đúng một tin.
   */
  addMessage: (message: Message): void => {
    const convoId = message.conversationId;
    const existing = get().messages[convoId];
    if (!existing) return;

    const userId = useAuthStore.getState().user?._id;
    const incoming = { ...message, isOwn: message.senderId === userId };

    set((state) => {
      const entry = state.messages[convoId];
      if (!entry || entry.items.some((item) => item._id === incoming._id)) return state;
      return {
        messages: {
          ...state.messages,
          [convoId]: { ...entry, items: mergeMessages(entry.items, [incoming]) },
        },
      };
    });
  },

  /**
   * Trộn phần thay đổi vào conversation đang có thay vì thay thế cả object.
   * Payload từ socket chỉ chứa vài field; thay thế nguyên object sẽ xoá mất
   * participants và type, khiến card biến mất khỏi sidebar.
   */
  updateConversation: (patch: Partial<Conversation> & { _id: string }): void => {
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        conversation._id === patch._id ? { ...conversation, ...patch } : conversation
      ),
    }));
  },

  markAsSeen: async (): Promise<void> => {
    const { user } = useAuthStore.getState();
    const { activeConversationId, conversations } = get();
    if (!activeConversationId || !user) return;

    const convo = conversations.find((c) => c._id === activeConversationId);
    if (!convo?.lastMessage) return;
    if (convo.lastMessage.sender?._id === user._id) return;
    if (convo.unreadCount?.[user._id] === 0) return;

    try {
      const result = await chatService.markAsSeen(activeConversationId);
      get().updateConversation({
        _id: activeConversationId,
        seenBy: result?.seenBy ?? convo.seenBy,
        unreadCount: { ...convo.unreadCount, [user._id]: 0 },
      });
    } catch (error) {
      console.error("Error marking as seen", error);
    }
  },

  /** Thêm conversation vào danh sách nếu chưa có, và trả về conversation đó. */
  addConvo: (convo: Conversation, options?: { activate?: boolean }): void => {
    set((state) => {
      const exists = state.conversations.some((c) => c._id === convo._id);
      return {
        conversations: exists
          ? state.conversations.map((c) => (c._id === convo._id ? { ...c, ...convo } : c))
          : [convo, ...state.conversations],
        activeConversationId: options?.activate
          ? convo._id
          : state.activeConversationId,
      };
    });
  },

  createConversation: async (
    type: "direct" | "group",
    memberIds: string[],
    name?: string
  ): Promise<void> => {
    try {
      set({ loading: true });
      const convo = await chatService.createConversation(type, memberIds, name);
      get().addConvo(convo, { activate: true });
      await get().fetchMessages(convo._id);
      useSocketStore.getState().socket?.emit("join-conversation", convo._id);
    } catch (error) {
      console.error("Error creating conversation", error);
      toast.error("Không tạo được cuộc trò chuyện");
    } finally {
      set({ loading: false });
    }
  },
}));
