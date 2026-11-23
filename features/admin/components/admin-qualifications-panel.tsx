"use client";

import * as React from "react";
import { toast } from "sonner";
import { unwrapApiResponse, type ApiResponse } from "@/shared/api/api-envelope";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EvidenceDocumentsList } from "@/shared/ui/evidence-documents-list";
import { Input } from "@/shared/ui/input";
import type { CategoryQualificationItem } from "@/features/org-ops/components/org-qualifications-panel";

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
  const [items, setItems] = React.useState<CategoryQualificationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [reasons, setReasons] = React.useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/gateway/admin/providers/${encodeURIComponent(organizationId)}/qualifications`,
          {
            cache: "no-store",
            headers: { "x-homecare-scope": "personal" },
          }
        );
        const json = (await res.json()) as ApiResponse<
          CategoryQualificationItem[]
        >;
        if (active) {
          setItems(unwrapApiResponse(json));
        }
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [organizationId]);

  async function handleVerify(
    category: string,
    decision: "VERIFIED" | "REJECTED" | "REVOKED"
  ) {
    const reason = (reasons[category] ?? "").trim();
    if (decision !== "VERIFIED" && !reason) {
      toast.error("Vui lòng nhập lý do từ chối hoặc thu hồi.");
      return;
    }
    setBusyKey(category);
    try {
      const res = await fetch(
        `/api/gateway/admin/providers/${encodeURIComponent(organizationId)}/qualifications/${encodeURIComponent(category)}/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-homecare-scope": "personal",
          },
          body: JSON.stringify({
            decision,
            reason: reason || undefined,
          }),
        }
      );
      const json = (await res.json()) as ApiResponse<CategoryQualificationItem>;
      const updated = unwrapApiResponse(json);
      setItems((prev) =>
        prev.map((it) => (it.category === category ? updated : it))
      );
      toast.success(`Đã cập nhật chứng chỉ ${CATEGORY_LABELS[category] ?? category}.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật chứng chỉ."
      );
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-semibold text-foreground">
          Chứng chỉ chuyên môn theo danh mục
        </h2>
      </div>
      <div className="p-5">
        {loading ? (
          <p className="text-xs text-muted-foreground">Đang tải chứng chỉ...</p>
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
                        onClick={() => void handleVerify(item.category, "VERIFIED")}
                      >
                        Duyệt
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => void handleVerify(item.category, "REJECTED")}
                      >
                        Từ chối
                      </Button>
                      {item.status === "VERIFIED" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={isBusy}
                          onClick={() => void handleVerify(item.category, "REVOKED")}
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
