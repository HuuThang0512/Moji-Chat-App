import type { Socket } from "socket.io-client";
import type { Conversation, Message } from "./chat";
import type { Friend, FriendRequest, User } from "./user";

export interface AuthState {
    accessToken: string | null;
    user: User | null;
    loading: boolean;

    setAccessToken: (accessToken: string) => void;
    setUser: (user: User) => void;
    clearState: () => void;
    signUp: (username: string, password: string, email: string, firstName: string, lastName: string) => Promise<boolean>;
    signIn: (username: string, password: string) => Promise<boolean>;
    signOut: () => Promise<boolean>;
    fetchMe: () => Promise<void>;
    refresh: () => Promise<void>;
}

export interface ThemeState {
    isDark: boolean;
    toggleTheme: () => void;
    setTheme: (dark: boolean) => void;
}

export interface ChatState {
    conversations: Conversation[];
    messages: Record<string, {
        items: Message[],
        hasMore: boolean;
        nextCursor: string | null;
    }>;
    activeConversationId: string | null;
    conversationLoading: boolean;
    messagesLoading: boolean;
    loading: boolean;
    reset: () => void;

    setActiveConversationId: (id: string | null) => void;
    fetchConversations: () => Promise<void>;
    fetchMessages: (conversationId?: string, options?: { loadMore?: boolean }) => Promise<void>;
    sendDirectMessage: (recipientId: string, content: string, imgUrl?: string, conversationId?: string) => Promise<void>;
    sendGroupMessage: (conversationId: string, content: string, imgUrl?: string) => Promise<void>;
    addMessage: (message: Message) => void;
    /** Trộn phần thay đổi vào conversation sẵn có; luôn phải kèm _id để tìm đúng bản ghi. */
    updateConversation: (patch: Partial<Conversation> & { _id: string }) => void;
    markAsSeen: () => Promise<void>;
    addConvo: (convo: Conversation, options?: { activate?: boolean }) => void;
    createConversation: (type: "direct" | "group", memberIds: string[], name?: string) => Promise<void>;
}

export interface SocketState {
    socket: Socket | null;
    onlineUsers: string[];
    connectSocket: () => void;
    disconnectSocket: () => void;

}

export interface FriendState {
    friends: Friend[];
    loading: boolean;
    receivedList: FriendRequest[];
    sentList: FriendRequest[];
    searchUserByUsername: (username: string) => Promise<User | null>;
    addFriend: (to: string, message?: string) => Promise<string>;
    getAllFriendRequests: () => Promise<void>;
    acceptRequest: (requestId: string) => Promise<void>;
    declineRequest: (requestId: string) => Promise<void>;
    getFriends: () => Promise<void>;
}

export interface UserState {
    updateAvatarUrl: (formData: FormData) => Promise<void>;
}