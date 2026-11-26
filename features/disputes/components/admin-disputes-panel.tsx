"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquareText,
  RefreshCw,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import { disputesHttpApi, type DisputeItem } from "../api/disputes.http";
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
  initialError = null,
}: {
  initialDisputes: DisputeItem[];
  initialError?: string | null;
}) {
  const [disputes, setDisputes] = React.useState<DisputeItem[]>(initialDisputes);
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
      const next = await disputesHttpApi.adminListDisputes();
      setDisputes(next);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Không thể tải danh sách tranh chấp.");
    } finally {
      setReloading(false);
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

      <div className="flex flex-wrap items-center justify-between gap-2">
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
