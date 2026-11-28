"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { disputesHttpApi } from "@/features/disputes/api/disputes.http";
import { FormDrawer, FormField, FormSection } from "@/shared/ui/form-drawer";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Textarea } from "@/shared/ui/textarea";
import { formatShortId } from "@/shared/lib/utils";

export function OrgDisputeResponseDrawer({
  organizationId,
  bookingId,
  open,
  onClose,
  onSubmitted,
}: {
  organizationId: string;
  bookingId: string | null;
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const queryClient = useQueryClient();
  const [responseText, setResponseText] = React.useState("");

  const handleClose = React.useCallback(() => {
    setResponseText("");
    onClose();
  }, [onClose]);

  const disputesQuery = useQuery({
    queryKey: ["org-booking-disputes", organizationId, bookingId],
    queryFn: () => disputesHttpApi.orgListBookingDisputes(organizationId, bookingId!),
    enabled: open && Boolean(bookingId),
  });

  const disputes = disputesQuery.data ?? [];
  const activeDispute =
    disputes.find(
      (d) =>
        d.status === "AWAITING_PROVIDER_RESPONSE" || d.status === "SUBMITTED"
    ) ?? disputes[0];

  const canRespond =
    Boolean(activeDispute) &&
    (activeDispute.status === "AWAITING_PROVIDER_RESPONSE" ||
      activeDispute.status === "SUBMITTED");

  const submitMutation = useMutation({
    mutationFn: (payload: { disputeId: string; response: string; version?: number }) =>
      disputesHttpApi.orgSubmitProviderResponse(
        organizationId,
        payload.disputeId,
        payload.response,
        payload.version
      ),
    onSuccess: () => {
      toast.success("Đã gửi phản hồi tranh chấp tới quản trị viên.");
      void queryClient.invalidateQueries({
        queryKey: ["org-booking-disputes", organizationId, bookingId],
      });
      onSubmitted?.();
      handleClose();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể gửi phản hồi tranh chấp"
      );
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeDispute || !canRespond) return;
    if (!responseText.trim()) {
      toast.error("Vui lòng nhập nội dung phản hồi cho tranh chấp.");
      return;
    }
    submitMutation.mutate({
      disputeId: activeDispute.id,
      response: responseText.trim(),
      version: activeDispute.version,
    });
  }

  return (
    <FormDrawer
      open={open}
      onClose={handleClose}
      title={`Tranh chấp lịch hẹn #${formatShortId(bookingId ?? "")}`}
      description="Xem chi tiết khiếu nại và gửi phản hồi giải trình trong thời hạn SLA 48 giờ."
      isDirty={Boolean(responseText.trim())}
      saving={submitMutation.isPending}
      submitLabel={canRespond ? "Gửi phản hồi" : "Đóng"}
      onSubmit={
        canRespond
          ? handleSubmit
          : (e) => {
              e.preventDefault();
              handleClose();
            }
      }
    >
      {disputesQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Đang tải tranh chấp...</p>
      ) : disputesQuery.isError ? (
        <p className="text-sm text-destructive">
          {disputesQuery.error instanceof Error
            ? disputesQuery.error.message
            : "Không thể tải hồ sơ tranh chấp"}
        </p>
      ) : !activeDispute ? (
        <p className="text-sm text-muted-foreground">
          Không tìm thấy hồ sơ tranh chấp nào cho lịch hẹn này.
        </p>
      ) : (
        <FormSection title={`Hồ sơ #${formatShortId(activeDispute.id)}`}>
          <div className="space-y-2 rounded-lg border border-border bg-surface-secondary/50 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">
                {activeDispute.category}
              </span>
              <StatusBadge status={activeDispute.status} />
            </div>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {activeDispute.description}
            </p>
            {activeDispute.providerResponse ? (
              <p className="border-t border-border pt-2 text-foreground">
                Phản hồi đã gửi: {activeDispute.providerResponse}
              </p>
            ) : null}
          </div>

          {canRespond ? (
            <FormField
              label="Nội dung giải trình của tổ chức"
              htmlFor="org-dispute-response"
              required
            >
              <Textarea
                id="org-dispute-response"
                rows={4}
                value={responseText}
                disabled={submitMutation.isPending}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Trình bày kết quả kiểm tra hiện trường, nguyên nhân và phương án khắc phục..."
              />
            </FormField>
          ) : null}
        </FormSection>
      )}
    </FormDrawer>
  );
}
