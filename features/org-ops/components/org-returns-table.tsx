"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banknote, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { OrganizationMemberRole } from "@/features/organizations/contracts/organization";
import type { OrgReturnItem } from "../api/org-ops.adapter";
import { orgOpsHttpApi } from "../api/org-ops.http";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { RowActionsMenu } from "@/shared/ui/row-actions-menu";
import { StatusBadge } from "@/shared/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { formatDateTime, formatShortId } from "@/shared/lib/utils";

export function OrgReturnsTable({
  organizationId,
  currentUserRole,
  initialReturns,
}: {
  organizationId: string;
  currentUserRole?: OrganizationMemberRole;
  initialReturns: OrgReturnItem[];
}) {
  const router = useRouter();
  const isOwner =
    currentUserRole === "ORG_OWNER" || currentUserRole === "OWNER";
  const [rows, setRows] = React.useState<OrgReturnItem[]>(initialReturns);
  const [target, setTarget] = React.useState<{
    item: OrgReturnItem;
    action: "APPROVE" | "REJECT";
  } | null>(null);
  const [note, setNote] = React.useState("");

  const [refundTarget, setRefundTarget] = React.useState<OrgReturnItem | null>(
    null
  );
  const [refundRef, setRefundRef] = React.useState("");
  const [refundNote, setRefundNote] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setBusyId(target.item.id);
    try {
      const updated = await orgOpsHttpApi.resolveOrderReturn(
        organizationId,
        target.item.orderId,
        target.item.id,
        {
          action: target.action,
          resolutionNote: note,
        },
        target.item.version
      );
      setRows((prev) =>
        prev.map((r) => (r.id === target.item.id ? { ...r, ...updated } : r))
      );
      toast.success(
        target.action === "APPROVE"
          ? "Đã duyệt yêu cầu trả hàng"
          : "Đã từ chối yêu cầu trả hàng"
      );
      setTarget(null);
      setNote("");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể xử lý yêu cầu trả hàng"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleManualRefundConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!refundTarget) return;
    setBusyId(refundTarget.id);
    try {
      const updated = await orgOpsHttpApi.confirmManualRefund(
        organizationId,
        refundTarget.orderId,
        refundTarget.id,
        refundNote.trim()
          ? { reference: refundRef, note: refundNote }
          : refundRef,
        refundTarget.version
      );
      setRows((prev) =>
        prev.map((r) => (r.id === refundTarget.id ? { ...r, ...updated } : r))
      );
      toast.success("Đã xác nhận hoàn tiền thủ công");
      setRefundTarget(null);
      setRefundRef("");
      setRefundNote("");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể xác nhận hoàn tiền"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleRetryRefund(r: OrgReturnItem) {
    setBusyId(r.id);
    try {
      const updated = await orgOpsHttpApi.retryRefund(
        organizationId,
        r.orderId,
        r.id,
        r.version
      );
      setRows((prev) =>
        prev.map((item) => (item.id === r.id ? { ...item, ...updated } : item))
      );
      toast.success("Đã gửi lại yêu cầu xử lý hoàn tiền");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể thử lại hoàn tiền"
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã YC</TableHead>
              <TableHead>Đơn hàng</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>SL</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Lý do</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const isPending = r.status === "REQUESTED";
              const canManualRefund =
                isOwner &&
                (r.status === "APPROVED_PENDING_MANUAL_REFUND" ||
                  r.status === "REFUND_FAILED");
              const canRetry = r.status === "REFUND_FAILED";
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs" title={r.id}>
                    #{formatShortId(r.id)}
                  </TableCell>
                  <TableCell className="font-mono text-xs" title={r.orderId}>
                    #{formatShortId(r.orderId)}
                  </TableCell>
                  <TableCell className="font-medium">{r.buyerName}</TableCell>
                  <TableCell>{r.productName}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.returnType}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                    {r.reason}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(r.createdAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} domain="return" />
                  </TableCell>
                  <TableCell className="w-[1%] whitespace-nowrap text-right">
                    {!isPending && !canManualRefund && !canRetry ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <RowActionsMenu
                        ariaLabel={`Thao tác cho yêu cầu trả hàng #${formatShortId(r.id)}`}
                        disabled={busyId === r.id}
                        primaryAction={
                          canManualRefund
                            ? {
                                label: "Xác nhận hoàn tiền",
                                icon: Banknote,
                                onClick: () => {
                                  setRefundTarget(r);
                                  setRefundRef("");
                                  setRefundNote("");
                                },
                              }
                            : isPending
                              ? {
                                  label: "Duyệt",
                                  icon: CheckCircle2,
                                  onClick: () => {
                                    setTarget({ item: r, action: "APPROVE" });
                                    setNote("");
                                  },
                                }
                              : null
                        }
                        groups={[
                          {
                            id: "actions",
                            items: [
                              {
                                id: "retry",
                                label: "Thử lại hoàn tiền",
                                icon: RefreshCw,
                                hidden: !canRetry,
                                onSelect: () => handleRetryRefund(r),
                              },
                            ],
                          },
                          {
                            id: "danger",
                            items: [
                              {
                                id: "reject",
                                label: "Từ chối yêu cầu",
                                icon: XCircle,
                                destructive: true,
                                hidden: !isPending,
                                onSelect: () => {
                                  setTarget({ item: r, action: "REJECT" });
                                  setNote("");
                                },
                              },
                            ],
                          },
                        ]}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={Boolean(target)}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {target?.action === "APPROVE"
                ? "Duyệt yêu cầu trả hàng / hoàn tiền"
                : "Từ chối yêu cầu trả hàng"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConfirm} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sản phẩm:{" "}
              <strong className="text-foreground">
                {target?.item.productName}
              </strong>{" "}
              (SL: {target?.item.quantity}) — Khách hàng:{" "}
              <strong className="text-foreground">
                {target?.item.buyerName}
              </strong>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="return-resolution-note">Ghi chú xử lý</Label>
              <Input
                id="return-resolution-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  target?.action === "REJECT"
                    ? "Nhập lý do từ chối..."
                    : "Ghi chú xác nhận (tùy chọn)..."
                }
                required={target?.action === "REJECT"}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTarget(null)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant={
                  target?.action === "REJECT" ? "destructive" : "default"
                }
                disabled={Boolean(busyId)}
              >
                {busyId ? "Đang xử lý..." : "Xác nhận"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(refundTarget)}
        onOpenChange={(open) => {
          if (!open) setRefundTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận đã hoàn tiền thủ công</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleManualRefundConfirm} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Chỉ Chủ sở hữu tổ chức mới được xác nhận hoàn tiền cho đơn{" "}
              <strong className="text-foreground">
                #{formatShortId(refundTarget?.orderId ?? "")}
              </strong>
              .
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="manual-refund-ref">Mã giao dịch chuyển khoản</Label>
              <Input
                id="manual-refund-ref"
                value={refundRef}
                onChange={(e) => setRefundRef(e.target.value)}
                placeholder="VD: VNP-REF-20261117..."
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-refund-note">Ghi chú</Label>
              <Input
                id="manual-refund-note"
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                placeholder="Ghi chú chuyển khoản..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRefundTarget(null)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={Boolean(busyId)}>
                {busyId ? "Đang xử lý..." : "Xác nhận"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
