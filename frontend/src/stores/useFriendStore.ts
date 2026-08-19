import { create } from "zustand";
import { toast } from "sonner";
import { friendService } from "@/services/friendService";
import type { FriendState } from "@/types/store";
import type { Friend } from "@/types/user";
import { useAuthStore } from "./useAuthStore";
import { getErrorMessage } from "@/lib/errors";

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  loading: false,
  receivedList: [],
  sentList: [],

  searchUserByUsername: async (username: string) => {
    try {
      set({ loading: true });
      return await friendService.searchUserByUsername(username);
    } catch (error) {
      console.error("Error searching user by username", error);
      toast.error(getErrorMessage(error, "Không tìm được người dùng"));
      return null;
    } finally {
      set({ loading: false });
    }
  },

  addFriend: async (to: string, message?: string) => {
    set({ loading: true });
    try {
      const resultMessage = await friendService.sendFriendRequest(to, message);
      await get().getAllFriendRequests();
      return resultMessage;
    } finally {
      set({ loading: false });
    }
  },

  getAllFriendRequests: async () => {
    try {
      set({ loading: true });
      const { received, sent } = await friendService.getAllFriendRequests();
      set({ receivedList: received, sentList: sent });
    } catch (error) {
      console.error("Error getting all friend requests", error);
      toast.error(getErrorMessage(error, "Không tải được danh sách lời mời"));
    } finally {
      set({ loading: false });
    }
  },

  acceptRequest: async (requestId: string) => {
    try {
      set({ loading: true });
      const newFriend = await friendService.acceptRequest(requestId);
      set((state) => ({
        receivedList: state.receivedList.filter((request) => request._id !== requestId),
        // Thêm ngay vào danh sách bạn để các màn hình khác không phải tải lại.
        friends:
          newFriend && !state.friends.some((f) => f._id === newFriend._id)
            ? [...state.friends, newFriend]
            : state.friends,
      }));
      toast.success("Đã chấp nhận lời mời kết bạn");
    } catch (error) {
      console.error("Error accepting friend request", error);
      toast.error(getErrorMessage(error, "Không chấp nhận được lời mời"));
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
        sentList: state.sentList.filter((request) => request._id !== requestId),
      }));
    } catch (error) {
      console.error("Error declining friend request", error);
      toast.error(getErrorMessage(error, "Không từ chối được lời mời"));
    } finally {
      set({ loading: false });
    }
  },

  getFriends: async () => {
    try {
      set({ loading: true });
      const friends = await friendService.getFriendList();
      const currentUserId = useAuthStore.getState().user?._id;

      // Lọc phòng thủ: bỏ bản ghi thiếu _id, bỏ chính mình và bỏ trùng lặp.
      const seen = new Set<string>();
      const safeFriends: Friend[] = [];
      for (const friend of friends) {
        const id = friend?._id ? String(friend._id) : "";
        if (!id || id === String(currentUserId) || seen.has(id)) continue;
        seen.add(id);
        safeFriends.push(friend);
      }
      set({ friends: safeFriends });
    } catch (error) {
      console.error("Error getting friends", error);
      toast.error(getErrorMessage(error, "Không tải được danh sách bạn bè"));
      set({ friends: [] });
    } finally {
      set({ loading: false });
    }
  },
}));
