"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LEGAL_ENTITY_TYPE_LABELS,
  type Organization,
} from "@/features/organizations/contracts/organization";
import { organizationsApi } from "@/features/organizations/api";
import { organizationsHttpAdapter } from "@/features/organizations/api/organizations.http";
import { ORG_STATUS_LABELS } from "@/features/admin/lib/admin-labels";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export type OrganizationDialogState =
  | { kind: "REJECT"; org: Organization }
  | { kind: "SUSPEND"; org: Organization }
  | { kind: "BAN"; org: Organization }
  | { kind: "APPEAL"; org: Organization }
  | { kind: "APPROVE_UPGRADE"; org: Organization }
  | null;

export function OrganizationActionDialogs({
  dialog,
  onClose,
  onUpdated,
}: {
  dialog: OrganizationDialogState;
  onClose: () => void;
  onUpdated: (updated: Organization) => void;
}) {
  const [reason, setReason] = React.useState("");
  const [appealId, setAppealId] = React.useState("");
  const [safetyInterventionFlag, setSafetyInterventionFlag] =
    React.useState(false);

  const handleClose = React.useCallback(() => {
    setReason("");
    setAppealId("");
    setSafetyInterventionFlag(false);
    onClose();
  }, [onClose]);

  const actionMutation = useMutation({
    mutationFn: async (
      params:
        | { kind: "REJECT" | "SUSPEND" | "BAN" | "APPROVE_UPGRADE"; org: Organization }
        | { kind: "APPEAL"; org: Organization; approved: boolean }
    ) => {
      switch (params.kind) {
        case "REJECT":
          return {
            org: await organizationsApi.review(params.org.id, {
              status: "REJECTED",
              reason: reason.trim() || "Hồ sơ chưa đạt yêu cầu",
            }),
            message: `Đã cập nhật trạng thái ${params.org.name} → ${ORG_STATUS_LABELS.REJECTED}`,
          };
        case "SUSPEND":
          return {
            org: await organizationsApi.review(params.org.id, {
              status: "SUSPENDED",
              reason: reason.trim() || "Tạm ngưng bởi quản trị viên",
            }),
            message: `Đã cập nhật trạng thái ${params.org.name} → ${ORG_STATUS_LABELS.SUSPENDED}`,
          };
        case "BAN":
          return {
            org: await organizationsHttpAdapter.ban(params.org.id, {
              reason: reason.trim(),
              safetyInterventionFlag,
            }),
            message: `Đã cấm vĩnh viễn "${params.org.name}"`,
          };
        case "APPEAL":
          await organizationsHttpAdapter.resolveAppeal(
            params.org.id,
            appealId.trim(),
            params.approved
              ? {
                  approved: true,
                  reviewNote: reason.trim() || undefined,
                  targetStatus: "APPROVED",
                }
              : {
                  approved: false,
                  reviewNote: reason.trim() || undefined,
                }
          );
          return {
            org: params.approved ? { ...params.org, status: "APPROVED" as const } : null,
            message: params.approved
              ? "Đã chấp thuận kháng cáo và khôi phục trạng thái đã duyệt."
              : "Đã từ chối kháng cáo.",
          };
        case "APPROVE_UPGRADE":
          return {
            org: await organizationsHttpAdapter.approveUpgrade(params.org.id),
            message: `Đã phê duyệt nâng cấp loại hình pháp lý cho "${params.org.name}"`,
          };
      }
    },
    onSuccess: (result) => {
      if (result.org) {
        onUpdated(result.org);
      }
      toast.success(result.message);
      handleClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Thao tác thất bại");
    },
  });

  const busy = actionMutation.isPending;

  function handleReject() {
    if (!dialog || dialog.kind !== "REJECT") return;
    actionMutation.mutate({ kind: "REJECT", org: dialog.org });
  }

  function handleSuspend() {
    if (!dialog || dialog.kind !== "SUSPEND") return;
    actionMutation.mutate({ kind: "SUSPEND", org: dialog.org });
  }

  function handleBan() {
    if (!dialog || dialog.kind !== "BAN" || !reason.trim()) return;
    actionMutation.mutate({ kind: "BAN", org: dialog.org });
  }

  function handleResolveAppeal(approved: boolean) {
    if (!dialog || dialog.kind !== "APPEAL" || !appealId.trim()) return;
    actionMutation.mutate({ kind: "APPEAL", org: dialog.org, approved });
  }

  function handleApproveUpgrade() {
    if (!dialog || dialog.kind !== "APPROVE_UPGRADE") return;
    actionMutation.mutate({ kind: "APPROVE_UPGRADE", org: dialog.org });
  }

  return (
    <>
      <Dialog
        open={dialog?.kind === "REJECT"}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối hồ sơ: {dialog?.org.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="org-reject-reason">Lý do từ chối</Label>
              <Input
                id="org-reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Thiếu giấy phép kinh doanh hợp lệ"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={busy}>
                Hủy
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={handleReject}
              >
                {busy ? "Đang xử lý..." : "Xác nhận từ chối"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.kind === "SUSPEND"}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạm ngưng hoạt động: {dialog?.org.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Tổ chức sẽ bị tạm dừng nhận yêu cầu dịch vụ và đơn hàng mới cho đến
              khi được kích hoạt lại.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="org-suspend-reason">Lý do tạm ngưng</Label>
              <Input
                id="org-suspend-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Vi phạm thời gian phản hồi hoặc cần bổ sung hồ sơ"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={busy}>
                Hủy
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={handleSuspend}
              >
                {busy ? "Đang xử lý..." : "Xác nhận tạm ngưng"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.kind === "BAN"}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cấm vĩnh viễn: {dialog?.org.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="org-ban-reason">
                Lý do cấm vĩnh viễn (bắt buộc)
              </Label>
              <Input
                id="org-ban-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Gian lận hoặc vi phạm an toàn nghiêm trọng"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={safetyInterventionFlag}
                onChange={(e) => setSafetyInterventionFlag(e.target.checked)}
              />
              Gắn cờ can thiệp an toàn cho các đơn đặt lịch đang xử lý
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={busy}>
                Hủy
              </Button>
              <Button
                variant="destructive"
                disabled={!reason.trim() || busy}
                onClick={handleBan}
              >
                {busy ? "Đang xử lý..." : "Xác nhận cấm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.kind === "APPEAL"}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xử lý kháng cáo: {dialog?.org.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="org-appeal-id">Mã hồ sơ kháng cáo</Label>
              <Input
                id="org-appeal-id"
                value={appealId}
                onChange={(e) => setAppealId(e.target.value)}
                placeholder="Nhập mã hồ sơ kháng cáo"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-appeal-note">
                Ghi chú kết luận của quản trị viên
              </Label>
              <Input
                id="org-appeal-note"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ghi chú xác minh (kháng cáo bị cấm vĩnh viễn cần quản trị viên khác duyệt)"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={busy}>
                Đóng
              </Button>
              <Button
                variant="outline"
                disabled={!appealId.trim() || busy}
                onClick={() => handleResolveAppeal(false)}
              >
                Từ chối
              </Button>
              <Button
                disabled={!appealId.trim() || busy}
                onClick={() => handleResolveAppeal(true)}
              >
                {busy ? "Đang xử lý..." : "Chấp thuận"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.kind === "APPROVE_UPGRADE"}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Phê duyệt nâng cấp pháp nhân: {dialog?.org.name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Xác nhận nâng cấp loại hình pháp lý của tổ chức{" "}
              <strong className="text-foreground">{dialog?.org.name}</strong>{" "}
              sang{" "}
              <strong className="text-foreground">
                {dialog?.org.pendingLegalEntityUpgrade
                  ? (LEGAL_ENTITY_TYPE_LABELS[
                      dialog.org.pendingLegalEntityUpgrade
                    ] ?? dialog.org.pendingLegalEntityUpgrade)
                  : "loại hình mới"}
              </strong>
              ?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={busy}>
                Hủy
              </Button>
              <Button disabled={busy} onClick={handleApproveUpgrade}>
                {busy ? "Đang xử lý..." : "Phê duyệt nâng cấp"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
