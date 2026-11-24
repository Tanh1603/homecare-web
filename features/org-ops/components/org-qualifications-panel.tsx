"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { unwrapApiResponse, type ApiResponse } from "@/shared/api/api-envelope";
import {
  parseUploadedMediaRefs,
  serializeUploadedMediaRefs,
} from "@/shared/api/media-upload";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EvidenceDocumentsList } from "@/shared/ui/evidence-documents-list";
import { Skeleton } from "@/shared/ui/skeleton";
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
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [submittingCategory, setSubmittingCategory] = React.useState<
    string | null
  >(null);
  const [removingKey, setRemovingKey] = React.useState<string | null>(null);

  const loadQualifications = React.useCallback(async () => {
    try {
      setLoadError(null);
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
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách chứng chỉ chuyên môn."
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  React.useEffect(() => {
    void Promise.resolve().then(loadQualifications);
  }, [loadQualifications]);

  async function persistQualification(
    category: string,
    evidenceRefs: string
  ) {
    const trimmed = evidenceRefs.trim();
    if (!trimmed) {
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
          body: JSON.stringify({ evidenceRefs: trimmed }),
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
      setDrafts((prev) => ({
        ...prev,
        [category]: updated.evidenceRefs ?? trimmed,
      }));
      toast.success("Đã lưu và gửi chứng chỉ chuyên môn để Admin xét duyệt.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể gửi chứng chỉ."
      );
    } finally {
      setSubmittingCategory(null);
    }
  }

  async function handleSubmit(category: string) {
    await persistQualification(category, drafts[category] ?? "");
  }

  async function handleRemoveFile(category: string, objectKey: string) {
    const currentRefs = parseUploadedMediaRefs(drafts[category]);
    const remaining = currentRefs.filter((item) => item.objectKey !== objectKey);
    const nextSerialized = serializeUploadedMediaRefs(remaining);

    setRemovingKey(objectKey);
    setSubmittingCategory(category);
    try {
      if (remaining.length > 0) {
        await persistQualification(category, nextSerialized);
      } else {
        const res = await fetch(
          `/api/gateway/providers/current/qualifications/${encodeURIComponent(category)}`,
          {
            method: "DELETE",
            headers: {
              "X-Organization-Id": organizationId,
            },
          }
        );
        if (!res.ok && res.status !== 204) {
          const json = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
          throw new Error(json?.message || "Không thể xóa chứng chỉ.");
        }
        setItems((prev) => prev.filter((it) => it.category !== category));
        setDrafts((prev) => ({ ...prev, [category]: "" }));
        toast.success("Đã xóa chứng chỉ khỏi danh mục.");
      }

      if (!/^https?:\/\//i.test(objectKey)) {
        void fetch(
          `/api/gateway/organizations/${encodeURIComponent(organizationId)}/evidence?objectKey=${encodeURIComponent(objectKey)}`,
          {
            method: "DELETE",
            headers: { "x-homecare-scope": "personal" },
          }
        ).catch(() => {});
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa tệp chứng chỉ."
      );
    } finally {
      setRemovingKey(null);
      setSubmittingCategory(null);
    }
  }

  return (
    <Card id="qualifications" className="p-5 space-y-4 scroll-mt-20">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-foreground">
          Chứng chỉ chuyên môn theo danh mục
        </h2>
      </div>

      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div
          className="grid gap-4 lg:grid-cols-3"
          role="status"
          aria-busy="true"
          aria-label="Đang tải chứng chỉ"
        >
          {HIGH_RISK_CATEGORIES.map((category) => (
            <div key={category.code} className="flex flex-col gap-3 rounded-lg border border-border p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
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
                    showFileList={false}
                    onChange={(next) => {
                      setDrafts((prev) => ({ ...prev, [cat.code]: next }));
                      if (next.trim()) {
                        void persistQualification(cat.code, next);
                      }
                    }}
                    presignUrl="/api/gateway/organizations/evidence/presign"
                    documentType={cat.code}
                    inputLabel={`Chọn chứng chỉ ${cat.label}`}
                    buttonLabel="Tải chứng chỉ"
                    disabled={isSaving}
                  />

                  <div className="pt-1">
                    <EvidenceDocumentsList
                      organizationId={organizationId}
                      value={draft}
                      emptyText="Chưa có tệp chứng chỉ nào."
                      onRemove={(objectKey) =>
                        void handleRemoveFile(cat.code, objectKey)
                      }
                      removingKey={removingKey}
                      disabled={isSaving}
                    />
                  </div>
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
