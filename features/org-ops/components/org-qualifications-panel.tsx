"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { unwrapApiResponse, type ApiResponse } from "@/shared/api/api-envelope";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { FileUploader } from "@/shared/ui/file-uploader";

export interface CategoryQualificationItem {
  id: string;
  providerId: string;
  category: string;
  status: "UNVERIFIED" | "VERIFIED" | "REJECTED" | "REVOKED";
  evidenceRefs?: string | null;
  reason?: string | null;
  verifiedAt?: string | null;
}

const HIGH_RISK_CATEGORIES = [
  { code: "AC_REPAIR_INSTALL", label: "Sửa chữa & Lắp đặt máy lạnh" },
  { code: "ELECTRICAL_REPAIR", label: "Sửa chữa điện dân dụng" },
  { code: "WATER_HEATER_GAS", label: "Máy nước nóng & Thiết bị gas" },
] as const;

const STATUS_LABELS: Record<CategoryQualificationItem["status"], string> = {
  UNVERIFIED: "Chờ duyệt",
  VERIFIED: "Đã xác minh",
  REJECTED: "Từ chối",
  REVOKED: "Đã thu hồi",
};

export function OrgQualificationsPanel({
  organizationId,
}: {
  organizationId: string;
}) {
  const [items, setItems] = React.useState<CategoryQualificationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [submittingCategory, setSubmittingCategory] = React.useState<
    string | null
  >(null);

  const loadQualifications = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gateway/providers/current/qualifications", {
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      });
      const json = (await res.json()) as ApiResponse<CategoryQualificationItem[]>;
      const list = unwrapApiResponse(json);
      setItems(list);
      const nextDrafts: Record<string, string> = {};
      for (const q of list) {
        nextDrafts[q.category] = q.evidenceRefs ?? "";
      }
      setDrafts(nextDrafts);
    } catch {
      // Keep empty state on initial load failure
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  React.useEffect(() => {
    void loadQualifications();
  }, [loadQualifications]);

  async function handleSubmit(category: string) {
    const evidenceRefs = (drafts[category] ?? "").trim();
    if (!evidenceRefs) {
      toast.error("Vui lòng tải lên ít nhất 1 chứng chỉ chuyên môn.");
      return;
    }
    setSubmittingCategory(category);
    try {
      const res = await fetch(
        `/api/gateway/providers/current/qualifications/${encodeURIComponent(category)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": organizationId,
          },
          body: JSON.stringify({ evidenceRefs }),
        }
      );
      const json = (await res.json()) as ApiResponse<CategoryQualificationItem>;
      const updated = unwrapApiResponse(json);
      setItems((prev) => {
        const exists = prev.some((it) => it.category === category);
        return exists
          ? prev.map((it) => (it.category === category ? updated : it))
          : [...prev, updated];
      });
      toast.success("Đã gửi chứng chỉ chuyên môn để Admin xét duyệt.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể gửi chứng chỉ."
      );
    } finally {
      setSubmittingCategory(null);
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-foreground">
          Chứng chỉ chuyên môn theo danh mục
        </h2>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Đang tải chứng chỉ...</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {HIGH_RISK_CATEGORIES.map((cat) => {
            const current = items.find((it) => it.category === cat.code);
            const status = current?.status;
            const draft = drafts[cat.code] ?? "";
            const isSaving = submittingCategory === cat.code;

            return (
              <div
                key={cat.code}
                className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-surface-secondary/40 p-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">
                      {cat.label}
                    </p>
                    <Badge
                      variant={
                        status === "VERIFIED"
                          ? "success"
                          : status === "REJECTED" || status === "REVOKED"
                            ? "destructive"
                            : "outline"
                      }
                      className="shrink-0 text-[11px]"
                    >
                      {status ? STATUS_LABELS[status] : "Chưa nộp"}
                    </Badge>
                  </div>

                  {current?.reason ? (
                    <p className="text-xs text-destructive">
                      Ghi chú: {current.reason}
                    </p>
                  ) : null}

                  <FileUploader
                    value={draft}
                    onChange={(next) =>
                      setDrafts((prev) => ({ ...prev, [cat.code]: next }))
                    }
                    presignUrl="/api/gateway/organizations/evidence/presign"
                    documentType={cat.code}
                    inputLabel={`Chọn chứng chỉ ${cat.label}`}
                    buttonLabel="Tải chứng chỉ"
                    disabled={isSaving}
                  />
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!draft.trim() || isSaving}
                  onClick={() => void handleSubmit(cat.code)}
                >
                  {isSaving ? "Đang gửi..." : "Gửi duyệt chứng chỉ"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
