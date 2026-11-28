"use client";

import * as React from "react";
import {
  AlertTriangle,
  BellOff,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquareText,
  RefreshCw,
  Scale,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  disputesHttpApi,
  type AdminNotificationFailedBooking,
  type AdminNotificationFailedBookingDetail,
  type DisputeItem,
} from "../api/disputes.http";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { FormDrawer, FormField, FormSection } from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
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
import { formatDate, formatShortId } from "@/shared/lib/utils";

const TERMINAL_STATUSES = new Set(["RESOLVED", "ESCALATED", "CLOSED"]);

export function AdminDisputesPanel({
  initialDisputes,
  initialNotificationFailed = [],
  initialError = null,
}: {
  initialDisputes: DisputeItem[];
  initialNotificationFailed?: AdminNotificationFailedBooking[];
  initialError?: string | null;
}) {
  const [activeTab, setActiveTab] = React.useState<"DISPUTES" | "NOTIFICATION_FAILED">("DISPUTES");
  const [disputes, setDisputes] = React.useState<DisputeItem[]>(initialDisputes);
  const [failedBookings, setFailedBookings] =
    React.useState<AdminNotificationFailedBooking[]>(initialNotificationFailed);
  const [failedDetail, setFailedDetail] =
    React.useState<AdminNotificationFailedBookingDetail | null>(null);
  const [retryNote, setRetryNote] = React.useState("");
  const [retryingBookingId, setRetryingBookingId] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(initialError);
  const [reloading, setReloading] = React.useState(false);

  const [resolveTarget, setResolveTarget] = React.useState<DisputeItem | null>(null);
  const [proposeTarget, setProposeTarget] = React.useState<DisputeItem | null>(null);
  const [proposalText, setProposalText] = React.useState("");
  const [proposalOutcome, setProposalOutcome] = React.useState("MUTUAL_REWORK");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [outcome, setOutcome] = React.useState<"RESOLVED" | "ESCALATED" | "CLOSED">("RESOLVED");
  const [bookingAction, setBookingAction] = React.useState<"" | "ACCEPT" | "REWORK" | "CLOSE_UNRESOLVED">("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const visibleDisputes = React.useMemo(
    () =>
      statusFilter === "ALL"
        ? disputes
        : disputes.filter((d) => d.status === statusFilter),
    [disputes, statusFilter]
  );

  async function handleProposeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!proposeTarget) return;
    if (!proposalText.trim()) {
      toast.error("Vui lòng nhập nội dung đề xuất xử lý.");
      return;
    }
    setSaving(true);
    try {
      const updated = await disputesHttpApi.adminProposeResolution(
        proposeTarget.id,
        { proposal: proposalText.trim(), outcome: proposalOutcome },
        proposeTarget.version
      );
      setDisputes((prev) =>
        prev.map((item) => (item.id === proposeTarget.id ? updated : item))
      );
      toast.success("Đã gửi đề xuất xử lý tranh chấp (SLA 7 ngày)");
      setProposeTarget(null);
      setProposalText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể gửi đề xuất");
    } finally {
      setSaving(false);
    }
  }

  async function handleReload() {
    setReloading(true);
    setLoadError(null);
    try {
      const [nextDisputes, nextFailed] = await Promise.all([
        disputesHttpApi.adminListDisputes(),
        disputesHttpApi.adminListNotificationFailedBookings(),
      ]);
      setDisputes(nextDisputes);
      setFailedBookings(nextFailed);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
    } finally {
      setReloading(false);
    }
  }

  async function handleOpenFailedDetail(bookingId: string) {
    try {
      const detail = await disputesHttpApi.adminGetNotificationFailedBooking(bookingId);
      setFailedDetail(detail);
      setRetryNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tải chi tiết booking lỗi.");
    }
  }

  async function handleRetryNotification(
    bookingId: string,
    version?: number,
    customNote?: string
  ) {
    setRetryingBookingId(bookingId);
    try {
      const updated = await disputesHttpApi.adminRetryCompletionNotification(
        bookingId,
        version,
        customNote
      );
      setFailedBookings((prev) =>
        prev.map((item) =>
          item.bookingId === bookingId
            ? {
                ...item,
                notificationRetryCount: updated.notificationRetryCount,
                lastNotificationRetryAt: updated.lastNotificationRetryAt,
                version: updated.version,
              }
            : item
        )
      );
      if (failedDetail?.bookingId === bookingId) {
        setFailedDetail(updated);
      }
      setRetryNote("");
      toast.success("Đã phát lại thông báo nghiệm thu; cảnh báo sẽ đóng khi xác nhận gửi thành công.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gửi lại thông báo thất bại.");
    } finally {
      setRetryingBookingId(null);
    }
  }

  async function handleRequestProvider(d: DisputeItem) {
    try {
      const updated = await disputesHttpApi.adminRequestProviderResponse(d.id, d.version);
      setDisputes((prev) => prev.map((item) => (item.id === d.id ? updated : item)));
      toast.success("Đã gửi yêu cầu phản hồi tới đối tác (SLA 48 giờ)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thao tác thất bại");
    }
  }

  async function handleRequestCustomer(d: DisputeItem) {
    try {
      const updated = await disputesHttpApi.adminRequestCustomerEvidence(d.id, d.version);
      setDisputes((prev) => prev.map((item) => (item.id === d.id ? updated : item)));
      toast.success("Đã yêu cầu khách hàng bổ sung bằng chứng (SLA 7 ngày)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thao tác thất bại");
    }
  }

  async function handleResolveSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resolveTarget) return;
    if (!note.trim()) {
      toast.error("Vui lòng nhập ghi chú kết luận xử lý (bắt buộc cho kiểm toán)");
      return;
    }
    setSaving(true);
    try {
      const updated = await disputesHttpApi.adminResolveDispute(
        resolveTarget.id,
        {
          outcome,
          bookingAction: bookingAction || undefined,
          note: note.trim(),
        },
        resolveTarget.version
      );
      setDisputes((prev) => prev.map((item) => (item.id === resolveTarget.id ? updated : item)));
      toast.success("Đã cập nhật kết quả xử lý tranh chấp");
      setResolveTarget(null);
      setNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể đóng tranh chấp");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {loadError ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-destructive/40 bg-destructive/5 p-4 text-sm">
          <span className="text-destructive">{loadError}</span>
          <Button type="button" size="sm" variant="outline" disabled={reloading} onClick={handleReload}>
            <RefreshCw className="h-3.5 w-3.5" />
            {reloading ? "Đang tải..." : "Tải lại"}
          </Button>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "DISPUTES" ? "default" : "outline"}
            onClick={() => setActiveTab("DISPUTES")}
          >
            <Scale className="h-3.5 w-3.5" />
            Tranh chấp ({disputes.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTab === "NOTIFICATION_FAILED" ? "default" : "outline"}
            onClick={() => setActiveTab("NOTIFICATION_FAILED")}
          >
            <BellOff className="h-3.5 w-3.5" />
            Notification Failed ({failedBookings.length})
          </Button>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={reloading}
          onClick={handleReload}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {reloading ? "Đang tải..." : "Làm mới"}
        </Button>
      </div>

      {activeTab === "NOTIFICATION_FAILED" ? (
        failedBookings.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title="Không có đơn lỗi gửi thông báo"
            description="Các lịch hẹn chờ nghiệm thu quá 24h chưa xác nhận gửi thông báo (D-27) sẽ hiển thị tại đây để Admin kiểm tra và thử gửi lại."
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking / Provider</TableHead>
                    <TableHead>Dịch vụ &amp; Lý do</TableHead>
                    <TableHead>Mốc gửi / Báo lỗi</TableHead>
                    <TableHead>Retry</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failedBookings.map((fb) => (
                    <TableRow key={fb.bookingId}>
                      <TableCell className="font-mono text-xs tabular-nums">
                        <p>BK #{formatShortId(fb.bookingId)}</p>
                        <p className="text-muted-foreground">PRV #{formatShortId(fb.providerId)}</p>
                      </TableCell>
                      <TableCell className="max-w-sm text-xs">
                        <p className="font-medium">{fb.serviceName}</p>
                        <p className="text-muted-foreground">{fb.adminReviewReason || "Chưa xác nhận gửi sau 24h"}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        <p>Hoàn thành: {fb.completionSubmittedAt ? formatDate(fb.completionSubmittedAt) : "—"}</p>
                        <p>Báo lỗi: {fb.notificationFailedAt ? formatDate(fb.notificationFailedAt) : "—"}</p>
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">
                        <p>{fb.notificationRetryCount} lần</p>
                        {fb.lastNotificationRetryAt ? (
                          <p className="text-muted-foreground">{formatDate(fb.lastNotificationRetryAt)}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status="NOTIFICATION_FAILED" />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleOpenFailedDetail(fb.bookingId)}
                          >
                            Chi tiết
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={retryingBookingId === fb.bookingId}
                            onClick={() => void handleRetryNotification(fb.bookingId, fb.version)}
                          >
                            <Send className="h-3.5 w-3.5" />
                            Retry Notification
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { code: "ALL", label: "Tất cả" },
              { code: "SUBMITTED", label: "Mới gửi" },
              { code: "AWAITING_PROVIDER_RESPONSE", label: "Chờ đối tác" },
              { code: "UNDER_REVIEW", label: "Đang xem xét" },
              { code: "RESOLUTION_PROPOSED", label: "Đã đề xuất" },
            ].map((tab) => (
              <Button
                key={tab.code}
                type="button"
                size="sm"
                variant={statusFilter === tab.code ? "secondary" : "outline"}
                onClick={() => setStatusFilter(tab.code)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

      {visibleDisputes.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Chưa có tranh chấp nào"
          description="Khi khách hàng mở tranh chấp trước hoặc sau nghiệm thu, hồ sơ kèm bằng chứng và mốc SLA sẽ hiển thị tại đây."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã TC / Booking</TableHead>
                  <TableHead>Giai đoạn / Danh mục</TableHead>
                  <TableHead>Nội dung &amp; Bằng chứng</TableHead>
                  <TableHead>Hạn SLA</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleDisputes.map((d) => {
                  const isClosed = TERMINAL_STATUSES.has(d.status);
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs tabular-nums">
                        <p>#{formatShortId(d.id)}</p>
                        <p className="text-muted-foreground">BK #{formatShortId(d.bookingId)}</p>
                      </TableCell>
                      <TableCell className="text-xs">
                        <p className="font-medium">{d.category}</p>
                        <p className="text-muted-foreground">
                          {d.openedStage === "PRE_ACCEPTANCE" ? "Trước nghiệm thu" : "Sau nghiệm thu"}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-md text-xs">
                        <p className="line-clamp-2 font-medium">{d.description}</p>
                        {d.providerResponse ? (
                          <p className="mt-1 line-clamp-1 text-muted-foreground">
                            Đối tác: {d.providerResponse}
                          </p>
                        ) : d.providerNoResponse ? (
                          <p className="mt-1 font-medium text-warning">
                            Đối tác không phản hồi trong 48h
                          </p>
                        ) : null}
                        {d.resolutionProposal ? (
                          <p className="mt-1 line-clamp-1 text-muted-foreground">
                            Đề xuất: {d.resolutionProposal}
                          </p>
                        ) : null}
                        {d.evidence?.length ? (
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {d.evidence.map((ev, idx) =>
                              ev.signedUrl ? (
                                <a
                                  key={ev.id}
                                  href={ev.signedUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                                >
                                  Bằng chứng {idx + 1} ({ev.uploaderRole})
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : null
                            )}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {d.slaDueAt ? formatDate(d.slaDueAt) : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={d.status} />
                      </TableCell>
                      <TableCell className="w-[1%] whitespace-nowrap text-right">
                        {isClosed ? (
                          <span className="text-xs text-muted-foreground">Đã đóng</span>
                        ) : (
                          <RowActionsMenu
                            ariaLabel={`Thao tác tranh chấp #${formatShortId(d.id)}`}
                            groups={[
                              {
                                id: "sla",
                                items: [
                                  {
                                    id: "req-provider",
                                    label: "Yêu cầu đối tác phản hồi (48h)",
                                    icon: Clock,
                                    onSelect: () => handleRequestProvider(d),
                                  },
                                  {
                                    id: "req-customer",
                                    label: "Yêu cầu khách bổ sung bằng chứng (7d)",
                                    icon: AlertTriangle,
                                    onSelect: () => handleRequestCustomer(d),
                                  },
                                  {
                                    id: "propose",
                                    label: "Đề xuất hướng xử lý (7d)",
                                    icon: MessageSquareText,
                                    onSelect: () => {
                                      setProposeTarget(d);
                                      setProposalText(d.resolutionProposal ?? "");
                                      setProposalOutcome(d.resolutionOutcome ?? "MUTUAL_REWORK");
                                    },
                                  },
                                ],
                              },
                              {
                                id: "resolve",
                                items: [
                                  {
                                    id: "resolve",
                                    label: "Kết luận / Đóng tranh chấp",
                                    icon: CheckCircle2,
                                    onSelect: () => {
                                      setResolveTarget(d);
                                      setOutcome("RESOLVED");
                                      setBookingAction("");
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
          </div>
        </Card>
      )}
        </>
      )}

      <FormDrawer
        open={Boolean(failedDetail)}
        onClose={() => setFailedDetail(null)}
        title={`Chi tiết lỗi thông báo BK #${formatShortId(failedDetail?.bookingId ?? "")}`}
        description="Bộ đếm tự động nghiệm thu 7 ngày đang tạm dừng theo D-27. Chỉ giải trừ cảnh báo sau khi xác nhận gửi thành công."
        isDirty={Boolean(retryNote.trim())}
        saving={retryingBookingId === failedDetail?.bookingId}
        submitLabel="Thử gửi lại thông báo"
        onSubmit={(e) => {
          e.preventDefault();
          if (!failedDetail) return;
          void handleRetryNotification(failedDetail.bookingId, failedDetail.version, retryNote);
        }}
      >
        {failedDetail ? (
          <FormSection title="Thông tin nghiệm thu & Lỗi thông báo">
            <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-xs">
              <p><span className="font-medium">Dịch vụ:</span> {failedDetail.serviceName}</p>
              <p><span className="font-medium">Khách hàng:</span> {failedDetail.requesterProfileId}</p>
              <p><span className="font-medium">Tóm tắt nghiệm thu:</span> {failedDetail.completionSummary || "—"}</p>
              <p><span className="font-medium">Bằng chứng công việc:</span> {failedDetail.workEvidenceCount} tệp</p>
              <p><span className="font-medium">Số lần gửi lại:</span> {failedDetail.notificationRetryCount}</p>
              <p><span className="font-medium">Lý do lỗi:</span> {failedDetail.adminReviewReason || "—"}</p>
            </div>
            <FormField label="Ghi chú gửi lại (tùy chọn)" htmlFor="notif-retry-note">
              <Input
                id="notif-retry-note"
                value={retryNote}
                onChange={(e) => setRetryNote(e.target.value)}
                placeholder="VD: Đã kiểm tra FCM token, phát lại thông báo"
              />
            </FormField>
          </FormSection>
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={Boolean(proposeTarget)}
        onClose={() => setProposeTarget(null)}
        title={`Đề xuất xử lý #${formatShortId(proposeTarget?.id ?? "")}`}
        description="Gửi phương án đề xuất để các bên phản hồi trong 7 ngày lịch."
        isDirty={Boolean(proposalText.trim())}
        saving={saving}
        submitLabel="Gửi đề xuất"
        onSubmit={handleProposeSubmit}
      >
        <FormSection title="Phương án đề xuất">
          <FormField label="Hướng xử lý đề xuất" htmlFor="disp-proposal-outcome" required>
            <NativeSelect
              id="disp-proposal-outcome"
              value={proposalOutcome}
              onChange={(e) => setProposalOutcome(e.target.value)}
            >
              <NativeSelectOption value="MUTUAL_REWORK">Sửa lại / khắc phục (MUTUAL_REWORK)</NativeSelectOption>
              <NativeSelectOption value="PARTIAL_AGREEMENT">Thỏa thuận điều chỉnh (PARTIAL_AGREEMENT)</NativeSelectOption>
              <NativeSelectOption value="ACCEPT_AS_IS">Chấp nhận nghiệm thu (ACCEPT_AS_IS)</NativeSelectOption>
              <NativeSelectOption value="ESCALATE">Chuyển xử lý ngoài nền tảng (ESCALATE)</NativeSelectOption>
            </NativeSelect>
          </FormField>
          <FormField label="Nội dung đề xuất" htmlFor="disp-proposal" required>
            <Input
              id="disp-proposal"
              value={proposalText}
              onChange={(e) => setProposalText(e.target.value)}
              placeholder="VD: Đối tác quay lại khắc phục trong 48h không phát sinh phí"
            />
          </FormField>
        </FormSection>
      </FormDrawer>

      <FormDrawer
        open={Boolean(resolveTarget)}
        onClose={() => setResolveTarget(null)}
        title={`Kết luận tranh chấp #${formatShortId(resolveTarget?.id ?? "")}`}
        description="Quyết định nội bộ nền tảng không thay thế phán quyết pháp lý (D-07.3). Mọi bằng chứng được bảo toàn."
        isDirty={Boolean(note.trim())}
        saving={saving}
        submitLabel="Lưu kết luận"
        onSubmit={handleResolveSubmit}
      >
        <FormSection title="Trạng thái kết thúc & Tác động Booking">
          <FormField label="Kết quả tranh chấp" htmlFor="disp-outcome" required>
            <NativeSelect
              id="disp-outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as "RESOLVED" | "ESCALATED" | "CLOSED")}
            >
              <NativeSelectOption value="RESOLVED">RESOLVED (Đã giải quyết)</NativeSelectOption>
              <NativeSelectOption value="ESCALATED">ESCALATED (Chuyển xử lý ngoài nền tảng)</NativeSelectOption>
              <NativeSelectOption value="CLOSED">CLOSED (Đóng hồ sơ)</NativeSelectOption>
            </NativeSelect>
          </FormField>

          {resolveTarget?.openedStage === "PRE_ACCEPTANCE" ? (
            <FormField label="Hành động trên Booking (trước nghiệm thu)" htmlFor="disp-bk-action">
              <NativeSelect
                id="disp-bk-action"
                value={bookingAction}
                onChange={(e) =>
                  setBookingAction(e.target.value as "" | "ACCEPT" | "REWORK" | "CLOSE_UNRESOLVED")
                }
              >
                <NativeSelectOption value="">Giữ mặc định theo outcome</NativeSelectOption>
                <NativeSelectOption value="REWORK">Đồng thuận sửa lại (DISPUTED → IN_PROGRESS)</NativeSelectOption>
                <NativeSelectOption value="ACCEPT">Chốt nghiệm thu (DISPUTED → ACCEPTED)</NativeSelectOption>
                <NativeSelectOption value="CLOSE_UNRESOLVED">Đóng chưa giải quyết (CLOSED_UNRESOLVED)</NativeSelectOption>
              </NativeSelect>
            </FormField>
          ) : null}

          <FormField label="Ghi chú kiểm toán / Lý do" htmlFor="disp-note" required>
            <Input
              id="disp-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Đã đối chiếu ảnh hiện trường và thống nhất lịch khắc phục"
            />
          </FormField>
        </FormSection>
      </FormDrawer>
    </div>
  );
}
