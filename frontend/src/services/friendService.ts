import api from "@/lib/axios";
import type { Friend, FriendRequest, User } from "@/types/user";

interface FriendRequestsResult {
  sent: FriendRequest[];
  received: FriendRequest[];
}

export const friendService = {
  async searchUserByUsername(username: string): Promise<User | null> {
    const res = await api.get("/users/search", { params: { username } });
    return res.data.user ?? null;
  },

  async sendFriendRequest(to: string, message?: string): Promise<string> {
    const res = await api.post("/friends/requests", {
      to,
      ...(message ? { message } : {}),
    });
    return res.data.message;
  },

  // Không nuốt lỗi ở tầng service: store cần biết request hỏng để báo cho người dùng.
  async getAllFriendRequests(): Promise<FriendRequestsResult> {
    const res = await api.get("/friends/requests");
    const { sentRequests = [], receivedRequests = [] } = res.data;
    return { sent: sentRequests, received: receivedRequests };
  },

  async acceptRequest(requestId: string): Promise<Friend | null> {
    const res = await api.post(`/friends/requests/${requestId}/accept`);
    return res.data.newFriend ?? null;
  },

  async declineRequest(requestId: string): Promise<void> {
    await api.post(`/friends/requests/${requestId}/decline`);
  },

  async getFriendList(): Promise<Friend[]> {
    const res = await api.get("/friends");
    return res.data.friends ?? [];
  },
};
