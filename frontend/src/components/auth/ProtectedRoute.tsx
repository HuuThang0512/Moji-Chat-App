import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";

const ProtectedRoute = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [starting, setStarting] = useState(true);
  // React StrictMode chạy effect hai lần ở môi trường dev; ref này giữ cho
  // chuỗi khởi tạo (refresh -> fetchMe -> fetchConversations) chỉ chạy một lần.
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      const auth = useAuthStore.getState();

      // Access token không được lưu xuống ổ đĩa, nên sau khi tải lại trang phải
      // đổi cookie refresh lấy token mới.
      if (!auth.accessToken) {
        await auth.refresh();
      }

      const { accessToken: token, user } = useAuthStore.getState();
      if (token && !user) {
        await useAuthStore.getState().fetchMe();
      }
      if (useAuthStore.getState().accessToken) {
        await useChatStore.getState().fetchConversations();
      }

      setStarting(false);
    };

    init();
  }, []);

  if (starting) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Đang tải...</span>
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/signin" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
