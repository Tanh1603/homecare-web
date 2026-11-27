"use client";

import * as React from "react";
import { Check, Clock, Inbox, X } from "lucide-react";
import { toast } from "sonner";
import {
  orgOpsHttpApi,
  ScheduleConflictError,
  type ScheduleChangeRequestItem,
  type ScheduleChangeRequestType,
  type ScheduleConflictItem,
} from "../api/org-ops.http";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatDateTime } from "@/shared/lib/utils";

const TYPE_LABELS: Record<ScheduleChangeRequestType, string> = {
  LEAVE: "Xin nghỉ phép",
  SHIFT_CHANGE: "Đổi giờ ca trực",
  EXTRA_HOURS: "Đăng ký thêm giờ",
};

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "default" | "success" | "destructive" | "secondary" }
> = {
  PENDING: { label: "Chờ duyệt", variant: "default" },
  APPROVED: { label: "Đã duyệt", variant: "success" },
  REJECTED: { label: "Từ chối", variant: "destructive" },
  CANCELLED: { label: "KTV đã hủy", variant: "secondary" },
};

export function OrgScheduleRequestsPanel({
  organizationId,
  canManage,
  onReviewed,
  onPendingCountChange,
}: {
  organizationId: string;
  canManage: boolean;
  onReviewed: () => Promise<void> | void;
  onPendingCountChange?: (count: number) => void;
}) {
  const [statusFilter, setStatusFilter] = React.useState("PENDING");
  const [items, setItems] = React.useState<ScheduleChangeRequestItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [reloadToken, setReloadToken] = React.useState(0);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [noteById, setNoteById] = React.useState<Record<string, string>>({});
  const [conflicts, setConflicts] = React.useState<ScheduleConflictItem[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const list = await orgOpsHttpApi.listOrganizationScheduleRequests(
          organizationId,
          statusFilter
        );
        if (!cancelled) {
          setItems(list);
          if (statusFilter === "PENDING" || statusFilter === "ALL") {
            const pendingCount = list.filter((r) => r.status === "PENDING").length;
            onPendingCountChange?.(pendingCount);
          }
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error
              ? err.message
              : "Không thể tải danh sách yêu cầu điều chỉnh lịch"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [organizationId, statusFilter, reloadToken, onPendingCountChange]);

  async function handleReview(req: ScheduleChangeRequestItem, approve: boolean) {
    const note = (noteById[req.id] ?? "").trim();
    if (!approve && !note) {
      toast.error("Vui lòng nhập lý do từ chối trước khi xác nhận.");
      return;
    }
    setConflicts([]);
    setBusyId(req.id);
    try {
      await orgOpsHttpApi.reviewOrganizationScheduleRequest(
        organizationId,
        req.id,
        { approve, reviewNote: note || undefined }
      );
      toast.success(
        approve
          ? "Đã duyệt yêu cầu và tự động áp dụng vào lịch làm việc."
          : "Đã từ chối yêu cầu và thông báo cho kỹ thuật viên."
      );
      setReloadToken((n) => n + 1);
      await onReviewed();
    } catch (err) {
      if (err instanceof ScheduleConflictError) {
        setConflicts(err.conflicts);
        toast.error(err.message);
      } else {
        toast.error(
          err instanceof Error ? err.message : "Không thể xử lý yêu cầu"
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Yêu cầu nghỉ phép &amp; đổi ca từ Kỹ thuật viên
          </h3>
          <p className="text-xs text-muted-foreground">
            Khi duyệt, hệ thống tự động tạo ngoại lệ lịch làm việc và kiểm tra xung đột booking.
          </p>
        </div>
        <div className="w-48">
          <NativeSelect
            aria-label="Lọc trạng thái yêu cầu"
            value={statusFilter}
            onChange={(e) => {
              setLoading(true);
              setStatusFilter(e.target.value);
            }}
          >
            <NativeSelectOption value="PENDING">Đang chờ duyệt</NativeSelectOption>
            <NativeSelectOption value="ALL">Tất cả</NativeSelectOption>
            <NativeSelectOption value="APPROVED">Đã duyệt</NativeSelectOption>
            <NativeSelectOption value="REJECTED">Đã từ chối</NativeSelectOption>
            <NativeSelectOption value="CANCELLED">KTV đã hủy</NativeSelectOption>
          </NativeSelect>
        </div>
      </div>

      {conflicts.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle className="text-xs font-semibold">
            Không thể duyệt vì xung đột {conflicts.length} booking đã phân bổ
          </AlertTitle>
          <AlertDescription className="mt-1 text-xs space-y-1">
            <p>Vui lòng điều phối lại các booking sau trước khi duyệt nghỉ/đổi ca:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {conflicts.map((c) => (
                <li key={c.windowId}>
                  {formatDateTime(c.startsAt)} → {formatDateTime(c.endsAt)}
                  {c.bookingId ? ` (Booking #${c.bookingId.slice(0, 8)})` : ""}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center space-y-2">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Không có yêu cầu nào trong mục này
          </p>
          <p className="text-xs text-muted-foreground">
            Các yêu cầu xin nghỉ hoặc đổi ca từ ứng dụng KTV sẽ xuất hiện tại đây.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((req) => {
            const badge = STATUS_BADGE[req.status] ?? {
              label: req.status,
              variant: "secondary" as const,
            };
            const isPending = req.status === "PENDING";
            const busy = busyId === req.id;
            return (
              <Card key={req.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {req.technicianName || req.technicianId.slice(0, 8)}
                      </span>
                      <Badge variant="outline">
                        {TYPE_LABELS[req.requestType] ?? req.requestType}
                      </Badge>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground tabular-nums">
                      <span>
                        Ngày: <strong>{req.fromDate}</strong>
                        {req.toDate !== req.fromDate ? ` → ${req.toDate}` : ""}
                      </span>
                      {req.requestedStartTime && req.requestedEndTime ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {req.requestedStartTime.slice(0, 5)} –{" "}
                          {req.requestedEndTime.slice(0, 5)}
                        </span>
                      ) : (
                        <span>Cả ngày</span>
                      )}
                      <span>Gửi lúc {formatDateTime(req.createdAt)}</span>
                    </div>
                    {req.reason ? (
                      <p className="text-xs text-foreground">
                        Lý do KTV: {req.reason}
                      </p>
                    ) : null}
                    {req.reviewNote ? (
                      <p className="text-xs text-muted-foreground">
                        Phản hồi quản lý: {req.reviewNote}
                      </p>
                    ) : null}
                  </div>
                </div>

                {isPending && canManage ? (
                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <Input
                      value={noteById[req.id] ?? ""}
                      onChange={(e) =>
                        setNoteById((prev) => ({
                          ...prev,
                          [req.id]: e.target.value,
                        }))
                      }
                      placeholder="Ghi chú duyệt hoặc lý do từ chối (bắt buộc khi từ chối)..."
                      className="h-8 flex-1 min-w-55 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => void handleReview(req, true)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Duyệt &amp; áp dụng
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void handleReview(req, false)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                      Từ chối
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
