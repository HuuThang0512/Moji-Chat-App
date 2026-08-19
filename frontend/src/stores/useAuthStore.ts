import { create } from "zustand";
import { toast } from "sonner";
import { persist } from "zustand/middleware";
import { authService } from "@/services/authService";
import type { AuthState } from "@/types/store";
import type { User } from "@/types/user";
import { useChatStore } from "./useChatStore";
import { useSocketStore } from "./useSocketStore";
import { getErrorMessage } from "@/lib/errors";

const AUTH_STORAGE_KEY = "auth-storage";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      loading: false,

      setAccessToken: (accessToken: string) => {
        set({ accessToken });
      },

      setUser: (user: User) => {
        set({ user });
      },

      /**
       * Xoá toàn bộ dấu vết phiên đăng nhập.
       * Chỉ xoá đúng key của auth thay vì localStorage.clear(), nếu không thì
       * cả lựa chọn giao diện sáng/tối của người dùng cũng bị xoá theo.
       */
      clearState: () => {
        set({ accessToken: null, user: null, loading: false });
        useChatStore.getState().reset();
        useSocketStore.getState().disconnectSocket();
        localStorage.removeItem(AUTH_STORAGE_KEY);
      },

      signUp: async (username, password, email, firstName, lastName) => {
        try {
          set({ loading: true });
          await authService.signUp(username, password, email, firstName, lastName);
          toast.success("Đăng ký thành công, hãy đăng nhập");
          return true;
        } catch (error) {
          console.error("Error signing up", error);
          toast.error(getErrorMessage(error, "Đăng ký thất bại"));
          return false;
        } finally {
          set({ loading: false });
        }
      },

      signIn: async (username: string, password: string) => {
        try {
          get().clearState();
          set({ loading: true });

          // Backend trả kèm user ngay trong response đăng nhập nên không cần
          // gọi thêm /users/me.
          const { accessToken, user } = await authService.signIn(username, password);
          set({ accessToken, user: user ?? null });

          if (!user) await get().fetchMe();
          await useChatStore.getState().fetchConversations();

          toast.success("Đăng nhập thành công");
          return true;
        } catch (error) {
          console.error("Error signing in", error);
          toast.error(getErrorMessage(error, "Đăng nhập thất bại"));
          return false;
        } finally {
          set({ loading: false });
        }
      },

      signOut: async () => {
        try {
          set({ loading: true });
          await authService.signOut();
          return true;
        } catch (error) {
          console.error("Error signing out", error);
          return false;
        } finally {
          // Luôn dọn state ở client kể cả khi gọi API thất bại, để người dùng
          // không bị kẹt trong trạng thái đăng nhập dở dang.
          get().clearState();
          toast.success("Đã đăng xuất");
        }
      },

      fetchMe: async () => {
        try {
          set({ loading: true });
          const user = await authService.fetchMe();
          set({ user });
        } catch (error) {
          console.error("Error fetching me", error);
          set({ user: null, accessToken: null });
        } finally {
          set({ loading: false });
        }
      },

      refresh: async () => {
        try {
          set({ loading: true });
          const { accessToken, user } = await authService.refresh();
          set({ accessToken, ...(user ? { user } : {}) });
          if (!get().user) await get().fetchMe();
        } catch {
          // Không có phiên hợp lệ là trường hợp bình thường khi mở app lần đầu,
          // nên chỉ dọn state chứ không hiện lỗi.
          set({ accessToken: null, user: null });
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({ user: state.user }),
    }
  )
);
