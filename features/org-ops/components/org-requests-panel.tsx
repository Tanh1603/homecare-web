"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, FileText, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { OrgServiceRequestItem } from "../api/org-ops.adapter";
import { orgOpsHttpApi } from "../api/org-ops.http";
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
import { formatDate, formatShortId, formatVnd } from "@/shared/lib/utils";

export interface QuoteDraftLine {
  id?: string;
  type: "LABOR" | "MATERIAL" | "OTHER";
  description: string;
  quantity: number;
  unitPrice: number;
}

function createDraftLine(
  type: QuoteDraftLine["type"] = "LABOR",
  unitPrice = 250000
): QuoteDraftLine {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    description: "",
    quantity: 1,
    unitPrice,
  };
}

export function calculateQuotationPreview(
  items: QuoteDraftLine[],
  inspectionFeePaid: number,
  applyCredit = false
): {
  itemsTotal: number;
  inspectionFeeCredit: number;
  totalDueAfterCredit: number;
} {
  const itemsTotal = items.reduce(
    (sum, item) =>
      sum +
      Math.max(0, Number(item.quantity) || 0) *
        Math.max(0, Number(item.unitPrice) || 0),
    0
  );
  const feePaid = Math.max(0, Number(inspectionFeePaid) || 0);
  const inspectionFeeCredit = applyCredit ? Math.min(feePaid, itemsTotal) : 0;
  const totalDueAfterCredit = Math.max(0, itemsTotal - inspectionFeeCredit);
  return { itemsTotal, inspectionFeeCredit, totalDueAfterCredit };
}

export function OrgRequestsPanel({
  organizationId,
  initialRequests,
  initialError = null,
}: {
  organizationId: string;
  initialRequests: OrgServiceRequestItem[];
  initialError?: string | null;
}) {
  const statusFilter = useUiStore((s) => s.orgRequestsStatusFilter);
  const setStatusFilter = useUiStore((s) => s.setOrgRequestsStatusFilter);

  const [requests, setRequests] =
    React.useState<OrgServiceRequestItem[]>(initialRequests);
  const [loadError, setLoadError] = React.useState<string | null>(initialError);

  const [acceptTarget, setAcceptTarget] =
    React.useState<OrgServiceRequestItem | null>(null);
  const [fixedPriceInput, setFixedPriceInput] = React.useState("300000");

  const [rejectTarget, setRejectTarget] =
    React.useState<OrgServiceRequestItem | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");

  const [quoteTarget, setQuoteTarget] =
    React.useState<OrgServiceRequestItem | null>(null);
  const [revisedBookingTarget, setRevisedBookingTarget] =
    React.useState<OrgServiceRequestItem | null>(null);
  const [lines, setLines] = React.useState<QuoteDraftLine[]>([
    createDraftLine("LABOR", 250000),
  ]);
  const [supersedeReason, setSupersedeReason] = React.useState("");
  const [revisionReason, setRevisionReason] = React.useState("");
  const [validHours, setValidHours] = React.useState("48");

  const isRequote = quoteTarget?.status === "QUOTATION_SENT";
  const applyCreditByPolicy =
    quoteTarget?.inspectionFeePolicy === "CREDIT_FULL";

  const preview = React.useMemo(
    () =>
      calculateQuotationPreview(
        lines,
        quoteTarget?.inspectionFee ?? 0,
        applyCreditByPolicy
      ),
    [lines, quoteTarget, applyCreditByPolicy]
  );

  const reloadMutation = useMutation({
    mutationFn: () => orgOpsHttpApi.listServiceRequests(organizationId),
    onMutate: () => {
      setLoadError(null);
    },
    onSuccess: (next) => {
      setRequests(next);
    },
    onError: (err) => {
      setLoadError(
        err instanceof Error ? err.message : "Không thể tải lại danh sách yêu cầu."
      );
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (vars: { req: OrgServiceRequestItem; fixedPrice: number }) =>
      orgOpsHttpApi.acceptServiceRequest(
        organizationId,
        vars.req.id,
        vars.fixedPrice
      ),
    onSuccess: (updated, vars) => {
      setRequests((prev) =>
        prev.map((item) => (item.id === vars.req.id ? updated : item))
      );
      toast.success("Đã tiếp nhận yêu cầu dịch vụ");
      setAcceptTarget(null);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể tiếp nhận yêu cầu"
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (vars: { req: OrgServiceRequestItem; reason: string }) =>
      orgOpsHttpApi.rejectServiceRequest(
        organizationId,
        vars.req.id,
        vars.reason
      ),
    onSuccess: (updated, vars) => {
      setRequests((prev) =>
        prev.map((item) => (item.id === vars.req.id ? updated : item))
      );
      toast.success("Đã từ chối yêu cầu & mở luồng chọn đối tác thay thế");
      setRejectReason("");
      setRejectTarget(null);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể từ chối yêu cầu"
      );
    },
  });

  const sendQuotationMutation = useMutation({
    mutationFn: async (
      vars:
        | {
            mode: "REVISE";
            repairBookingId: string;
            items: Omit<QuoteDraftLine, "id">[];
            revisionReason: string;
            validUntil: string;
          }
        | {
            mode: "ISSUE";
            requestId: string;
            items: Omit<QuoteDraftLine, "id">[];
            validUntil: string;
            applyInspectionFeeCredit: boolean;
            supersedeReason?: string;
          }
    ) => {
      if (vars.mode === "REVISE") {
        await orgOpsHttpApi.issueRevisedQuotation(
          organizationId,
          vars.repairBookingId,
          {
            items: vars.items,
            revisionReason: vars.revisionReason,
            validUntil: vars.validUntil,
          }
        );
        return vars;
      }
      await orgOpsHttpApi.issueQuotation(organizationId, vars.requestId, {
        items: vars.items,
        validUntil: vars.validUntil,
        applyInspectionFeeCredit: vars.applyInspectionFeeCredit,
        supersedeReason: vars.supersedeReason,
      });
      return vars;
    },
    onSuccess: (vars) => {
      if (vars.mode === "REVISE") {
        toast.success("Đã gửi báo giá phát sinh chờ khách hàng duyệt");
        setRevisionReason("");
        setRevisedBookingTarget(null);
        return;
      }
      setRequests((prev) =>
        prev.map((item) =>
          item.id === vars.requestId
            ? { ...item, status: "QUOTATION_SENT" }
            : item
        )
      );
      toast.success("Đã phát hành báo giá mới");
      setSupersedeReason("");
      setQuoteTarget(null);
    },
    onError: (err, vars) => {
      toast.error(
        err instanceof Error
          ? err.message
          : vars.mode === "REVISE"
            ? "Không thể gửi báo giá phát sinh"
            : "Không thể gửi báo giá"
      );
    },
  });

  const saving =
    acceptMutation.isPending ||
    rejectMutation.isPending ||
    sendQuotationMutation.isPending;
  const reloading = reloadMutation.isPending;

  const onSelectAccept = React.useCallback(
    (req: OrgServiceRequestItem) => {
      if (req.priceType === "FIXED" && req.requestType !== "WARRANTY_CLAIM") {
        setAcceptTarget(req);
        setFixedPriceInput("300000");
        return;
      }
      acceptMutation.mutate({ req, fixedPrice: 0 });
    },
    [acceptMutation]
  );

  function handleConfirmFixedAccept(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!acceptTarget) return;
    const price = Number(fixedPriceInput);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Vui lòng nhập đơn giá cố định lớn hơn 0 ₫");
      return;
    }
    acceptMutation.mutate({ req: acceptTarget, fixedPrice: Math.round(price) });
  }

  function handleConfirmReject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối yêu cầu");
      return;
    }
    rejectMutation.mutate({ req: rejectTarget, reason: rejectReason.trim() });
  }

  function handleSendQuotation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validLines = lines
      .filter(
        (l) =>
          l.description.trim().length > 0 && l.quantity > 0 && l.unitPrice >= 0
      )
      .map(({ type, description, quantity, unitPrice }) => ({
        type,
        description: description.trim(),
        quantity,
        unitPrice,
      }));
    if (validLines.length === 0) {
      toast.error("Vui lòng nhập ít nhất 1 hạng mục báo giá hợp lệ");
      return;
    }
    const hours = Math.min(168, Math.max(12, Number(validHours) || 48));
    const bufferMs =
      hours <= 12 ? 5 * 60 * 1000 : hours >= 168 ? -5 * 60 * 1000 : 0;
    const validUntil = new Date(
      Date.now() + hours * 3600 * 1000 + bufferMs
    ).toISOString();

    if (revisedBookingTarget?.repairBookingId) {
      if (!revisionReason.trim()) {
        toast.error("Vui lòng nhập lý do phát sinh báo giá điều chỉnh");
        return;
      }
      sendQuotationMutation.mutate({
        mode: "REVISE",
        repairBookingId: revisedBookingTarget.repairBookingId,
        items: validLines,
        revisionReason: revisionReason.trim(),
        validUntil,
      });
      return;
    }

    if (!quoteTarget) return;
    if (isRequote && !supersedeReason.trim()) {
      toast.error("Vui lòng nhập lý do phát hành lại báo giá");
      return;
    }
    sendQuotationMutation.mutate({
      mode: "ISSUE",
      requestId: quoteTarget.id,
      items: validLines,
      validUntil,
      applyInspectionFeeCredit: applyCreditByPolicy,
      supersedeReason: isRequote ? supersedeReason.trim() : undefined,
    });
  }

  const visibleRequests = React.useMemo(
    () =>
      statusFilter === "ALL"
        ? requests
        : requests.filter((r) => r.status === statusFilter),
    [requests, statusFilter]
  );

  const columns = React.useMemo<DataTableColumn<OrgServiceRequestItem>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Mã YC",
        cell: ({ row }) => (
          <span className="font-mono text-xs" title={row.original.id}>
            #{formatShortId(row.original.id)}
          </span>
        ),
      },
      {
        accessorKey: "serviceCategory",
        header: "Loại / Danh mục",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.serviceCategory}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.requestType === "WARRANTY_CLAIM"
                ? "Bảo hành"
                : "Sửa chữa / Dịch vụ"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "requesterName",
        header: "Khách hàng / Địa chỉ",
        cell: ({ row }) => (
          <div className="max-w-xs">
            <p className="font-medium">
              {row.original.requesterName || row.original.requesterProfileId}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.formattedAddress || row.original.address}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "priceType",
        header: "Định giá / Khảo sát",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="text-xs">
              <span className="font-medium">{r.priceType}</span>
              {r.inspectionFee > 0 ? (
                <p className="text-muted-foreground">
                  Khảo sát: {formatVnd(r.inspectionFee)}
                  {r.inspectionFeePolicy ? ` (${r.inspectionFeePolicy})` : ""}
                </p>
              ) : null}
              {r.inspectionFeeWarningFlag ? (
                <p className="font-medium text-amber-600">
                  Cảnh báo phí khảo sát cao
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "preferredStart",
        header: "Thời gian mong muốn",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.preferredStart)}
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
          const r = row.original;
          const isAwaitingProvider = r.status === "AWAITING_PROVIDER";
          const canQuote =
            r.priceType === "QUOTE_REQUIRED" &&
            (r.status === "DIAGNOSTIC_BOOKED" ||
              r.status === "AWAITING_QUOTATION" ||
              r.status === "QUOTATION_SENT");
          const canRevise =
            r.status === "BOOKED" && Boolean(r.repairBookingId);

          if (!isAwaitingProvider && !canQuote && !canRevise) {
            return (
              <div className="text-right">
                <span className="text-xs text-muted-foreground">—</span>
              </div>
            );
          }

          return (
            <div className="text-right">
              <RowActionsMenu
                ariaLabel={`Thao tác cho yêu cầu #${formatShortId(r.id)}`}
                groups={[
                  {
                    id: "actions",
                    items: [
                      {
                        id: "accept",
                        label: "Nhận việc",
                        icon: Check,
                        hidden: !isAwaitingProvider,
                        onSelect: () => onSelectAccept(r),
                      },
                      {
                        id: "quote",
                        label:
                          r.status === "QUOTATION_SENT"
                            ? "Phát hành lại báo giá"
                            : "Gửi báo giá",
                        icon: FileText,
                        hidden: !canQuote,
                        onSelect: () => {
                          setRevisedBookingTarget(null);
                          setQuoteTarget(r);
                          setSupersedeReason("");
                          setValidHours("48");
                          setLines([createDraftLine("LABOR", 250000)]);
                        },
                      },
                      {
                        id: "revise-quote",
                        label: "Gửi báo giá phát sinh",
                        icon: FileText,
                        hidden: !canRevise,
                        onSelect: () => {
                          setQuoteTarget(null);
                          setRevisedBookingTarget(r);
                          setRevisionReason("");
                          setValidHours("48");
                          setLines([createDraftLine("MATERIAL", 150000)]);
                        },
                      },
                    ],
                  },
                  {
                    id: "danger",
                    items: [
                      {
                        id: "reject",
                        label: "Từ chối yêu cầu",
                        icon: X,
                        destructive: true,
                        hidden: !isAwaitingProvider,
                        onSelect: () => {
                          setRejectTarget(r);
                          setRejectReason("");
                        },
                      },
                    ],
                  },
                ]}
              />
            </div>
          );
        },
      },
    ],
    [onSelectAccept]
  );

  return (
    <div className="space-y-4">
      {loadError ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-destructive/40 bg-destructive/5 p-4 text-sm">
          <span className="text-destructive">{loadError}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={reloading}
            onClick={() => reloadMutation.mutate()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {reloading ? "Đang tải..." : "Tải lại"}
          </Button>
        </Card>
      ) : null}

      {requests.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Chưa có yêu cầu dịch vụ nào"
          description="Khi khách hàng gửi yêu cầu sửa chữa, bảo hành hoặc khảo sát đến tổ chức, danh sách sẽ hiển thị tại đây."
        />
      ) : (
        <DataTable
          hideSearch
          serverSide
          data={visibleRequests}
          columns={columns}
          emptyMessage="Không có yêu cầu phù hợp với trạng thái đã chọn."
          toolbarSlot={
            <div className="w-52">
              <NativeSelect
                aria-label="Lọc trạng thái yêu cầu"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-medium"
              >
                <NativeSelectOption value="ALL">Tất cả trạng thái</NativeSelectOption>
                <NativeSelectOption value="AWAITING_PROVIDER">Chờ phản hồi</NativeSelectOption>
                <NativeSelectOption value="DIAGNOSTIC_BOOKED">Đã đặt khảo sát</NativeSelectOption>
                <NativeSelectOption value="AWAITING_QUOTATION">Chờ báo giá</NativeSelectOption>
                <NativeSelectOption value="QUOTATION_SENT">Đã gửi báo giá</NativeSelectOption>
                <NativeSelectOption value="BOOKED">Đã chốt lịch</NativeSelectOption>
                <NativeSelectOption value="REJECTED">Đã từ chối</NativeSelectOption>
                <NativeSelectOption value="EXPIRED">Hết hạn</NativeSelectOption>
              </NativeSelect>
            </div>
          }
        />
      )}

      {/* Drawer xác nhận đơn giá cố định */}
      <FormDrawer
        open={Boolean(acceptTarget)}
        onClose={() => setAcceptTarget(null)}
        title={`Xác nhận nhận việc #${formatShortId(acceptTarget?.id ?? "")}`}
        description="Nhập đơn giá cố định áp dụng cho lịch sửa chữa trước khi tiếp nhận."
        isDirty={Boolean(fixedPriceInput.trim())}
        saving={saving}
        submitLabel="Xác nhận nhận việc"
        onSubmit={handleConfirmFixedAccept}
      >
        <FormField label="Đơn giá cố định (VNĐ)" htmlFor="accept-fixed-price" required>
          <Input
            id="accept-fixed-price"
            type="number"
            min={1000}
            value={fixedPriceInput}
            onChange={(e) => setFixedPriceInput(e.target.value)}
          />
        </FormField>
      </FormDrawer>

      {/* Drawer nhập lý do từ chối */}
      <FormDrawer
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title={`Từ chối yêu cầu #${formatShortId(rejectTarget?.id ?? "")}`}
        description="Yêu cầu sẽ chuyển sang trạng thái chờ khách hàng chọn đơn vị thay thế."
        isDirty={Boolean(rejectReason.trim())}
        saving={saving}
        submitLabel="Xác nhận từ chối"
        onSubmit={handleConfirmReject}
      >
        <FormField label="Lý do từ chối" htmlFor="reject-sr-reason" required>
          <Input
            id="reject-sr-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="VD: Hết lịch kỹ thuật viên trong khung giờ yêu cầu"
          />
        </FormField>
      </FormDrawer>

      {/* Drawer lập báo giá ban đầu / báo giá phát sinh */}
      <FormDrawer
        open={Boolean(quoteTarget || revisedBookingTarget)}
        onClose={() => {
          setQuoteTarget(null);
          setRevisedBookingTarget(null);
        }}
        title={
          revisedBookingTarget
            ? `Lập báo giá phát sinh cho #${formatShortId(revisedBookingTarget.id)}`
            : `Lập báo giá cho yêu cầu #${formatShortId(quoteTarget?.id ?? "")}`
        }
        description={
          revisedBookingTarget
            ? "Báo giá phát sinh cần khách hàng phê duyệt trước khi hoàn tất lịch sửa chữa."
            : "Báo giá đã gửi là bất biến; gửi bản mới sẽ tự động thay thế (SUPERSEDE) phiên bản trước."
        }
        isDirty={lines.some((l) => l.description.trim().length > 0)}
        saving={saving}
        submitLabel={
          revisedBookingTarget ? "Gửi báo giá phát sinh" : "Phát hành báo giá"
        }
        onSubmit={handleSendQuotation}
        size="lg"
      >
        <FormSection
          title="Hạng mục công việc & Vật tư"
          description={
            revisedBookingTarget
              ? "Chỉ liệt kê phần nhân công hoặc vật tư phát sinh thêm."
              : applyCreditByPolicy
                ? "Chính sách CREDIT_FULL: Phí khảo sát đã thu sẽ được khấu trừ 100% vào tổng báo giá."
                : `Chính sách ${quoteTarget?.inspectionFeePolicy ?? "NO_FEE"}: Phí khảo sát không khấu trừ vào báo giá.`
          }
        >
          {revisedBookingTarget ? (
            <FormField
              label="Lý do phát sinh"
              htmlFor="q-revision-reason"
              required
            >
              <Input
                id="q-revision-reason"
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder="VD: Phát hiện hỏng tụ khởi động cần thay mới"
              />
            </FormField>
          ) : isRequote ? (
            <FormField
              label="Lý do phát hành lại báo giá"
              htmlFor="q-supersede-reason"
              required
            >
              <Input
                id="q-supersede-reason"
                value={supersedeReason}
                onChange={(e) => setSupersedeReason(e.target.value)}
                placeholder="VD: Điều chỉnh vật tư sau khi kiểm tra lại bo mạch"
              />
            </FormField>
          ) : null}

          <FormField
            label="Hiệu lực báo giá (12h – 7 ngày)"
            htmlFor="q-valid-hours"
          >
            <NativeSelect
              id="q-valid-hours"
              value={validHours}
              onChange={(e) => setValidHours(e.target.value)}
            >
              <NativeSelectOption value="12">12 giờ</NativeSelectOption>
              <NativeSelectOption value="24">24 giờ</NativeSelectOption>
              <NativeSelectOption value="48">48 giờ (Mặc định)</NativeSelectOption>
              <NativeSelectOption value="72">3 ngày</NativeSelectOption>
              <NativeSelectOption value="168">7 ngày</NativeSelectOption>
            </NativeSelect>
          </FormField>

          {lines.map((line, idx) => (
            <div
              key={line.id}
              className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-12"
            >
              <div className="sm:col-span-3">
                <FormField label="Loại" htmlFor={`q-type-${line.id}`}>
                  <NativeSelect
                    id={`q-type-${line.id}`}
                    value={line.type}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = {
                        ...line,
                        type: e.target.value as QuoteDraftLine["type"],
                      };
                      setLines(next);
                    }}
                    className="text-xs"
                  >
                    <NativeSelectOption value="LABOR">
                      Nhân công
                    </NativeSelectOption>
                    <NativeSelectOption value="MATERIAL">
                      Vật tư
                    </NativeSelectOption>
                    <NativeSelectOption value="OTHER">Khác</NativeSelectOption>
                  </NativeSelect>
                </FormField>
              </div>
              <div className="sm:col-span-4">
                <FormField
                  label="Mô tả"
                  htmlFor={`q-desc-${line.id}`}
                  required
                >
                  <Input
                    id={`q-desc-${line.id}`}
                    value={line.description}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...line, description: e.target.value };
                      setLines(next);
                    }}
                    placeholder="VD: Thay ống đồng / nạp gas"
                  />
                </FormField>
              </div>
              <div className="sm:col-span-2">
                <FormField label="SL" htmlFor={`q-qty-${line.id}`} required>
                  <Input
                    id={`q-qty-${line.id}`}
                    type="number"
                    min={1}
                    value={String(line.quantity)}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = {
                        ...line,
                        quantity: Math.max(1, Number(e.target.value) || 1),
                      };
                      setLines(next);
                    }}
                  />
                </FormField>
              </div>
              <div className="sm:col-span-2">
                <FormField
                  label="Đơn giá"
                  htmlFor={`q-price-${line.id}`}
                  required
                >
                  <Input
                    id={`q-price-${line.id}`}
                    type="number"
                    min={0}
                    value={String(line.unitPrice)}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = {
                        ...line,
                        unitPrice: Math.max(0, Number(e.target.value) || 0),
                      };
                      setLines(next);
                    }}
                  />
                </FormField>
              </div>
              <div className="flex items-end justify-end sm:col-span-1">
                {lines.length > 1 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label="Xóa dòng báo giá"
                    onClick={() =>
                      setLines(lines.filter((item) => item.id !== line.id))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setLines([...lines, createDraftLine("MATERIAL", 0)])
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm dòng báo giá
          </Button>
        </FormSection>

        <FormSection title="Tổng hợp thanh toán dự kiến">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tổng hạng mục:</span>
              <span className="font-medium">
                {formatVnd(preview.itemsTotal)}
              </span>
            </div>
            {!revisedBookingTarget ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Khấu trừ phí khảo sát đã thu:
                </span>
                <span className="font-medium text-emerald-600">
                  -{formatVnd(preview.inspectionFeeCredit)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Còn phải thu sau khấu trừ:</span>
              <span>
                {formatVnd(
                  revisedBookingTarget
                    ? preview.itemsTotal
                    : preview.totalDueAfterCredit
                )}
              </span>
            </div>
          </div>
        </FormSection>
      </FormDrawer>
    </div>
  );
}
