"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { organizationsApi } from "@/features/organizations/api";
import {
  LEGAL_ENTITY_TYPES,
  LEGAL_ENTITY_TYPE_LABELS,
  resubmitOrganizationSchema,
  type Organization,
  type ResubmitOrganizationInput,
} from "@/features/organizations/contracts/organization";
import { OrgEvidenceUploader } from "@/features/organizations/components/org-evidence-uploader";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

export function OrgResubmitForm({
  organization,
}: {
  organization: Organization;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<ResubmitOrganizationInput>({
    resolver: zodResolver(resubmitOrganizationSchema),
    defaultValues: {
      name: organization.name,
      legalEntityType: organization.legalEntityType ?? "COMPANY",
      taxCode: organization.taxCode ?? "",
      phone: organization.phone,
      city: organization.city,
      address: organization.address ?? "",
      description: organization.description ?? "",
      identityEvidenceRefs: organization.identityEvidenceRefs ?? "",
    },
  });

  const evidenceValue = form.watch("identityEvidenceRefs");
  const legalEntityType = form.watch("legalEntityType");

  async function onSubmit(values: ResubmitOrganizationInput) {
    setSubmitting(true);
    try {
      await organizationsApi.resubmit(
        organization.id,
        values,
        organization.version
      );
      toast.success("Đã gửi lại hồ sơ tổ chức. Trạng thái chuyển về PENDING.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể gửi lại hồ sơ."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4 rounded-lg border border-border bg-muted/20 p-4"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">
          Cập nhật &amp; nộp lại hồ sơ
        </h3>
        {typeof organization.resubmitCount === "number" ? (
          <p className="text-xs text-muted-foreground tabular-nums">
            Số lần đã nộp lại: {organization.resubmitCount}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          label="Tên tổ chức"
          htmlFor="resubmit-name"
          required
          error={form.formState.errors.name?.message}
          className="sm:col-span-2"
        >
          <Input
            id="resubmit-name"
            disabled={submitting}
            {...form.register("name")}
          />
        </FormField>

        <FormField
          label="Loại hình pháp lý"
          htmlFor="resubmit-legal-entity"
          required
          error={form.formState.errors.legalEntityType?.message}
        >
          <select
            id="resubmit-legal-entity"
            disabled={submitting}
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
          label="Mã số thuế"
          htmlFor="resubmit-tax-code"
          error={form.formState.errors.taxCode?.message}
        >
          <Input
            id="resubmit-tax-code"
            disabled={submitting}
            {...form.register("taxCode")}
          />
        </FormField>

        <FormField
          label="Số điện thoại"
          htmlFor="resubmit-phone"
          required
          error={form.formState.errors.phone?.message}
        >
          <Input
            id="resubmit-phone"
            disabled={submitting}
            {...form.register("phone")}
          />
        </FormField>

        <FormField
          label="Tỉnh / Thành phố"
          htmlFor="resubmit-city"
          required
          error={form.formState.errors.city?.message}
        >
          <Input
            id="resubmit-city"
            disabled={submitting}
            {...form.register("city")}
          />
        </FormField>

        <FormField
          label="Địa chỉ trụ sở"
          htmlFor="resubmit-address"
          required
          error={form.formState.errors.address?.message}
          className="sm:col-span-2"
        >
          <Input
            id="resubmit-address"
            disabled={submitting}
            {...form.register("address")}
          />
        </FormField>

        <FormField
          label="Giới thiệu năng lực"
          htmlFor="resubmit-description"
          className="sm:col-span-2"
        >
          <Textarea
            id="resubmit-description"
            rows={2}
            disabled={submitting}
            {...form.register("description")}
          />
        </FormField>

        <div className="space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-foreground">
            Tài liệu chứng minh pháp lý{" "}
            <span className="text-destructive">*</span>
          </span>
          <OrgEvidenceUploader
            legalEntityType={legalEntityType}
            value={evidenceValue}
            onChange={(next) =>
              form.setValue("identityEvidenceRefs", next, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            disabled={submitting}
            error={form.formState.errors.identityEvidenceRefs?.message}
          />
        </div>
      </div>

      <Button type="submit" disabled={submitting} loading={submitting}>
        {submitting ? "Đang gửi lại..." : "Nộp lại hồ sơ"}
      </Button>
    </form>
  );
}
