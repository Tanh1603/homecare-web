"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Eye, EyeOff, MailCheck, RefreshCw } from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { extractRolesFromJwt, isAdminRole } from "@/shared/auth/roles";
import { createSupabaseBrowserClient } from "@/shared/lib/supabase/client";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/shared/ui/input-otp";
import { Label } from "@/shared/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

const loginSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Họ và tên tối thiểu 2 ký tự"),
    email: z.string().trim().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
    confirmPassword: z.string().min(6, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp",
  });

type LoginForm = z.infer<typeof loginSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;

function resolveSafeRedirect(nextParam: string | null, roles: string[]): string {
  const admin = isAdminRole(roles);
  if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
    if ((nextParam === "/admin" || nextParam.startsWith("/admin/")) && !admin) {
      return "/org";
    }
    return nextParam;
  }
  return admin ? "/admin" : "/org";
}

function LoginFormCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const mode: "login" | "signup" =
    searchParams.get("mode") === "signup" ? "signup" : "login";

  const [submitting, setSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  // Email OTP verification state after signUp
  const [pendingOtpEmail, setPendingOtpEmail] = React.useState<string | null>(
    null
  );
  const [otpCode, setOtpCode] = React.useState("");
  const [verifyingOtp, setVerifyingOtp] = React.useState(false);
  const [resendingOtp, setResendingOtp] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  function changeMode(nextMode: "login" | "signup") {
    setAuthError(null);
    const params = new URLSearchParams(searchParams.toString());
    if (nextMode === "signup") {
      params.set("mode", "signup");
    } else {
      params.delete("mode");
    }
    const qs = params.toString();
    router.replace(qs ? `/login?${qs}` : "/login", { scroll: false });
  }

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onLoginSubmit(values: LoginForm) {
    setSubmitting(true);
    setAuthError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        setAuthError(error.message);
        toast.error(error.message);
        return;
      }
      const roles = extractRolesFromJwt(data.session?.access_token);
      toast.success("Đăng nhập thành công");
      router.push(resolveSafeRedirect(nextParam, roles));
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể kết nối dịch vụ xác thực";
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSignUpSubmit(values: SignUpForm) {
    setSubmitting(true);
    setAuthError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
          },
        },
      });
      if (error) {
        setAuthError(error.message);
        toast.error(error.message);
        return;
      }

      if (data.session) {
        const roles = extractRolesFromJwt(data.session.access_token);
        toast.success("Tạo tài khoản và đăng nhập thành công!");
        router.push(resolveSafeRedirect(nextParam, roles));
        router.refresh();
        return;
      }

      setPendingOtpEmail(values.email);
      setOtpCode("");
      setResendCooldown(60);
      toast.success("Đã gửi mã xác thực đến email của bạn.");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể tạo tài khoản mới lúc này";
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerifyOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingOtpEmail) return;
    const cleaned = otpCode.replace(/\s+/g, "");
    if (cleaned.length < 6) {
      setAuthError("Vui lòng nhập đầy đủ mã xác thực từ email.");
      return;
    }

    setVerifyingOtp(true);
    setAuthError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email: pendingOtpEmail,
        token: cleaned,
        type: "signup",
      });
      if (error) {
        setAuthError(error.message);
        toast.error(error.message);
        return;
      }

      if (data.session) {
        const roles = extractRolesFromJwt(data.session.access_token);
        toast.success("Xác thực email thành công!");
        router.push(resolveSafeRedirect(nextParam, roles));
        router.refresh();
        return;
      }

      loginForm.setValue("email", pendingOtpEmail);
      setPendingOtpEmail(null);
      setOtpCode("");
      changeMode("login");
      toast.success("Xác thực email thành công! Vui lòng đăng nhập.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Không thể xác thực mã OTP.";
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function handleResendOtp() {
    if (!pendingOtpEmail || resendCooldown > 0) return;
    setResendingOtp(true);
    setAuthError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingOtpEmail,
      });
      if (error) {
        setAuthError(error.message);
        toast.error(error.message);
        return;
      }
      setResendCooldown(60);
      toast.success(`Đã gửi lại mã xác thực tới ${pendingOtpEmail}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể gửi lại mã xác thực."
      );
    } finally {
      setResendingOtp(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader className="space-y-2 text-center">
        <Link
          href="/"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shadow-xs"
        >
          <Image
            src="/homecare-logo.svg"
            alt="HomeCare Logo"
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
            priority
          />
        </Link>
        <CardTitle className="text-xl">
          {pendingOtpEmail
            ? "Xác thực địa chỉ email"
            : mode === "login"
              ? "Đăng nhập HomeCare Portal"
              : "Tạo tài khoản HomeCare"}
        </CardTitle>
        <CardDescription>
          {pendingOtpEmail
            ? `Nhập mã xác thực đã gửi tới ${pendingOtpEmail} để hoàn tất đăng ký.`
            : mode === "login"
              ? "Đăng nhập để quản trị hoặc nộp hồ sơ đăng ký đối tác."
              : "Tạo tài khoản chủ sở hữu để tiếp tục đăng ký đối tác hoặc đăng nhập."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {authError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle />
            <AlertDescription className="text-xs">{authError}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs
          value={mode}
          onValueChange={(value) => {
            if (value === "login" || value === "signup") {
              changeMode(value);
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="login">Đăng nhập</TabsTrigger>
            <TabsTrigger value="signup">Tạo tài khoản</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form
              onSubmit={loginForm.handleSubmit(onLoginSubmit)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="ops@bachkhoapro.vn"
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email ? (
                  <p className="text-xs text-destructive">
                    {loginForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pr-10"
                    {...loginForm.register("password")}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-2 rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {loginForm.formState.errors.password ? (
                  <p className="text-xs text-destructive">
                    {loginForm.formState.errors.password.message}
                  </p>
                ) : null}
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Đang xác thực..." : "Đăng nhập"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            {pendingOtpEmail ? (
              <form onSubmit={onVerifyOtpSubmit} className="space-y-4">
                <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-secondary p-3 text-xs text-muted-foreground">
                  <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>
                    Vui lòng kiểm tra hộp thư{" "}
                    <strong className="text-foreground">
                      {pendingOtpEmail}
                    </strong>{" "}
                    và nhập mã xác thực gồm 6–8 chữ số.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-otp">Mã xác thực email (OTP)</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      id="signup-otp"
                      maxLength={8}
                      pattern={REGEXP_ONLY_DIGITS}
                      value={otpCode}
                      onChange={setOtpCode}
                      autoComplete="one-time-code"
                      autoFocus
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                        <InputOTPSlot index={6} />
                        <InputOTPSlot index={7} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={verifyingOtp || otpCode.trim().length < 6}
                >
                  {verifyingOtp ? "Đang xác thực..." : "Xác nhận mã OTP"}
                </Button>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingOtpEmail(null);
                      setOtpCode("");
                      setAuthError(null);
                    }}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Đổi email khác
                  </button>
                  <button
                    type="button"
                    disabled={resendingOtp || resendCooldown > 0}
                    onClick={handleResendOtp}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {resendCooldown > 0
                      ? `Gửi lại (${resendCooldown}s)`
                      : "Gửi lại mã"}
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={signUpForm.handleSubmit(onSignUpSubmit)}
                className="space-y-3.5"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="signup-fullname">Họ và tên</Label>
                  <Input
                    id="signup-fullname"
                    autoComplete="name"
                    placeholder="Nguyễn Văn A"
                    {...signUpForm.register("fullName")}
                  />
                  {signUpForm.formState.errors.fullName ? (
                    <p className="text-xs text-destructive">
                      {signUpForm.formState.errors.fullName.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="chu-so-huu@doanhnghiep.vn"
                    {...signUpForm.register("email")}
                  />
                  {signUpForm.formState.errors.email ? (
                    <p className="text-xs text-destructive">
                      {signUpForm.formState.errors.email.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">Mật khẩu</Label>
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Tối thiểu 6 ký tự"
                    {...signUpForm.register("password")}
                  />
                  {signUpForm.formState.errors.password ? (
                    <p className="text-xs text-destructive">
                      {signUpForm.formState.errors.password.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-confirm">Xác nhận mật khẩu</Label>
                  <Input
                    id="signup-confirm"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu"
                    {...signUpForm.register("confirmPassword")}
                  />
                  {signUpForm.formState.errors.confirmPassword ? (
                    <p className="text-xs text-destructive">
                      {signUpForm.formState.errors.confirmPassword.message}
                    </p>
                  ) : null}
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
                </Button>
              </form>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <Link
            href="/register/org"
            className="font-medium text-primary hover:underline"
          >
            Đăng ký đối tác HomeCare
          </Link>
          <Link href="/" className="hover:underline">
            Về trang chủ
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <React.Suspense
        fallback={
          <Card className="w-full max-w-md p-8 text-center text-sm text-muted-foreground">
            Đang tải biểu mẫu đăng nhập...
          </Card>
        }
      >
        <LoginFormCard />
      </React.Suspense>
    </div>
  );
}
