import api from "@/lib/axios";
import type { Conversation, ConversationResponse, Message, SeenUser } from "@/types/chat";

interface FetchMessagesResult {
  messages: Message[];
  cursor: string | null;
}

interface MarkAsSeenResult {
  message: string;
  seenBy: SeenUser[];
  myUnreadCount: number;
}

const PAGE_LIMIT = 50;

export const chatService = {
  async fetchConversations(): Promise<ConversationResponse> {
    const res = await api.get("/conversations");
    return res.data;
  },

  async fetchMessages(id: string, cursor?: string): Promise<FetchMessagesResult> {
    const res = await api.get(`/conversations/${id}/messages`, {
      // Truyền qua params để axios tự bỏ qua cursor rỗng thay vì gửi "cursor=".
      params: { limit: PAGE_LIMIT, ...(cursor ? { cursor } : {}) },
    });
    return {
      messages: res.data.messages ?? [],
      cursor: res.data.nextCursor ?? null,
    };
  },

  async sendDirectMessage(
    recipientId: string,
    content: string,
    imgUrl?: string,
    conversationId?: string
  ): Promise<Message> {
    const res = await api.post("/messages/direct", {
      recipientId,
      content,
      ...(imgUrl ? { imgUrl } : {}),
      ...(conversationId ? { conversationId } : {}),
    });
    return res.data.newMessage;
  },

  async sendGroupMessage(
    conversationId: string,
    content: string,
    imgUrl?: string
  ): Promise<Message> {
    const res = await api.post("/messages/group", {
      conversationId,
      content,
      ...(imgUrl ? { imgUrl } : {}),
    });
    return res.data.newMessage;
  },

  async markAsSeen(conversationId: string): Promise<MarkAsSeenResult> {
    const res = await api.patch(`/conversations/${conversationId}/seen`);
    return res.data;
  },

  async createConversation(
    type: "direct" | "group",
    memberIds: string[],
    name?: string
  ): Promise<Conversation> {
    const res = await api.post("/conversations", {
      type,
      memberIds,
      ...(name ? { name } : {}),
    });
    return res.data.conversation;
  },
};
