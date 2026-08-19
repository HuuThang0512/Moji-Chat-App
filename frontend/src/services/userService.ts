import api from "@/lib/axios";
import type { User } from "@/types/user";

interface UploadAvatarResponse {
  user: User;
  avatarUrl: string;
}

export const userService = {
  uploadAvatar: async (formData: FormData): Promise<UploadAvatarResponse> => {
    // Không tự đặt Content-Type: trình duyệt phải tự sinh boundary cho multipart.
    const res = await api.post("/users/avatar", formData);
    return res.data;
  },
};
