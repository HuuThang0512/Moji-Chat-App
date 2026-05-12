import api from "@/lib/axios";
import type { User } from "@/types/user";

export const friendService = {
  async searchUserByUsername(username: string): Promise<User | null> {
    const res = await api.get(
      `/users/search?username=${encodeURIComponent(username)}`
    );
    return res.data.user ?? null;
  },

  async sendFriendRequest(to: string, message?: string) {
    const res = await api.post("/friends/requests", {
      to,
      message,
    })
    return res.data.message
  },

  async getAllFriendRequests() {
    try {
      const res = await api.get("/friends/requests");
      const { sentRequests = [], receivedRequests = [] } = res.data;
      return { sent: sentRequests, received: receivedRequests };
    } catch (error) {
      console.error("Error getting all friend requests", error);
    }
  },

  async acceptRequest(requestId: string) {
    try {
      const res = await api.post(`/friends/requests/${requestId}/accept`);
      return res.data.requestAcceptedBy;
    } catch (error) {
      console.error("Error accepting friend request", error);
    }
  },
  
  async declineRequest(requestId: string) {
    try {
      const res = await api.post(`/friends/requests/${requestId}/decline`);
      return res.data.message;
    } catch (error) {
      console.error("Error declining friend request", error);
    }
  },

  async getFriendList() {
    const res = await api.get("/friends");
    return res.data.friends;
  }

}