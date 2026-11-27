"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
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
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";

function ResetPasswordFormCard() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [ready, setReady] = React.useState(false);
  const [hasSession, setHasSession] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [completed, setCompleted] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const supabase = createSupabaseBrowserClient();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;
        if (event === "PASSWORD_RECOVERY" || session) {
          setHasSession(true);
          setReady(true);
        }
      }
    );

    async function init() {
      try {
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError && active) {
            setError(
              "Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng gửi yêu cầu mới."
            );
          }
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (active) {
          setHasSession(Boolean(session));
          setReady(true);
        }
      } catch {
        if (active) {
          setError("Không thể xác thực liên kết đặt lại mật khẩu.");
          setReady(true);
        }
      }
    }

    void init();

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message || "Không thể cập nhật mật khẩu.");
        return;
      }
      await supabase.auth.signOut();
      setCompleted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể cập nhật mật khẩu."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">Đặt lại mật khẩu HomeCare</CardTitle>
          <CardDescription>
            Nhập mật khẩu mới cho tài khoản của bạn (áp dụng cho cả ứng dụng
            Mobile và Web Portal).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : completed ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 p-4 text-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    Đã cập nhật mật khẩu thành công
                  </p>
                  <p className="text-muted-foreground">
                    Bạn có thể quay lại ứng dụng HomeCare (Mobile hoặc Web) để
                    đăng nhập bằng mật khẩu mới.
                  </p>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href="/login">Đến trang đăng nhập Web</Link>
              </Button>
            </div>
          ) : !hasSession ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error ??
                    "Liên kết khôi phục mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại email khôi phục."}
                </AlertDescription>
              </Alert>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Quay lại trang đăng nhập</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="new-password">Mật khẩu mới</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    minLength={8}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  minLength={8}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={submitting}
                disabled={submitting}
              >
                {submitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
          <Skeleton className="h-72 w-full max-w-md rounded-xl" />
        </div>
      }
    >
      <ResetPasswordFormCard />
    </React.Suspense>
  );
}
