"use client";

import * as React from "react";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { CheckCircle2, PauseCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  ORGANIZATION_TYPE_LABELS,
  type Organization,
  type OrganizationStatus,
} from "@/features/organizations/contracts/organization";
import { organizationsApi } from "@/features/organizations/api";
import { DataTable } from "@/shared/ui/data-table";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";

type StatusFilter = "ALL" | OrganizationStatus;

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "SUSPENDED", label: "Tạm ngưng" },
  { value: "REJECTED", label: "Từ chối" },
];

export function OrganizationsTable({
  initialData,
}: {
  initialData: Organization[];
}) {
  const [rows, setRows] = React.useState<Organization[]>(initialData);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");
  const [rejectTarget, setRejectTarget] = React.useState<Organization | null>(
    null
  );
  const [reason, setReason] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const filteredRows = React.useMemo(() => {
    if (statusFilter === "ALL") return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [rows, statusFilter]);

  async function handleReview(
    org: Organization,
    status: "APPROVED" | "REJECTED" | "SUSPENDED",
    reviewReason?: string
  ) {
    setBusyId(org.id);
    try {
      const updated = await organizationsApi.review(org.id, {
        status,
        reason: reviewReason,
      });
      setRows((prev) => prev.map((r) => (r.id === org.id ? updated : r)));
      toast.success(`Đã cập nhật trạng thái ${org.name} → ${status}`);
      setRejectTarget(null);
      setReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setBusyId(null);
    }
  }

  const columns: LegacyColumnDef<Organization, unknown>[] = [
    {
      accessorKey: "name",
      header: "Tổ chức",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{row.original.name}</p>
            <Badge variant="outline" className="text-[11px]">
              {ORGANIZATION_TYPE_LABELS[row.original.type] ?? row.original.type}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {row.original.taxCode ? `MST: ${row.original.taxCode} · ` : ""}
            {row.original.city}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Liên hệ & Địa chỉ",
      cell: ({ row }) => (
        <div className="text-xs space-y-0.5">
          <p className="font-medium text-foreground">{row.original.phone}</p>
          <p className="max-w-[240px] truncate text-muted-foreground">
            {row.original.address || row.original.city}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.status} />
          {row.original.rejectReason ? (
            <p className="max-w-[200px] truncate text-[11px] text-destructive">
              {row.original.rejectReason}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Thao tác",
      cell: ({ row }) => {
        const org = row.original;
        const disabled = busyId === org.id;
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {org.status !== "APPROVED" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => handleReview(org, "APPROVED")}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                Duyệt
              </Button>
            ) : null}
            {org.status === "PENDING" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => setRejectTarget(org)}
              >
                <XCircle className="h-3.5 w-3.5 text-destructive" />
                Từ chối
              </Button>
            ) : null}
            {org.status === "APPROVED" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() =>
                  handleReview(org, "SUSPENDED", "Tạm ngưng bởi quản trị viên")
                }
              >
                <PauseCircle className="h-3.5 w-3.5 text-warning" />
                Tạm ngưng
              </Button>
            ) : null}
            {org.status === "SUSPENDED" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === org.id}
                onClick={async () => {
                  setBusyId(org.id);
                  try {
                    const updated = await organizationsApi.reactivate(org.id);
                    setRows((prev) =>
                      prev.map((r) => (r.id === org.id ? updated : r))
                    );
                    toast.success(`Đã kích hoạt lại "${org.name}"`);
                  } catch (err) {
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Không thể kích hoạt lại tổ chức"
                    );
                  } finally {
                    setBusyId(null);
                  }
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                Kích hoạt lại
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.value === "ALL"
              ? rows.length
              : rows.filter((r) => r.status === tab.value).length;
          const active = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                active
                  ? "border-primary/30 bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              <span className="tabular-nums opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      <DataTable
        data={filteredRows}
        columns={columns}
        searchPlaceholder="Tìm tên tổ chức, MST, thành phố..."
        emptyMessage="Không có hồ sơ tổ chức nào khớp bộ lọc."
      />

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối hồ sơ: {rejectTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="reject-reason">Lý do từ chối</Label>
              <Input
                id="reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Thiếu giấy phép kinh doanh hợp lệ"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectTarget(null)}>
                Hủy
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectTarget || busyId === rejectTarget.id}
                onClick={() =>
                  rejectTarget &&
                  handleReview(
                    rejectTarget,
                    "REJECTED",
                    reason || "Hồ sơ chưa đạt yêu cầu"
                  )
                }
              >
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
