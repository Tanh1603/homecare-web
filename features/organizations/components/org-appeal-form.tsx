"use client";

import * as React from "react";
import { toast } from "sonner";
import { organizationsHttpAdapter } from "@/features/organizations/api/organizations.http";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

export function OrgAppealForm({ organizationId }: { organizationId: string }) {
  const [enforcementId, setEnforcementId] = React.useState("");
  const [appealReason, setAppealReason] = React.useState("");
  const [evidenceRefs, setEvidenceRefs] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submittedResult, setSubmittedResult] = React.useState<{
    id: string;
    status: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!enforcementId.trim() || !appealReason.trim()) {
      toast.error("Vui lòng nhập mã quyết định chế tài và lý do kháng cáo.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await organizationsHttpAdapter.submitAppeal(organizationId, {
        enforcementId: enforcementId.trim(),
        appealReason: appealReason.trim(),
        evidenceRefs: evidenceRefs.trim() || undefined,
      });
      setSubmittedResult({ id: res.id, status: res.status });
      toast.success("Đã gửi đơn kháng cáo. Admin sẽ xem xét trong 5 ngày làm việc.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể gửi đơn kháng cáo."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedResult) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <p className="font-medium text-foreground">
          Đã tiếp nhận kháng cáo ({submittedResult.status})
        </p>
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          Mã hồ sơ: {submittedResult.id}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
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
      <div className="space-y-1.5">
        <Label htmlFor="appeal-enforcement-id">Mã quyết định chế tài</Label>
        <Input
          id="appeal-enforcement-id"
          placeholder="Nhập mã quyết định chế tài"
          value={enforcementId}
          onChange={(e) => setEnforcementId(e.target.value)}
          disabled={submitting}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="appeal-reason">Nội dung giải trình & khắc phục</Label>
        <Textarea
          id="appeal-reason"
          rows={3}
          placeholder="Nêu rõ lý do và biện pháp đã khắc phục..."
          value={appealReason}
          onChange={(e) => setAppealReason(e.target.value)}
          disabled={submitting}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="appeal-evidence">
          Tài liệu / Bằng chứng bổ sung (tùy chọn)
        </Label>
        <Input
          id="appeal-evidence"
          placeholder="Đường dẫn hoặc mã tài liệu đối chiếu"
          value={evidenceRefs}
          onChange={(e) => setEvidenceRefs(e.target.value)}
          disabled={submitting}
        />
      </div>
      <Button type="submit" size="sm" disabled={submitting}>
        {submitting ? "Đang gửi..." : "Gửi đơn kháng cáo"}
      </Button>
    </form>
  );
}
