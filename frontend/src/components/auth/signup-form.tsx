import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { z } from "zod";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNavigate } from "react-router";

// Giữ đồng bộ với backend/src/utils/schemas.js, nếu lệch nhau người dùng sẽ
// qua được form nhưng bị server trả 400 mà không hiểu vì sao.
const signUpSchema = z.object({
  firstname: z.string().trim().min(1, { message: "Vui lòng nhập họ" }).max(50),
  lastname: z.string().trim().min(1, { message: "Vui lòng nhập tên" }).max(50),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, { message: "Username tối thiểu 3 ký tự" })
    .max(30, { message: "Username tối đa 30 ký tự" })
    .regex(/^[a-z0-9._-]+$/, { message: "Username chỉ gồm chữ, số và . _ -" }),
  email: z.email({ message: "Email không hợp lệ" }).trim().toLowerCase(),
  password: z
    .string()
    .min(6, { message: "Mật khẩu tối thiểu 6 ký tự" })
    .max(128, { message: "Mật khẩu tối đa 128 ký tự" }),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { signUp } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstname: "",
      lastname: "",
      username: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignUpFormValues) => {
    const { firstname, lastname, username, email, password } = data;
    const success = await signUp(
      username,
      password,
      email,
      firstname,
      lastname
    );

    // Chỉ chuyển sang trang login khi đăng ký thành công
    if (success) {
      navigate("/signin");
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0 border-border">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex flex-col items-center text-center gap-2">
                <a href="/" className="mx-auto block w-fit text-center">
                  <img src="/logo.svg" alt="logo" />
                </a>
                <h1 className="text-2xl font-bold">Create an account</h1>
                <p className="text-balance text-muted-foreground">
                  Enter your details below to create an account
                </p>
              </div>
              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-3">
                  <Label>First Name</Label>
                  <Input
                    type="text"
                    placeholder="First Name"
                    {...register("firstname")}
                  />
                  {errors.firstname && (
                    <p className="error-message">
                      {errors.firstname.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  <Label>Last Name</Label>
                  <Input
                    type="text"
                    placeholder="Last Name"
                    {...register("lastname")}
                  />
                  {errors.lastname && (
                    <p className="error-message">
                      {errors.lastname.message}
                    </p>
                  )}
                </div>
              </div>
              {/* Username */}
              <div className="flex flex-col gap-3">
                <Label>Username</Label>
                <Input
                  type="text"
                  placeholder="Username"
                  {...register("username")}
                />
                {errors.username && (
                  <p className="error-message">
                    {errors.username.message}
                  </p>
                )}
              </div>
              {/* Email */}
              <div className="flex flex-col gap-3">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="Email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="error-message">
                    {errors.email.message}
                  </p>
                )}
              </div>
              {/* Password */}
              <div className="flex flex-col gap-3">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="error-message">
                    {errors.password.message}
                  </p>
                )}
              </div>
              {/* Signup button */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Create Account
              </Button>
              <p className="text-sm text-center">
                Already have an account?{" "}
                <a
                  href="/signin"
                  className="text-primary underline underline-offset-4"
                >
                  Signin
                </a>
              </p>
            </div>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/placeholderSignUp.png"
              alt="Image"
              className="absolute top-1/2 -translate-y-1/2  object-cover "
            />
          </div>
        </CardContent>
      </Card>
      <div className="px-6 text-xs text-balance text-center text-muted-foreground *:[a]:hover:text-primary *:[a]:hover:underline *:[a]:hover:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
