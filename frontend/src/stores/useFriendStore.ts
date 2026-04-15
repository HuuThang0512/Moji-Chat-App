import {friendService} from "@/services/friendService";
import type { FriendState } from "@/types/store";
import { create } from "zustand";


export const useFriendStore = create<FriendState>((set, get) => ({
  loading: false,
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
      return resultMessage;
    } catch(error) {
      console.error("Error adding friend", error);
      return "Failed to send friend request";
    } finally {
      set({ loading: false });
    }
  }
}))