"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Info, ShieldCheck } from "lucide-react";
import {
  LEGAL_ENTITY_TYPES,
  LEGAL_ENTITY_TYPE_LABELS,
  V01_REGISTERABLE_ORGANIZATION_TYPES,
  ORGANIZATION_TYPE_LABELS,
  registerOrganizationSchema,
  type RegisterOrganizationInput,
} from "@/features/organizations/contracts/organization";
import { organizationsApi } from "@/features/organizations/api";
import { OrgEvidenceUploader } from "@/features/organizations/components/org-evidence-uploader";
import { GatewayApiError } from "@/shared/api/api-envelope";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

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
      identityEvidenceRefs: "",
    },
  });

  const legalEntityType = form.watch("legalEntityType");
  const identityEvidenceRefs = form.watch("identityEvidenceRefs");

  async function onSubmit(values: RegisterOrganizationInput) {
    setSubmitting(true);
    setRequiresLogin(false);
    try {
      await organizationsApi.register(values);
      toast.success(
        "Đã nộp hồ sơ đăng ký! Tổ chức của bạn đang ở trạng thái Chờ duyệt."
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
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Image
              src="/homecare-logo.svg"
              alt="HomeCare"
              width={32}
              height={32}
              className="size-8 object-contain"
              priority
            />
            <span className="text-base font-bold tracking-tight text-foreground">
              HomeCare
            </span>
          </Link>

          <div className="flex items-center gap-2.5">
            <ThemeToggle singleButton />
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link href="/">
                <ArrowLeft className="h-3.5 w-3.5" />
                Trang chủ
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="text-xs">
              <Link href="/login?next=/org">Đăng nhập</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">

        {requiresLogin ? (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-bg/70 p-3.5 text-xs text-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="space-y-1">
              <p className="font-semibold">
                Cần đăng nhập để định danh chủ sở hữu hồ sơ
              </p>
              <p className="text-muted-foreground">
                Vui lòng{" "}
                <Link
                  href="/login?next=/register/org"
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  đăng nhập tại đây
                </Link>
                rồi gửi lại biểu mẫu.
              </p>
            </div>
          </div>
        ) : null}

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12"
        >
          {/* Left column: Organization details */}
          <section className="rounded-xl border border-border bg-surface p-5 sm:p-6 space-y-5 lg:col-span-7">
            <div className="border-b border-border pb-3">
              <h2 className="text-sm font-semibold text-foreground">
                Thông tin pháp lý &amp; Liên hệ
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Điền chính xác thông tin doanh nghiệp hoặc cá nhân hành nghề để
                đối chiếu phê duyệt.
              </p>
            </div>

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
                  className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {LEGAL_ENTITY_TYPES.map((entityType) => (
                    <option key={entityType} value={entityType}>
                      {LEGAL_ENTITY_TYPE_LABELS[entityType]}
                    </option>
                  ))}
                </select>
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
                hint="Tùy chọn với cá nhân."
                error={form.formState.errors.taxCode?.message}
              >
                <Input
                  id="taxCode"
                  placeholder="0109283746"
                  {...form.register("taxCode")}
                />
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
                  placeholder="TP. Hồ Chí Minh"
                  {...form.register("city")}
                />
              </FormField>

              <FormField
                label="Địa chỉ trụ sở"
                htmlFor="address"
                required
                error={form.formState.errors.address?.message}
              >
                <Input
                  id="address"
                  aria-invalid={
                    Boolean(form.formState.errors.address) || undefined
                  }
                  placeholder="Số nhà, tên đường, phường/xã"
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
          </section>

          {/* Right column: Evidence upload + Review process + Submit */}
          <aside className="space-y-5 lg:col-span-5 lg:sticky lg:top-24">
            <section className="rounded-xl border border-border bg-surface p-5 sm:p-6 space-y-4">
              <div className="border-b border-border pb-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Tài liệu chứng minh pháp lý
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Tải lên giấy phép hoặc định danh phù hợp với loại hình đã chọn.
                </p>
              </div>

              <OrgEvidenceUploader
                legalEntityType={legalEntityType}
                value={identityEvidenceRefs}
                onChange={(next) =>
                  form.setValue("identityEvidenceRefs", next, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                onAuthRequired={() => setRequiresLogin(true)}
                disabled={submitting}
                error={form.formState.errors.identityEvidenceRefs?.message}
              />

              <div className="rounded-lg border border-border-subtle bg-surface-secondary/70 p-3.5 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span>Quy trình xét duyệt</span>
                </div>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>1. Gửi hồ sơ &amp; tài liệu pháp lý trực tuyến</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>2. Quản trị viên kiểm tra &amp; xác minh định danh</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>3. Kích hoạt không gian điều phối đối tác</span>
                  </li>
                </ul>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full font-semibold"
                loading={submitting}
                disabled={submitting}
              >
                {submitting ? "Đang gửi hồ sơ..." : "Nộp hồ sơ đăng ký"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Đã có tài khoản được duyệt?{" "}
                <Link
                  href="/login?next=/org"
                  className="font-medium text-primary hover:underline underline-offset-2"
                >
                  Đăng nhập ngay
                </Link>
              </p>
            </section>
          </aside>
        </form>
      </main>
    </div>
  );
}
