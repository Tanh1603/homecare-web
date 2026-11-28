"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminHttpApi } from "@/features/admin/api/admin.http";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { Button } from "@/shared/ui/button";
import { EvidenceDocumentsList } from "@/shared/ui/evidence-documents-list";
import { Input } from "@/shared/ui/input";
import type { CategoryQualificationItem } from "@/features/org-ops/api/org-ops.http";

const CATEGORY_LABELS: Record<string, string> = {
  AC_REPAIR_INSTALL: "Sửa chữa & Lắp đặt máy lạnh",
  ELECTRICAL_REPAIR: "Sửa chữa điện dân dụng",
  WATER_HEATER_GAS: "Máy nước nóng & Thiết bị gas",
};

const STATUS_LABELS: Record<CategoryQualificationItem["status"], string> = {
  UNVERIFIED: "Chờ duyệt",
  VERIFIED: "Đã xác minh",
  REJECTED: "Từ chối",
  REVOKED: "Đã thu hồi",
};

export function AdminQualificationsPanel({
  organizationId,
}: {
  organizationId: string;
}) {
  const queryClient = useQueryClient();
  const [reasons, setReasons] = React.useState<Record<string, string>>({});

  const queryKey = ["admin", "provider-qualifications", organizationId] as const;

  const qualificationsQuery = useQuery({
    queryKey,
    queryFn: () => adminHttpApi.adminListProviderQualifications(organizationId),
  });

  const verifyMutation = useMutation({
    mutationFn: (vars: {
      category: string;
      decision: "VERIFIED" | "REJECTED" | "REVOKED";
      reason?: string;
    }) =>
      adminHttpApi.adminVerifyProviderQualification(
        organizationId,
        vars.category,
        { decision: vars.decision, reason: vars.reason }
      ),
    onSuccess: (updated, vars) => {
      queryClient.setQueryData<CategoryQualificationItem[]>(queryKey, (prev = []) =>
        prev.map((it) => (it.category === vars.category ? updated : it))
      );
      toast.success(
        `Đã cập nhật chứng chỉ ${CATEGORY_LABELS[vars.category] ?? vars.category}.`
      );
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật chứng chỉ."
      );
    },
  });

  function handleVerify(
    category: string,
    decision: "VERIFIED" | "REJECTED" | "REVOKED"
  ) {
    const reason = (reasons[category] ?? "").trim();
    if (decision !== "VERIFIED" && !reason) {
      toast.error("Vui lòng nhập lý do từ chối hoặc thu hồi.");
      return;
    }
    verifyMutation.mutate({
      category,
      decision,
      reason: reason || undefined,
    });
  }

  const items = qualificationsQuery.data ?? [];
  const busyKey = verifyMutation.isPending ? verifyMutation.variables?.category ?? null : null;

  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-semibold text-foreground">
          Chứng chỉ chuyên môn theo danh mục
        </h2>
      </div>
      <div className="p-5">
        {qualificationsQuery.isPending ? (
          <div
            className="flex flex-col gap-3"
            role="status"
            aria-busy="true"
            aria-label="Đang tải chứng chỉ"
          >
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex flex-col gap-3 rounded-lg border border-border p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Tổ chức chưa nộp chứng chỉ chuyên môn nào.
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const isBusy = busyKey === item.category;
              return (
                <div
                  key={item.id}
                  className="space-y-3 rounded-lg border border-border bg-surface-secondary/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </span>
                    <Badge
                      variant={
                        item.status === "VERIFIED"
                          ? "success"
                          : item.status === "REJECTED" ||
                              item.status === "REVOKED"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {STATUS_LABELS[item.status]}
                    </Badge>
                  </div>

                  <EvidenceDocumentsList
                    value={item.evidenceRefs}
                    organizationId={organizationId}
                  />

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      placeholder="Lý do (bắt buộc khi từ chối / thu hồi)"
                      value={reasons[item.category] ?? item.reason ?? ""}
                      disabled={isBusy}
                      onChange={(e) =>
                        setReasons((prev) => ({
                          ...prev,
                          [item.category]: e.target.value,
                        }))
                      }
                      className="h-8 text-xs"
                    />
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isBusy || item.status === "VERIFIED"}
                        onClick={() => handleVerify(item.category, "VERIFIED")}
                      >
                        Duyệt
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => handleVerify(item.category, "REJECTED")}
                      >
                        Từ chối
                      </Button>
                      {item.status === "VERIFIED" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={isBusy}
                          onClick={() => handleVerify(item.category, "REVOKED")}
                        >
                          Thu hồi
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
