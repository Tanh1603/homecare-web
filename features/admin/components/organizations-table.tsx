"use client";

import * as React from "react";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { CheckCircle2, PauseCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Organization } from "@/features/organizations/contracts/organization";
import { organizationsApi } from "@/features/organizations/api";
import { DataTable } from "@/shared/ui/data-table";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export function OrganizationsTable({
  initialData,
}: {
  initialData: Organization[];
}) {
  const [rows, setRows] = React.useState<Organization[]>(initialData);
  const [rejectTarget, setRejectTarget] = React.useState<Organization | null>(
    null
  );
  const [reason, setReason] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);

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
        <div>
          <p className="font-medium text-foreground">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">
            MST: {row.original.taxCode} · {row.original.email}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Liên hệ",
      cell: ({ row }) => (
        <div className="text-xs">
          <p>{row.original.phone}</p>
          <p className="max-w-[220px] truncate text-muted-foreground">
            {row.original.address}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "Thao tác",
      cell: ({ row }) => {
        const org = row.original;
        const disabled = busyId === org.id;
        return (
          <div className="flex items-center gap-1.5">
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
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        searchPlaceholder="Tìm tên tổ chức, MST, email..."
      />

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Từ chối hồ sơ: {rejectTarget?.name}
            </DialogTitle>
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
    </>
  );
}
