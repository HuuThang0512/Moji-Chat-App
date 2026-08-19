import { useState } from "react";
import { MailWarning, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authService } from "@/services/authService";
import { getErrorMessage } from "@/lib/errors";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Thanh nhắc xác minh email.
 *
 * Cố ý không chặn người dùng dùng app: mail có thể rơi vào hộp thư rác hoặc dịch
 * vụ gửi mail có thể chết, chặn cứng thì họ kẹt ngoài cửa mà không tự thoát được.
 */
const EmailVerificationBanner = () => {
  const user = useAuthStore((state) => state.user);
  const [dangGui, setDangGui] = useState(false);
  const [daAn, setDaAn] = useState(false);

  if (!user || user.emailVerifiedAt || daAn) return null;

  const guiLai = async () => {
    // Khoá nút trong lúc gọi: backend chỉ cho 5 mail mỗi giờ, bấm liên tục là
    // ăn hết hạn mức rồi nhận 429.
    setDangGui(true);
    try {
      await authService.resendVerifyEmail();
      toast.success("Đã gửi lại email xác minh, kiểm tra hòm thư của bạn");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không gửi lại được email"));
    } finally {
      setDangGui(false);
    }
  };

  return (
    <div className="bg-primary/10 border-primary/20 mb-2 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
      <MailWarning className="text-primary size-4 shrink-0" />

      <p className="min-w-0 flex-1 text-sm">
        Email <span className="font-medium">{user.email}</span> chưa được xác
        minh. Xác minh để dùng được chức năng khôi phục mật khẩu.
      </p>

      <Button size="sm" onClick={guiLai} disabled={dangGui}>
        {dangGui ? "Đang gửi..." : "Gửi lại"}
      </Button>

      <Button
        size="icon"
        variant="ghost"
        onClick={() => setDaAn(true)}
        aria-label="Ẩn thông báo"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
};

export default EmailVerificationBanner;
