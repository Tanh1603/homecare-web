"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  orgOpsHttpApi,
  type CategoryQualificationItem,
} from "../api/org-ops.http";
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

export type { CategoryQualificationItem };

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
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [removingKey, setRemovingKey] = React.useState<string | null>(null);

  const queryKey = ["org", organizationId, "qualifications"] as const;

  const qualificationsQuery = useQuery({
    queryKey,
    queryFn: () => orgOpsHttpApi.listCurrentQualifications(organizationId),
  });

  const upsertMutation = useMutation({
    mutationFn: (vars: { category: string; evidenceRefs: string }) =>
      orgOpsHttpApi.upsertCurrentQualification(
        organizationId,
        vars.category,
        vars.evidenceRefs
      ),
    onSuccess: (updated, vars) => {
      queryClient.setQueryData<CategoryQualificationItem[]>(queryKey, (prev = []) => {
        const exists = prev.some((it) => it.category === vars.category);
        return exists
          ? prev.map((it) => (it.category === vars.category ? updated : it))
          : [...prev, updated];
      });
      setDrafts((prev) => ({
        ...prev,
        [vars.category]: updated.evidenceRefs ?? vars.evidenceRefs,
      }));
      toast.success("Đã lưu và gửi chứng chỉ chuyên môn để Admin xét duyệt.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể gửi chứng chỉ.");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (vars: {
      category: string;
      objectKey: string;
      remaining: ReturnType<typeof parseUploadedMediaRefs>;
      nextSerialized: string;
    }) => {
      if (vars.remaining.length > 0) {
        const updated = await orgOpsHttpApi.upsertCurrentQualification(
          organizationId,
          vars.category,
          vars.nextSerialized
        );
        return { kind: "updated" as const, updated, vars };
      }
      await orgOpsHttpApi.deleteCurrentQualification(organizationId, vars.category);
      return { kind: "deleted" as const, vars };
    },
    onSuccess: (result) => {
      const { vars } = result;
      if (result.kind === "updated") {
        queryClient.setQueryData<CategoryQualificationItem[]>(queryKey, (prev = []) =>
          prev.map((it) => (it.category === vars.category ? result.updated : it))
        );
        setDrafts((prev) => ({
          ...prev,
          [vars.category]: result.updated.evidenceRefs ?? vars.nextSerialized,
        }));
        toast.success("Đã lưu và gửi chứng chỉ chuyên môn để Admin xét duyệt.");
      } else {
        queryClient.setQueryData<CategoryQualificationItem[]>(queryKey, (prev = []) =>
          prev.filter((it) => it.category !== vars.category)
        );
        setDrafts((prev) => ({ ...prev, [vars.category]: "" }));
        toast.success("Đã xóa chứng chỉ khỏi danh mục.");
      }

      if (!/^https?:\/\//i.test(vars.objectKey)) {
        void orgOpsHttpApi
          .deleteOrganizationEvidence(organizationId, vars.objectKey)
          .catch(() => {});
      }
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa tệp chứng chỉ."
      );
    },
    onSettled: () => {
      setRemovingKey(null);
    },
  });

  function persistQualification(category: string, evidenceRefs: string) {
    const trimmed = evidenceRefs.trim();
    if (!trimmed) {
      toast.error("Vui lòng tải lên ít nhất 1 chứng chỉ chuyên môn.");
      return;
    }
    upsertMutation.mutate({ category, evidenceRefs: trimmed });
  }

  function handleRemoveFile(category: string, objectKey: string, currentDraft: string) {
    const currentRefs = parseUploadedMediaRefs(currentDraft);
    const remaining = currentRefs.filter((item) => item.objectKey !== objectKey);
    const nextSerialized = serializeUploadedMediaRefs(remaining);
    setRemovingKey(objectKey);
    removeMutation.mutate({ category, objectKey, remaining, nextSerialized });
  }

  const items = qualificationsQuery.data ?? [];
  const loadError =
    qualificationsQuery.error instanceof Error
      ? qualificationsQuery.error.message
      : qualificationsQuery.isError
        ? "Không thể tải danh sách chứng chỉ chuyên môn."
        : null;

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

      {qualificationsQuery.isPending ? (
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
            const draft = drafts[cat.code] ?? current?.evidenceRefs ?? "";
            const isSaving =
              (upsertMutation.isPending && upsertMutation.variables?.category === cat.code) ||
              (removeMutation.isPending && removeMutation.variables?.category === cat.code);

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
                        persistQualification(cat.code, next);
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
                        handleRemoveFile(cat.code, objectKey, draft)
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
                  onClick={() => persistQualification(cat.code, draft)}
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
