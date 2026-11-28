"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { organizationsHttpAdapter } from "@/features/organizations/api/organizations.http";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

const orgAppealSchema = z.object({
  enforcementId: z.string().trim().min(1, "Vui lòng nhập mã quyết định chế tài."),
  appealReason: z.string().trim().min(1, "Vui lòng nhập nội dung giải trình và khắc phục."),
  evidenceRefs: z.string().trim().optional(),
});

type OrgAppealValues = z.infer<typeof orgAppealSchema>;

export function OrgAppealForm({ organizationId }: { organizationId: string }) {
  const form = useForm<OrgAppealValues>({
    resolver: zodResolver(orgAppealSchema),
    defaultValues: {
      enforcementId: "",
      appealReason: "",
      evidenceRefs: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: (values: OrgAppealValues) =>
      organizationsHttpAdapter.submitAppeal(organizationId, {
        enforcementId: values.enforcementId.trim(),
        appealReason: values.appealReason.trim(),
        evidenceRefs: values.evidenceRefs?.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Đã gửi đơn kháng cáo. Admin sẽ xem xét trong 5 ngày làm việc.");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể gửi đơn kháng cáo."
      );
    },
  });

  if (submitMutation.data) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <p className="font-medium text-foreground">
          Đã tiếp nhận kháng cáo ({submitMutation.data.status})
        </p>
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          Mã hồ sơ: {submitMutation.data.id}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit((values) => submitMutation.mutate(values))}
      className="space-y-3 rounded-lg border border-border bg-muted/20 p-4"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">
          Nộp đơn kháng cáo
        </h3>
        <p className="text-xs text-muted-foreground">
          Chủ sở hữu tổ chức được gửi 1 lần cho mỗi quyết định chế tài trong thời hạn kháng cáo.
        </p>
      </div>
      <FormField
        label="Mã quyết định chế tài"
        htmlFor="appeal-enforcement-id"
        required
        error={form.formState.errors.enforcementId?.message}
      >
        <Input
          id="appeal-enforcement-id"
          placeholder="Nhập mã quyết định chế tài"
          disabled={submitMutation.isPending}
          {...form.register("enforcementId")}
        />
      </FormField>
      <FormField
        label="Nội dung giải trình & khắc phục"
        htmlFor="appeal-reason"
        required
        error={form.formState.errors.appealReason?.message}
      >
        <Textarea
          id="appeal-reason"
          rows={3}
          placeholder="Nêu rõ lý do và biện pháp đã khắc phục..."
          disabled={submitMutation.isPending}
          {...form.register("appealReason")}
        />
      </FormField>
      <FormField
        label="Tài liệu / Bằng chứng bổ sung (tùy chọn)"
        htmlFor="appeal-evidence"
        error={form.formState.errors.evidenceRefs?.message}
      >
        <Input
          id="appeal-evidence"
          placeholder="Đường dẫn hoặc mã tài liệu đối chiếu"
          disabled={submitMutation.isPending}
          {...form.register("evidenceRefs")}
        />
      </FormField>
      <Button type="submit" size="sm" disabled={submitMutation.isPending}>
        {submitMutation.isPending ? "Đang gửi..." : "Gửi đơn kháng cáo"}
      </Button>
    </form>
  );
}
