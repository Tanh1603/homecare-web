"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Info } from "lucide-react";
import {
  ORGANIZATION_TYPES,
  ORGANIZATION_TYPE_LABELS,
  registerOrganizationSchema,
  type RegisterOrganizationInput,
} from "@/features/organizations/contracts/organization";
import { organizationsApi } from "@/features/organizations/api";
import { GatewayApiError } from "@/shared/api/api-envelope";
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
  const [requiresLogin, setRequiresLogin] = React.useState(false);

  const form = useForm<RegisterOrganizationInput>({
    resolver: zodResolver(registerOrganizationSchema),
    defaultValues: {
      name: "",
      type: "COMPANY",
      taxCode: "",
      phone: "",
      city: "TP. Hồ Chí Minh",
      address: "",
      description: "",
    },
  });

  async function onSubmit(values: RegisterOrganizationInput) {
    setSubmitting(true);
    setRequiresLogin(false);
    try {
      await organizationsApi.register(values);
      toast.success(
        "Đã nộp hồ sơ đăng ký! Tổ chức của bạn đang ở trạng thái PENDING chờ Admin duyệt."
      );
      router.push("/org/status");
      router.refresh();
    } catch (err) {
      if (err instanceof GatewayApiError && err.status === 401) {
        setRequiresLogin(true);
        toast.error("Bạn cần đăng nhập tài khoản HomeCare trước khi nộp hồ sơ.");
      } else {
        toast.error(
          err instanceof Error ? err.message : "Không thể gửi hồ sơ đăng ký"
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-xl shadow-sm">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <Image
              src="/homecare_logo.png"
              alt="HomeCare Logo"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl object-contain"
              priority
            />
            <Link
              href="/"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Về trang chủ
            </Link>
          </div>
          <CardTitle className="text-xl">
            Đăng ký đối tác Organization
          </CardTitle>
          <CardDescription>
            Hồ sơ sau khi nộp sẽ mặc định ở trạng thái <strong>PENDING</strong>.
            Quyền vận hành chính thức sẽ được kích hoạt sau khi Admin phê duyệt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {requiresLogin ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-bg/70 p-3 text-xs text-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div className="space-y-1">
                <p className="font-medium">
                  Cần đăng nhập để định danh chủ sở hữu hồ sơ
                </p>
                <p className="text-muted-foreground">
                  Vui lòng{" "}
                  <Link
                    href="/login?next=/register/org"
                    className="font-semibold text-primary underline"
                  >
                    đăng nhập tại đây
                  </Link>{" "}
                  rồi gửi lại biểu mẫu.
                </p>
              </div>
            </div>
          ) : null}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
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

              <div className="space-y-1.5">
                <Label htmlFor="type">Loại hình tổ chức</Label>
                <select
                  id="type"
                  {...form.register("type")}
                  className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-foreground shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {ORGANIZATION_TYPES.map((orgType) => (
                    <option key={orgType} value={orgType}>
                      {ORGANIZATION_TYPE_LABELS[orgType]}
                    </option>
                  ))}
                </select>
                {form.formState.errors.type ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.type.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city">Tỉnh / Thành phố</Label>
                <Input
                  id="city"
                  placeholder="TP. Hồ Chí Minh / Hà Nội"
                  {...form.register("city")}
                />
                {form.formState.errors.city ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.city.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Số điện thoại liên hệ</Label>
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

              <div className="space-y-1.5">
                <Label htmlFor="taxCode">Mã số thuế (tuỳ chọn)</Label>
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

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Địa chỉ trụ sở</Label>
                <Input
                  id="address"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện"
                  {...form.register("address")}
                />
                {form.formState.errors.address ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.address.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="description">Giới thiệu năng lực (tuỳ chọn)</Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Mô tả nhóm thiết bị chuyên môn, khu vực phục vụ và đội ngũ kỹ thuật..."
                  {...form.register("description")}
                  className="flex w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-2xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Đang gửi hồ sơ..." : "Nộp hồ sơ đăng ký"}
            </Button>
          </form>

          <div className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
            Đã có tài khoản được duyệt?{" "}
            <Link
              href="/login?next=/org"
              className="font-medium text-primary hover:underline"
            >
              Đăng nhập ngay
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
