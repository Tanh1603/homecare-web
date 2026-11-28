"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useUiStore } from "@/shared/store/ui-store";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { EmptyState } from "@/shared/ui/empty-state";
import { FormDrawer, FormField, FormSection } from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { RowActionsMenu } from "@/shared/ui/row-actions-menu";
import { StatusBadge } from "@/shared/ui/status-badge";
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
  const queryClient = useQueryClient();
  const activeTab = useUiStore((s) => s.adminDisputesActiveTab);
  const setActiveTab = useUiStore((s) => s.setAdminDisputesActiveTab);

  const [failedDetail, setFailedDetail] =
    React.useState<AdminNotificationFailedBookingDetail | null>(null);
  const [retryNote, setRetryNote] = React.useState("");

  const [resolveTarget, setResolveTarget] = React.useState<DisputeItem | null>(null);
  const [proposeTarget, setProposeTarget] = React.useState<DisputeItem | null>(null);
  const [proposalText, setProposalText] = React.useState("");
  const [proposalOutcome, setProposalOutcome] = React.useState("MUTUAL_REWORK");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [outcome, setOutcome] = React.useState<"RESOLVED" | "ESCALATED" | "CLOSED">("RESOLVED");
  const [bookingAction, setBookingAction] = React.useState<
    "" | "ACCEPT" | "REWORK" | "CLOSE_UNRESOLVED"
  >("");
  const [note, setNote] = React.useState("");

  const disputesQuery = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: () => disputesHttpApi.adminListDisputes(),
    initialData: initialError ? undefined : initialDisputes,
    staleTime: 30_000,
  });

  const failedBookingsQuery = useQuery({
    queryKey: ["admin-notification-failed"],
    queryFn: () => disputesHttpApi.adminListNotificationFailedBookings(),
    initialData: initialNotificationFailed,
    staleTime: 30_000,
  });

  const disputes = disputesQuery.data ?? initialDisputes;
  const failedBookings = failedBookingsQuery.data ?? initialNotificationFailed;
  const reloading = disputesQuery.isFetching || failedBookingsQuery.isFetching;
  const loadError =
    disputesQuery.error instanceof Error
      ? disputesQuery.error.message
      : failedBookingsQuery.error instanceof Error
        ? failedBookingsQuery.error.message
        : initialError;

  const visibleDisputes = React.useMemo(
    () =>
      statusFilter === "ALL"
        ? disputes
        : disputes.filter((d) => d.status === statusFilter),
    [disputes, statusFilter]
  );

  function updateDisputeInCache(updated: DisputeItem) {
    queryClient.setQueryData<DisputeItem[]>(["admin-disputes"], (prev) =>
      (prev ?? initialDisputes).map((item) => (item.id === updated.id ? updated : item))
    );
    void queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
  }

  const proposeMutation = useMutation({
    mutationFn: (payload: {
      disputeId: string;
      proposal: string;
      outcome: string;
      version?: number;
    }) =>
      disputesHttpApi.adminProposeResolution(
        payload.disputeId,
        { proposal: payload.proposal, outcome: payload.outcome },
        payload.version
      ),
    onSuccess: (updated) => {
      updateDisputeInCache(updated);
      toast.success("Đã gửi đề xuất xử lý tranh chấp (SLA 7 ngày)");
      setProposeTarget(null);
      setProposalText("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể gửi đề xuất");
    },
  });

  const requestProviderMutation = useMutation({
    mutationFn: (d: DisputeItem) =>
      disputesHttpApi.adminRequestProviderResponse(d.id, d.version),
    onSuccess: (updated) => {
      updateDisputeInCache(updated);
      toast.success("Đã gửi yêu cầu phản hồi tới đối tác (SLA 48 giờ)");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Thao tác thất bại");
    },
  });

  const requestCustomerMutation = useMutation({
    mutationFn: (d: DisputeItem) =>
      disputesHttpApi.adminRequestCustomerEvidence(d.id, d.version),
    onSuccess: (updated) => {
      updateDisputeInCache(updated);
      toast.success("Đã yêu cầu khách hàng bổ sung bằng chứng (SLA 7 ngày)");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Thao tác thất bại");
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (payload: {
      disputeId: string;
      outcome: "RESOLVED" | "ESCALATED" | "CLOSED";
      bookingAction?: "ACCEPT" | "REWORK" | "CLOSE_UNRESOLVED";
      note: string;
      version?: number;
    }) =>
      disputesHttpApi.adminResolveDispute(
        payload.disputeId,
        {
          outcome: payload.outcome,
          bookingAction: payload.bookingAction,
          note: payload.note,
        },
        payload.version
      ),
    onSuccess: (updated) => {
      updateDisputeInCache(updated);
      toast.success("Đã cập nhật kết quả xử lý tranh chấp");
      setResolveTarget(null);
      setNote("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể đóng tranh chấp");
    },
  });

  const detailMutation = useMutation({
    mutationFn: (bookingId: string) =>
      disputesHttpApi.adminGetNotificationFailedBooking(bookingId),
    onSuccess: (detail) => {
      setFailedDetail(detail);
      setRetryNote("");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể tải chi tiết booking lỗi."
      );
    },
  });

  const retryMutation = useMutation({
    mutationFn: (payload: { bookingId: string; version?: number; note?: string }) =>
      disputesHttpApi.adminRetryCompletionNotification(
        payload.bookingId,
        payload.version,
        payload.note
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData<AdminNotificationFailedBooking[]>(
        ["admin-notification-failed"],
        (prev) =>
          (prev ?? initialNotificationFailed).map((item) =>
            item.bookingId === updated.bookingId
              ? {
                  ...item,
                  notificationRetryCount: updated.notificationRetryCount,
                  lastNotificationRetryAt: updated.lastNotificationRetryAt,
                  version: updated.version,
                }
              : item
          )
      );
      void queryClient.invalidateQueries({ queryKey: ["admin-notification-failed"] });
      if (failedDetail?.bookingId === updated.bookingId) {
        setFailedDetail(updated);
      }
      setRetryNote("");
      toast.success(
        "Đã phát lại thông báo nghiệm thu; cảnh báo sẽ đóng khi xác nhận gửi thành công."
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Gửi lại thông báo thất bại.");
    },
  });

  async function handleReload() {
    await Promise.all([disputesQuery.refetch(), failedBookingsQuery.refetch()]);
  }

  function handleProposeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!proposeTarget) return;
    if (!proposalText.trim()) {
      toast.error("Vui lòng nhập nội dung đề xuất xử lý.");
      return;
    }
    proposeMutation.mutate({
      disputeId: proposeTarget.id,
      proposal: proposalText.trim(),
      outcome: proposalOutcome,
      version: proposeTarget.version,
    });
  }

  function handleResolveSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resolveTarget) return;
    if (!note.trim()) {
      toast.error("Vui lòng nhập ghi chú kết luận xử lý (bắt buộc cho kiểm toán)");
      return;
    }
    resolveMutation.mutate({
      disputeId: resolveTarget.id,
      outcome,
      bookingAction: bookingAction || undefined,
      note: note.trim(),
      version: resolveTarget.version,
    });
  }

  const saving = proposeMutation.isPending || resolveMutation.isPending;
  const retryingBookingId = retryMutation.isPending
    ? retryMutation.variables?.bookingId ?? null
    : null;

  const failedBookingColumns = React.useMemo<
    DataTableColumn<AdminNotificationFailedBooking>[]
  >(
    () => [
      {
        accessorKey: "bookingId",
        header: "Booking / Provider",
        cell: ({ row }) => {
          const fb = row.original;
          return (
            <div className="font-mono text-xs tabular-nums">
              <p>BK #{formatShortId(fb.bookingId)}</p>
              <p className="text-muted-foreground">PRV #{formatShortId(fb.providerId)}</p>
            </div>
          );
        },
      },
      {
        accessorKey: "serviceName",
        header: "Dịch vụ & Lý do",
        cell: ({ row }) => {
          const fb = row.original;
          return (
            <div className="max-w-sm text-xs whitespace-normal">
              <p className="font-medium">{fb.serviceName}</p>
              <p className="text-muted-foreground">
                {fb.adminReviewReason || "Chưa xác nhận gửi sau 24h"}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "completionSubmittedAt",
        header: "Mốc gửi / Báo lỗi",
        cell: ({ row }) => {
          const fb = row.original;
          return (
            <div className="text-xs text-muted-foreground tabular-nums">
              <p>
                Hoàn thành:{" "}
                {fb.completionSubmittedAt ? formatDate(fb.completionSubmittedAt) : "—"}
              </p>
              <p>
                Báo lỗi:{" "}
                {fb.notificationFailedAt ? formatDate(fb.notificationFailedAt) : "—"}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "notificationRetryCount",
        header: "Retry",
        cell: ({ row }) => {
          const fb = row.original;
          return (
            <div className="text-xs tabular-nums">
              <p>{fb.notificationRetryCount} lần</p>
              {fb.lastNotificationRetryAt ? (
                <p className="text-muted-foreground">
                  {formatDate(fb.lastNotificationRetryAt)}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Trạng thái",
        cell: () => <StatusBadge status="NOTIFICATION_FAILED" />,
      },
      {
        id: "actions",
        header: () => <div className="text-right">Thao tác</div>,
        cell: ({ row }) => {
          const fb = row.original;
          return (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => detailMutation.mutate(fb.bookingId)}
              >
                Chi tiết
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={retryingBookingId === fb.bookingId}
                onClick={() =>
                  retryMutation.mutate({ bookingId: fb.bookingId, version: fb.version })
                }
              >
                <Send className="h-3.5 w-3.5" />
                Retry Notification
              </Button>
            </div>
          );
        },
      },
    ],
    [detailMutation, retryMutation, retryingBookingId]
  );

  const disputeColumns = React.useMemo<DataTableColumn<DisputeItem>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Mã TC / Booking",
        cell: ({ row }) => {
          const d = row.original;
          return (
            <div className="font-mono text-xs tabular-nums">
              <p>#{formatShortId(d.id)}</p>
              <p className="text-muted-foreground">BK #{formatShortId(d.bookingId)}</p>
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: "Giai đoạn / Danh mục",
        cell: ({ row }) => {
          const d = row.original;
          return (
            <div className="text-xs">
              <p className="font-medium">{d.category}</p>
              <p className="text-muted-foreground">
                {d.openedStage === "PRE_ACCEPTANCE" ? "Trước nghiệm thu" : "Sau nghiệm thu"}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Nội dung & Bằng chứng",
        cell: ({ row }) => {
          const d = row.original;
          return (
            <div className="max-w-md text-xs whitespace-normal">
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
            </div>
          );
        },
      },
      {
        accessorKey: "slaDueAt",
        header: "Hạn SLA",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {row.original.slaDueAt ? formatDate(row.original.slaDueAt) : "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: () => <div className="text-right">Thao tác</div>,
        cell: ({ row }) => {
          const d = row.original;
          const isClosed = TERMINAL_STATUSES.has(d.status);
          return (
            <div className="text-right">
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
                          onSelect: () => requestProviderMutation.mutate(d),
                        },
                        {
                          id: "req-customer",
                          label: "Yêu cầu khách bổ sung bằng chứng (7d)",
                          icon: AlertTriangle,
                          onSelect: () => requestCustomerMutation.mutate(d),
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
            </div>
          );
        },
      },
    ],
    [requestCustomerMutation, requestProviderMutation]
  );

  return (
    <div className="space-y-4">
      {loadError ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-destructive/40 bg-destructive/5 p-4 text-sm">
          <span className="text-destructive">{loadError}</span>
          <Button type="button" size="sm" variant="outline" disabled={reloading} onClick={() => void handleReload()}>
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
          onClick={() => void handleReload()}
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
          <DataTable
            hideSearch
            serverSide
            data={failedBookings}
            columns={failedBookingColumns}
          />
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
            <DataTable
              hideSearch
              serverSide
              data={visibleDisputes}
              columns={disputeColumns}
            />
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
          retryMutation.mutate({
            bookingId: failedDetail.bookingId,
            version: failedDetail.version,
            note: retryNote,
          });
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
