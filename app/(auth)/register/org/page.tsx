"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import {
  registerOrganizationSchema,
  type RegisterOrganizationInput,
} from "@/features/organizations/contracts/organization";
import { organizationsApi } from "@/features/organizations/api";
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

export default function RegisterOrganizationPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<RegisterOrganizationInput>({
    resolver: zodResolver(registerOrganizationSchema),
    defaultValues: {
      name: "",
      taxCode: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  async function onSubmit(values: RegisterOrganizationInput) {
    setSubmitting(true);
    try {
      await organizationsApi.register(values);
      toast.success(
        "Đã nộp hồ sơ đăng ký! Tổ chức của bạn đang ở trạng thái PENDING chờ Admin duyệt."
      );
      router.push("/org/status");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể gửi hồ sơ đăng ký"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">
            Đăng ký đối tác Organization
          </CardTitle>
          <CardDescription>
            Hồ sơ sau khi nộp sẽ mặc định ở trạng thái <strong>PENDING</strong>.
            Quyền vận hành chính thức sẽ được backend kích hoạt sau khi Admin
            phê duyệt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Tên tổ chức / Doanh nghiệp</Label>
              <Input
                id="name"
                placeholder="VD: Điện Lạnh Bách Khoa Pro"
                {...form.register("name")}
              />
              {form.formState.errors.name ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="taxCode">Mã số thuế</Label>
                <Input
                  id="taxCode"
                  placeholder="0109283746"
                  {...form.register("taxCode")}
                />
                {form.formState.errors.taxCode ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.taxCode.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  placeholder="0901234567"
                  {...form.register("phone")}
                />
                {form.formState.errors.phone ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.phone.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email liên hệ</Label>
              <Input
                id="email"
                type="email"
                placeholder="ops@company.vn"
                {...form.register("email")}
              />
              {form.formState.errors.email ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Địa chỉ trụ sở</Label>
              <Input
                id="address"
                placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
                {...form.register("address")}
              />
              {form.formState.errors.address ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.address.message}
                </p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Đang gửi hồ sơ..." : "Nộp hồ sơ đăng ký"}
            </Button>
          </form>

          <div className="mt-5 text-center text-xs text-muted-foreground">
            Đã có tài khoản được duyệt?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Đăng nhập ngay
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
