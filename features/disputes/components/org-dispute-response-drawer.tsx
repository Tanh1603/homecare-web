"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  disputesHttpApi,
  type DisputeItem,
} from "@/features/disputes/api/disputes.http";
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
  const [disputes, setDisputes] = React.useState<DisputeItem[]>([]);
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null);
  const [responseText, setResponseText] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const requestKey = open && bookingId ? `${organizationId}:${bookingId}` : null;
  const loading = Boolean(requestKey) && loadedKey !== requestKey;

  React.useEffect(() => {
    if (!requestKey || !bookingId) return;
    let active = true;
    disputesHttpApi
      .orgListBookingDisputes(organizationId, bookingId)
      .then((list) => {
        if (!active) return;
        setDisputes(list);
        setResponseText("");
      })
      .catch((err) => {
        if (!active) return;
        toast.error(
          err instanceof Error ? err.message : "Không thể tải hồ sơ tranh chấp"
        );
        setDisputes([]);
      })
      .finally(() => {
        if (active) setLoadedKey(requestKey);
      });
    return () => {
      active = false;
    };
  }, [requestKey, bookingId, organizationId]);

  const handleClose = React.useCallback(() => {
    setLoadedKey(null);
    setResponseText("");
    onClose();
  }, [onClose]);

  const activeDispute =
    disputes.find(
      (d) =>
        d.status === "AWAITING_PROVIDER_RESPONSE" || d.status === "SUBMITTED"
    ) ?? disputes[0];

  const canRespond =
    Boolean(activeDispute) &&
    (activeDispute.status === "AWAITING_PROVIDER_RESPONSE" ||
      activeDispute.status === "SUBMITTED");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeDispute || !canRespond) return;
    if (!responseText.trim()) {
      toast.error("Vui lòng nhập nội dung phản hồi cho tranh chấp.");
      return;
    }
    setSaving(true);
    try {
      await disputesHttpApi.orgSubmitProviderResponse(
        organizationId,
        activeDispute.id,
        responseText.trim(),
        activeDispute.version
      );
      toast.success("Đã gửi phản hồi tranh chấp tới quản trị viên.");
      onSubmitted?.();
      handleClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể gửi phản hồi tranh chấp"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={handleClose}
      title={`Tranh chấp lịch hẹn #${formatShortId(bookingId ?? "")}`}
      description="Xem chi tiết khiếu nại và gửi phản hồi giải trình trong thời hạn SLA 48 giờ."
      isDirty={Boolean(responseText.trim())}
      saving={saving}
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
      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải tranh chấp...</p>
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
                disabled={saving}
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
