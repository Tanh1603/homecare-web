"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { extractRolesFromJwt, isAdminRole } from "@/shared/auth/roles";
import { createSupabaseBrowserClient } from "@/shared/lib/supabase/client";
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

const loginSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

type LoginForm = z.infer<typeof loginSchema>;

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
  const [submitting, setSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const nextParam = searchParams.get("next");

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginForm) {
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
          : "Không thể kết nối dịch vụ xác thực Supabase";
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
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
            src="/homecare_logo.png"
            alt="HomeCare Logo"
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
            priority
          />
        </Link>
        <CardTitle className="text-xl">Đăng nhập HomeCare Portal</CardTitle>
        <CardDescription>
          Sử dụng tài khoản Supabase Auth dùng chung với HomeCare Mobile
        </CardDescription>
      </CardHeader>
      <CardContent>
        {authError ? (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-xs text-destructive"
          >
            {authError}
          </div>
        ) : null}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="ops@bachkhoapro.vn"
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.email.message}
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
                {...form.register("password")}
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
            {form.formState.errors.password ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Đang xác thực..." : "Đăng nhập"}
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <Link
            href="/register/org"
            className="font-medium text-primary hover:underline"
          >
            Đăng ký đối tác Organization
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
