import type { UserState } from "@/types/store";
import { create } from "zustand";
import { toast } from "sonner";
import { useAuthStore } from "./useAuthStore";
import { userService } from "@/services/userService";
import { getErrorMessage } from "@/lib/errors";

export const useUserStore = create<UserState>(() => ({
  updateAvatarUrl: async (formData: FormData) => {
    try {
      const { user, setUser } = useAuthStore.getState();
      const data = await userService.uploadAvatar(formData);

      if (user) {
        setUser({ ...user, avatarUrl: data.avatarUrl });
      }
      toast.success("Đã cập nhật ảnh đại diện");
    } catch (error) {
      console.error("Failed to update avatar url", error);
      toast.error(getErrorMessage(error, "Không cập nhật được ảnh đại diện"));
    }
  },
}));
