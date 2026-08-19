import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authService } from "@/services/authService";
import { getErrorMessage } from "@/lib/errors";
import { useAuthStore } from "@/stores/useAuthStore";

type TrangThai = "dang-xu-ly" | "thanh-cong" | "that-bai";

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [trangThai, setTrangThai] = useState<TrangThai>("dang-xu-ly");
  const [loi, setLoi] = useState("");

  const fetchMe = useAuthStore((state) => state.fetchMe);
  const daDangNhap = useAuthStore((state) => Boolean(state.accessToken));

  /**
   * React chạy effect hai lần ở chế độ StrictMode. Token chỉ dùng được một lần
   * nên lần gọi thứ hai sẽ luôn thất bại và ghi đè kết quả đúng bằng lỗi.
   */
  const daGoi = useRef(false);

  useEffect(() => {
    if (daGoi.current) return;
    daGoi.current = true;

    if (!token) {
      setTrangThai("that-bai");
      setLoi("Link không hợp lệ.");
      return;
    }

    authService
      .verifyEmail(token)
      .then(async () => {
        setTrangThai("thanh-cong");
        // Đang đăng nhập thì nạp lại hồ sơ để banner nhắc xác minh biến mất ngay.
        if (daDangNhap) await fetchMe();
      })
      .catch((error) => {
        setTrangThai("that-bai");
        setLoi(getErrorMessage(error, "Xác minh thất bại"));
      });
  }, [token, daDangNhap, fetchMe]);

  return (
    <div className="bg-muted bg-gradient-purple absolute inset-0 z-0 flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card className="border-border">
          <CardContent className="flex flex-col gap-6 p-6 text-center md:p-8">
            {trangThai === "dang-xu-ly" && (
              <>
                <h1 className="text-2xl font-bold">Đang xác minh...</h1>
                <p className="text-muted-foreground text-sm">
                  Chờ một chút nhé.
                </p>
              </>
            )}

            {trangThai === "thanh-cong" && (
              <>
                <h1 className="text-2xl font-bold">Đã xác minh email</h1>
                <p className="text-muted-foreground text-sm">
                  Địa chỉ email của bạn đã được xác nhận.
                </p>
                <Button asChild className="w-full">
                  <Link to={daDangNhap ? "/" : "/signin"}>
                    {daDangNhap ? "Về trang chat" : "Đăng nhập"}
                  </Link>
                </Button>
              </>
            )}

            {trangThai === "that-bai" && (
              <>
                <h1 className="text-2xl font-bold">Không xác minh được</h1>
                <p className="text-sm">{loi}</p>
                <p className="text-muted-foreground text-xs">
                  Link chỉ dùng được một lần và hết hạn sau 24 giờ. Đăng nhập rồi
                  bấm "Gửi lại" trên thanh nhắc để nhận link mới.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link to={daDangNhap ? "/" : "/signin"}>
                    {daDangNhap ? "Về trang chat" : "Đăng nhập"}
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
