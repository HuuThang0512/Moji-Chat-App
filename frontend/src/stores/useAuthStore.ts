import { create } from "zustand";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import type { AuthState } from "@/types/store";

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  loading: false,

  setAccessToken: (accessToken: string) => {
    set({ accessToken });
  },

  clearState: () => {
    set({ accessToken: null, user: null, loading: false });
  },

  signUp: async (
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string
  ) => {
    try {
      set({ loading: true });
      const res = await authService.signUp(
        username,
        password,
        email,
        firstName,
        lastName
      );
      toast.success("Sign up successful");
      return true; // Trả về true khi thành công
    } catch (error) {
      console.error("Error signing up", error);
      toast.error("Failed to sign up");
      return false; // Trả về false khi thất bại
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (username: string, password: string) => {
    try {
      set({ loading: true });
      const { accessToken } = await authService.signIn(username, password);
      get().setAccessToken(accessToken);
      await get().fetchMe();
      toast.success("Sign in successful");
      return true; // Trả về true khi thành công
    } catch (error) {
      console.error("Error signing in", error);
      toast.error("Failed to sign in");
      return false; // Trả về false khi thất bại
    } finally {
      set({ loading: false });
    }
  },
  signOut: async () => {
    try {
      set({ loading: true });
      await authService.signOut();
      get().clearState();
      toast.success("Sign out successful");
      return true; // Trả về true khi thành công
    } catch (error) {
      console.error("Error signing out", error);
      toast.error("Failed to sign out");
      return false; // Trả về false khi thất bại
    } finally {
      set({ loading: false });
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
      toast.error("Failed to fetch information of user");
    } finally {
      set({ loading: false });
    }
  },
  refresh: async () => {
    try {
      set({ loading: true });
      const res = await authService.refresh();
      get().setAccessToken(res.accessToken);
      if (!get().user) {
        await get().fetchMe();
      }
    } catch (error) {
      console.error("Error refreshing token", error);
      toast.error("Your session has expired, please sign in again");
    } finally {
      set({ loading: false });
    }
  }
}));
