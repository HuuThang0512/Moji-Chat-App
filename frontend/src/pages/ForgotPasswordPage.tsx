import { useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";
import { getErrorMessage } from "@/lib/errors";

const schema = z.object({
  email: z.email({ message: "Email không hợp lệ" }).trim().toLowerCase(),
});

type FormValues = z.infer<typeof schema>;

const ForgotPasswordPage = () => {
  const [daGui, setDaGui] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async ({ email }: FormValues) => {
    try {
      await authService.forgotPassword(email);
      setDaGui(true);
    } catch (error) {
      toast.error(getErrorMessage(error, "Không gửi được yêu cầu"));
    }
  };

  return (
    <div className="bg-muted bg-gradient-purple absolute inset-0 z-0 flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card className="border-border">
          <CardContent className="flex flex-col gap-6 p-6 md:p-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">Quên mật khẩu</h1>
              <p className="text-muted-foreground text-balance text-sm">
                Nhập email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi link đặt lại
                mật khẩu.
              </p>
            </div>

            {daGui ? (
              /*
                Thông báo cố ý không khẳng định email có tồn tại hay không, khớp
                với backend luôn trả 204. Nếu ở đây nói "đã gửi tới email này"
                thì người lạ dò được ai đã đăng ký.
              */
              <div className="flex flex-col gap-4 text-center">
                <p className="text-sm">
                  Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn tới
                  hòm thư của bạn. Link có hiệu lực trong 1 giờ.
                </p>
                <p className="text-muted-foreground text-xs">
                  Không thấy thư? Kiểm tra cả hộp thư rác.
                </p>
              </div>
            ) : (
              <form
                className="flex flex-col gap-6"
                onSubmit={handleSubmit(onSubmit)}
              >
                <div className="flex flex-col gap-3">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    autoComplete="email"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="error-message">{errors.email.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
                </Button>
              </form>
            )}

            <p className="text-center text-sm">
              <Link
                to="/signin"
                className="text-primary underline underline-offset-4"
              >
                Quay lại đăng nhập
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
