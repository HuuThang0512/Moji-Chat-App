import api from "@/lib/axios";
import type { User } from "@/types/user";

interface AuthTokenResponse {
  accessToken: string;
  user?: User;
}

export const authService = {
  signUp: async (
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string
  ) => {
    const res = await api.post("/auth/signup", {
      username,
      password,
      email,
      firstName,
      lastName,
    });
    return res.data;
  },

  signIn: async (username: string, password: string): Promise<AuthTokenResponse> => {
    const res = await api.post("/auth/signin", { username, password });
    return res.data;
  },

  signOut: async () => {
    const res = await api.post("/auth/signout", {});
    return res.data;
  },

  fetchMe: async (): Promise<User> => {
    const res = await api.get("/users/me");
    return res.data.user;
  },

  refresh: async (): Promise<AuthTokenResponse> => {
    const res = await api.post("/auth/refresh", {});
    return res.data;
  },
};
