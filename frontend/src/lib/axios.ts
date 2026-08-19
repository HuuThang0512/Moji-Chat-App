import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/useAuthStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Để gửi cookie refreshToken đến backend
});

/** Những route không bao giờ được thử refresh, tránh vòng lặp vô hạn. */
const NO_REFRESH_PATHS = ["/auth/signin", "/auth/signup", "/auth/refresh", "/auth/signout"];

type RetriableConfig = AxiosRequestConfig & { _retried?: boolean; url?: string };

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/**
 * Chỉ cho phép đúng một lần gọi /auth/refresh tại một thời điểm.
 * Khi access token hết hạn, nhiều request thường lỗi 401 cùng lúc; nếu mỗi
 * request tự gọi refresh thì server nhận cả loạt request trùng nhau.
 * Các request còn lại chờ chung một promise rồi thử lại với token mới.
 */
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = api
      .post("/auth/refresh", {})
      .then((res) => {
        const { accessToken, user } = res.data;
        useAuthStore.getState().setAccessToken(accessToken);
        if (user) useAuthStore.getState().setUser(user);
        return accessToken as string;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (
      !originalRequest ||
      originalRequest._retried ||
      status !== 401 ||
      NO_REFRESH_PATHS.some((path) => originalRequest.url?.includes(path))
    ) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;
    try {
      const newAccessToken = await refreshAccessToken();
      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newAccessToken}`,
      };
      return api(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().clearState();
      if (!window.location.pathname.startsWith("/signin")) {
        window.location.assign("/signin");
      }
      return Promise.reject(refreshError);
    }
  }
);

export default api;
