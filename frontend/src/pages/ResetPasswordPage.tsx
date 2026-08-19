import { Link, useNavigate, useSearchParams } from "react-router";
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

const schema = z
  .object({
    password: z
      .string()
      .min(6, { message: "Mật khẩu tối thiểu 6 ký tự" })
      .max(128, { message: "Mật khẩu tối đa 128 ký tự" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hai mật khẩu không khớp",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async ({ password }: FormValues) => {
    if (!token) return;
    try {
      await authService.resetPassword(token, password);
      /*
        Cố ý không tự đăng nhập: bắt gõ lại mật khẩu mới vừa giúp người dùng nhớ,
        vừa tránh việc ai đó mở link trên máy lạ rồi có luôn phiên đăng nhập.
      */
      toast.success("Đã đổi mật khẩu, hãy đăng nhập lại");
      navigate("/signin");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không đặt lại được mật khẩu"));
    }
  };

  return (
    <div className="bg-muted bg-gradient-purple absolute inset-0 z-0 flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card className="border-border">
          <CardContent className="flex flex-col gap-6 p-6 md:p-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">Đặt mật khẩu mới</h1>
            </div>

            {!token ? (
              <div className="flex flex-col gap-4 text-center">
                <p className="text-sm">
                  Link không hợp lệ. Hãy yêu cầu link đặt lại mật khẩu mới.
                </p>
                <Button asChild className="w-full">
                  <Link to="/forgot-password">Yêu cầu link mới</Link>
                </Button>
              </div>
            ) : (
              <form
                className="flex flex-col gap-6"
                onSubmit={handleSubmit(onSubmit)}
              >
                <div className="flex flex-col gap-3">
                  <Label>Mật khẩu mới</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="error-message">{errors.password.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <Label>Nhập lại mật khẩu mới</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="error-message">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Đang lưu..." : "Đổi mật khẩu"}
                </Button>

                <p className="text-muted-foreground text-center text-xs">
                  Đổi mật khẩu sẽ đăng xuất mọi thiết bị đang dùng tài khoản này.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
