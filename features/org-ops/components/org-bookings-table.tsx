"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, UserCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { OrgBookingItem, OrgTechnicianItem } from "../api/org-ops.adapter";
import {
  orgOpsHttpApi,
  type BookingDetailDto,
} from "../api/org-ops.http";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ContextInspector } from "@/shared/ui/context-inspector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { StatusBadge } from "@/shared/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { formatDateTime, formatShortId, formatVnd } from "@/shared/lib/utils";

const TERMINAL_BOOKING_STATUSES = new Set([
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
]);

export function OrgBookingsTable({
  organizationId,
  initialBookings,
}: {
  organizationId: string;
  initialBookings: OrgBookingItem[];
}) {
  const router = useRouter();
  const [bookings, setBookings] =
    React.useState<OrgBookingItem[]>(initialBookings);
  const [cancelTarget, setCancelTarget] = React.useState<OrgBookingItem | null>(
    null
  );
  const [reason, setReason] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const [assignTarget, setAssignTarget] =
    React.useState<OrgBookingItem | null>(null);
  const [technicians, setTechnicians] = React.useState<OrgTechnicianItem[]>([]);
  const [selectedTechId, setSelectedTechId] = React.useState("");
  const [assignReason, setAssignReason] = React.useState("");
  const [loadingTechs, setLoadingTechs] = React.useState(false);

  const [detailTarget, setDetailTarget] =
    React.useState<BookingDetailDto | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);

  async function openAssignDialog(b: OrgBookingItem) {
    setAssignTarget(b);
    setSelectedTechId("");
    setAssignReason("");
    setLoadingTechs(true);
    try {
      const list = await orgOpsHttpApi.listActiveTechnicians(organizationId);
      const filtered = list.filter(
        (t) => t.status === "ACTIVE" && t.id !== b.technicianId
      );
      setTechnicians(filtered);
      if (filtered.length > 0) setSelectedTechId(filtered[0].id);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách kỹ thuật viên"
      );
      setTechnicians([]);
    } finally {
      setLoadingTechs(false);
    }
  }

  async function handleAssignConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!assignTarget || !selectedTechId) return;
    setBusyId(assignTarget.id);
    try {
      const updated = await orgOpsHttpApi.assignTechnician(
        organizationId,
        assignTarget.id,
        { technicianId: selectedTechId, reason: assignReason },
        assignTarget.version
      );
      setBookings((prev) =>
        prev.map((b) =>
          b.id === assignTarget.id
            ? {
                ...b,
                status: updated.status,
                technicianId: updated.assignedTechnicianId ?? selectedTechId,
                technicianName: updated.assignedTechnicianName ?? b.technicianName,
                version: updated.version ?? b.version,
              }
            : b
        )
      );
      toast.success(
        assignTarget.status === "ASSIGNED"
          ? "Đã đổi kỹ thuật viên"
          : "Đã điều phối kỹ thuật viên"
      );
      setAssignTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể điều phối kỹ thuật viên"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function openDetail(b: OrgBookingItem) {
    setLoadingDetail(true);
    setDetailTarget({
      id: b.id,
      requesterProfileId: "",
      requesterName: b.customerName,
      serviceName: b.serviceName,
      assignedTechnicianName: b.technicianName,
      address: b.address ?? "",
      status: b.status,
      allocationStatus: "",
      quotedPrice: b.totalAmount,
      preferredStart: b.scheduledAt,
      createdAt: b.createdAt,
      workUpdates: [],
    });
    try {
      const detail = await orgOpsHttpApi.getBooking(organizationId, b.id);
      setDetailTarget(detail);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể tải chi tiết booking"
      );
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleCancelConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!cancelTarget) return;
    setBusyId(cancelTarget.id);
    try {
      const updated = await orgOpsHttpApi.cancelBooking(
        organizationId,
        cancelTarget.id,
        cancelTarget.version,
        reason
      );
      setBookings((prev) =>
        prev.map((b) =>
          b.id === cancelTarget.id
            ? { ...b, status: updated.status ?? "CANCELLED" }
            : b
        )
      );
      toast.success("Đã hủy lịch hẹn");
      setCancelTarget(null);
      setReason("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể hủy lịch hẹn");
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
              <TableHead>Mã</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Dịch vụ</TableHead>
              <TableHead>Kỹ thuật viên</TableHead>
              <TableHead>Lịch hẹn</TableHead>
              <TableHead>Tổng tiền</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((b) => {
              const canAssign =
                b.status === "REQUESTED" || b.status === "ASSIGNED";
              const canCancel = !TERMINAL_BOOKING_STATUSES.has(b.status);
              return (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs" title={b.id}>
                    #{formatShortId(b.id)}
                  </TableCell>
                  <TableCell className="font-medium">{b.customerName}</TableCell>
                  <TableCell>{b.serviceName}</TableCell>
                  <TableCell>{b.technicianName ?? "Chưa phân công"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <p>{formatDateTime(b.scheduledAt)}</p>
                    {b.createdAt ? (
                      <p className="text-[11px] opacity-75">
                        Tạo: {formatDateTime(b.createdAt)}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>{formatVnd(b.totalAmount)}</TableCell>
                  <TableCell>
                    <StatusBadge status={b.status} domain="booking" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDetail(b)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Chi tiết
                      </Button>
                      {canAssign ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === b.id}
                          onClick={() => openAssignDialog(b)}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          {b.status === "ASSIGNED" ? "Đổi thợ" : "Điều phối"}
                        </Button>
                      ) : null}
                      {canCancel ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyId === b.id}
                          onClick={() => {
                            setCancelTarget(b);
                            setReason("");
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Hủy
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={Boolean(assignTarget)}
        onOpenChange={(open) => {
          if (!open) setAssignTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {assignTarget?.status === "ASSIGNED"
                ? "Đổi kỹ thuật viên"
                : "Điều phối kỹ thuật viên"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignConfirm} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Lịch hẹn{" "}
              <strong className="text-foreground">
                {assignTarget?.serviceName}
              </strong>{" "}
              — Hiện tại:{" "}
              <strong className="text-foreground">
                {assignTarget?.technicianName ?? "Chưa phân công"}
              </strong>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="assign-tech-select">Chọn kỹ thuật viên</Label>
              {loadingTechs ? (
                <p className="text-xs text-muted-foreground">
                  Đang tải danh sách kỹ thuật viên...
                </p>
              ) : technicians.length === 0 ? (
                <p className="text-xs text-destructive">
                  Không có kỹ thuật viên khả dụng khác.
                </p>
              ) : (
                <select
                  id="assign-tech-select"
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm"
                  required
                >
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.specialty})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-reason">Lý do điều phối</Label>
              <Input
                id="assign-reason"
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                placeholder="VD: Thợ cũ bận đột xuất..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssignTarget(null)}
              >
                Đóng
              </Button>
              <Button
                type="submit"
                disabled={Boolean(busyId) || !selectedTechId}
              >
                {busyId ? "Đang xử lý..." : "Xác nhận"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ContextInspector
        open={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        title={`Chi tiết lịch hẹn #${formatShortId(detailTarget?.id ?? "")}`}
        subtitle={detailTarget?.serviceName}
        className="max-w-lg"
      >
        {detailTarget ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="text-xs text-muted-foreground">Khách hàng</span>
                <p className="font-medium">
                  {detailTarget.requesterName ||
                    detailTarget.requesterProfileId}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  Kỹ thuật viên
                </span>
                <p className="font-medium">
                  {detailTarget.assignedTechnicianName ?? "Chưa phân công"}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Địa chỉ</span>
                <p className="font-medium">{detailTarget.address || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Báo giá</span>
                <p className="font-medium">
                  {formatVnd(detailTarget.quotedPrice)}
                </p>
              </div>
              {detailTarget.preferredStart ? (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Lịch hẹn mong muốn
                  </span>
                  <p className="font-medium">
                    {formatDateTime(detailTarget.preferredStart)}
                  </p>
                </div>
              ) : null}
              {detailTarget.createdAt ? (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Ngày tạo
                  </span>
                  <p className="font-medium">
                    {formatDateTime(detailTarget.createdAt)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">
                Tiến độ & minh chứng công việc
              </h3>
              {loadingDetail ? (
                <p className="text-xs text-muted-foreground">
                  Đang tải tiến độ...
                </p>
              ) : (detailTarget.workUpdates?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Chưa có cập nhật công việc nào.
                </p>
              ) : (
                <div className="space-y-2">
                  {detailTarget.workUpdates?.map((wu) => (
                    <div
                      key={wu.id}
                      className="rounded-lg border border-border p-3 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{wu.kind}</Badge>
                          {wu.extraCost && wu.extraCost > 0 ? (
                            <Badge variant="warning">
                              Phát sinh: {formatVnd(wu.extraCost)} (
                              {wu.extraCostStatus ?? "PENDING"})
                            </Badge>
                          ) : null}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(wu.createdAt)}
                        </span>
                      </div>
                      {wu.note ? (
                        <p className="text-xs text-muted-foreground">
                          {wu.note}
                        </p>
                      ) : null}
                      {wu.evidence && wu.evidence.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {wu.evidence.map((ev) =>
                            ev.signedUrl ? (
                              <a
                                key={ev.id}
                                href={ev.signedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block rounded border border-border overflow-hidden hover:opacity-85"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={ev.signedUrl}
                                  alt="Minh chứng công việc"
                                  className="h-16 w-16 object-cover"
                                />
                              </a>
                            ) : null
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </ContextInspector>

      <Dialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận hủy lịch hẹn</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCancelConfirm} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Hủy lịch hẹn{" "}
              <span className="font-medium text-foreground">
                {cancelTarget?.serviceName}
              </span>{" "}
              của{" "}
              <span className="font-medium text-foreground">
                {cancelTarget?.customerName}
              </span>
              .
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="booking-cancel-reason">Lý do hủy</Label>
              <Input
                id="booking-cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Khách đổi lịch / thiếu nhân sự..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancelTarget(null)}
              >
                Đóng
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={Boolean(busyId)}
              >
                {busyId ? "Đang xử lý..." : "Xác nhận hủy"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
