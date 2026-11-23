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
  LEGAL_ENTITY_TYPES,
  LEGAL_ENTITY_TYPE_LABELS,
  V01_REGISTERABLE_ORGANIZATION_TYPES,
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
import { FormField, FormSection } from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

export default function RegisterOrganizationPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [requiresLogin, setRequiresLogin] = React.useState(false);

  const form = useForm<RegisterOrganizationInput>({
    resolver: zodResolver(registerOrganizationSchema),
    defaultValues: {
      name: "",
      type: "SERVICE",
      legalEntityType: "COMPANY",
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
              src="/homecare-logo.svg"
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
            <FormSection
              title="Thông tin pháp lý & Liên hệ"
              description="Điền chính xác thông tin doanh nghiệp để Admin đối chiếu phê duyệt."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Tên tổ chức / Doanh nghiệp"
                  htmlFor="name"
                  required
                  error={form.formState.errors.name?.message}
                  className="sm:col-span-2"
                >
                  <Input
                    id="name"
                    aria-invalid={Boolean(form.formState.errors.name) || undefined}
                    placeholder="VD: Điện Lạnh Bách Khoa Pro"
                    {...form.register("name")}
                  />
                </FormField>

                <FormField
                  label="Lĩnh vực hoạt động"
                  htmlFor="type"
                  required
                  error={form.formState.errors.type?.message}
                >
                  <select
                    id="type"
                    aria-invalid={Boolean(form.formState.errors.type) || undefined}
                    {...form.register("type")}
                    className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-foreground shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {V01_REGISTERABLE_ORGANIZATION_TYPES.map((orgType) => (
                      <option key={orgType} value={orgType}>
                        {ORGANIZATION_TYPE_LABELS[orgType]}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Loại hình pháp lý"
                  htmlFor="legalEntityType"
                  required
                  error={form.formState.errors.legalEntityType?.message}
                >
                  <select
                    id="legalEntityType"
                    aria-invalid={
                      Boolean(form.formState.errors.legalEntityType) || undefined
                    }
                    {...form.register("legalEntityType")}
                    className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-foreground shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {LEGAL_ENTITY_TYPES.map((entityType) => (
                      <option key={entityType} value={entityType}>
                        {LEGAL_ENTITY_TYPE_LABELS[entityType]}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Tỉnh / Thành phố"
                  htmlFor="city"
                  required
                  error={form.formState.errors.city?.message}
                >
                  <Input
                    id="city"
                    aria-invalid={Boolean(form.formState.errors.city) || undefined}
                    placeholder="TP. Hồ Chí Minh / Hà Nội"
                    {...form.register("city")}
                  />
                </FormField>

                <FormField
                  label="Số điện thoại liên hệ"
                  htmlFor="phone"
                  required
                  error={form.formState.errors.phone?.message}
                >
                  <Input
                    id="phone"
                    aria-invalid={Boolean(form.formState.errors.phone) || undefined}
                    placeholder="0901234567"
                    {...form.register("phone")}
                  />
                </FormField>

                <FormField
                  label="Mã số thuế"
                  htmlFor="taxCode"
                  hint="Tuỳ chọn đối với cá nhân hành nghề."
                  error={form.formState.errors.taxCode?.message}
                  className="sm:col-span-2"
                >
                  <Input
                    id="taxCode"
                    placeholder="0109283746"
                    {...form.register("taxCode")}
                  />
                </FormField>

                <FormField
                  label="Địa chỉ trụ sở"
                  htmlFor="address"
                  required
                  error={form.formState.errors.address?.message}
                  className="sm:col-span-2"
                >
                  <Input
                    id="address"
                    aria-invalid={Boolean(form.formState.errors.address) || undefined}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện"
                    {...form.register("address")}
                  />
                </FormField>

                <FormField
                  label="Giới thiệu năng lực"
                  htmlFor="description"
                  hint="Mô tả nhóm thiết bị chuyên môn, khu vực phục vụ và đội ngũ kỹ thuật."
                  className="sm:col-span-2"
                >
                  <Textarea
                    id="description"
                    rows={3}
                    placeholder="Mô tả nhóm thiết bị chuyên môn, khu vực phục vụ và đội ngũ kỹ thuật..."
                    {...form.register("description")}
                  />
                </FormField>
              </div>
            </FormSection>

            <Button
              type="submit"
              className="w-full"
              loading={submitting}
              disabled={submitting}
            >
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
