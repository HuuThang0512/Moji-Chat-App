import type { Conversation, Message } from "./chat";
import type { User } from "./user";

export interface AuthState {
    accessToken: string | null;
    user: User | null;
    loading: boolean;

    setAccessToken: (accessToken: string) => void;
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
    loading: boolean;
    reset: () => void;

    setActiveConversationId: (id: string | null) => void;
    fetchConversations: () => Promise<void>;
}