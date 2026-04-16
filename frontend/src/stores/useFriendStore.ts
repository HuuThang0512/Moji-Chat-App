import { friendService } from "@/services/friendService";
import type { FriendState } from "@/types/store";
import { create } from "zustand";


export const useFriendStore = create<FriendState>((set, get) => ({
  loading: false,
  receivedList: [],
  sentList: [],
  searchUserByUsername: async (username: string) => {
    try {
      set({ loading: true });
      const user = await friendService.searchUserByUsername(username);
      return user;
    } catch(error) {
      console.error("Error searching user by username", error);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  addFriend: async (to: string, message?: string) => {
    try {
      set({ loading: true });
      const resultMessage = await friendService.sendFriendRequest(to, message);
      await get().getAllFriendRequests();
      return resultMessage;
    } catch(error) {
      console.error("Error adding friend", error);
      return "Failed to send friend request";
    } finally {
      set({ loading: false });
    }
  },

  getAllFriendRequests: async () => {
    try {
      set({ loading: true });
      const result = await friendService.getAllFriendRequests();
      if(!result) return;
      const { received, sent } = result;
      set({ receivedList: received, sentList: sent });
    } catch(error) {
      console.error("Error getting all friend requests", error);
    } finally {
      set({ loading: false });
    }
  },

  acceptRequest: async (requestId: string) => {
    try {
      set({ loading: true });
      await friendService.acceptRequest(requestId);
      set((state) => ({
        receivedList: state.receivedList.filter((request) => request._id !== requestId),
      }))
    } catch(error) {
      console.error("Error accepting friend request", error);
    } finally {
      set({ loading: false });
    }
  },

  declineRequest: async (requestId: string) => {
    try {
      set({ loading: true });
      await friendService.declineRequest(requestId);
      set((state) => ({
        receivedList: state.receivedList.filter((request) => request._id !== requestId),
      }))
    } catch(error) {
      console.error("Error declining friend request", error);
    } finally {
      set({ loading: false });
    }
  }
}))