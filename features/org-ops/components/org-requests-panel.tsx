"use client";

import * as React from "react";
import { Check, FileText, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { OrgServiceRequestItem } from "../api/org-ops.adapter";
import { orgOpsHttpApi } from "../api/org-ops.http";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
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
import { formatDate, formatShortId, formatVnd } from "@/shared/lib/utils";

export interface QuoteDraftLine {
  type: "LABOR" | "MATERIAL" | "OTHER";
  description: string;
  quantity: number;
  unitPrice: number;
}

export function calculateQuotationPreview(
  items: QuoteDraftLine[],
  inspectionFeePaid: number,
  applyCredit = true
): {
  itemsTotal: number;
  inspectionFeeCredit: number;
  totalDueAfterCredit: number;
} {
  const itemsTotal = items.reduce(
    (sum, item) =>
      sum + Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.unitPrice) || 0),
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
}: {
  organizationId: string;
  initialRequests: OrgServiceRequestItem[];
}) {
  const [requests, setRequests] =
    React.useState<OrgServiceRequestItem[]>(initialRequests);
  const [quoteTarget, setQuoteTarget] =
    React.useState<OrgServiceRequestItem | null>(null);
  const [lines, setLines] = React.useState<QuoteDraftLine[]>([
    { type: "LABOR", description: "", quantity: 1, unitPrice: 250000 },
  ]);
  const [saving, setSaving] = React.useState(false);

  const preview = React.useMemo(
    () =>
      calculateQuotationPreview(
        lines,
        quoteTarget?.inspectionFee ?? 0,
        true
      ),
    [lines, quoteTarget]
  );

  async function handleAccept(req: OrgServiceRequestItem) {
    try {
      const updated = await orgOpsHttpApi.acceptServiceRequest(
        organizationId,
        req.id,
        0
      );
      setRequests((prev) =>
        prev.map((item) => (item.id === req.id ? updated : item))
      );
      toast.success("Đã tiếp nhận yêu cầu dịch vụ");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể tiếp nhận yêu cầu"
      );
    }
  }

  async function handleReject(req: OrgServiceRequestItem) {
    try {
      const updated = await orgOpsHttpApi.rejectServiceRequest(
        organizationId,
        req.id,
        "PROVIDER_REJECTED"
      );
      setRequests((prev) =>
        prev.map((item) => (item.id === req.id ? updated : item))
      );
      toast.success("Đã từ chối yêu cầu & kích hoạt thông báo fallback");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể từ chối yêu cầu"
      );
    }
  }

  async function handleSendQuotation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!quoteTarget) return;
    const validLines = lines.filter(
      (l) => l.description.trim().length > 0 && l.quantity > 0 && l.unitPrice >= 0
    );
    if (validLines.length === 0) {
      toast.error("Vui lòng nhập ít nhất 1 hạng mục báo giá hợp lệ");
      return;
    }
    setSaving(true);
    try {
      await orgOpsHttpApi.issueQuotation(organizationId, quoteTarget.id, {
        items: validLines,
        applyInspectionFeeCredit: true,
      });
      setRequests((prev) =>
        prev.map((item) =>
          item.id === quoteTarget.id
            ? { ...item, status: "QUOTATION_SENT" }
            : item
        )
      );
      toast.success("Đã phát hành báo giá mới");
      setQuoteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể gửi báo giá"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã YC</TableHead>
              <TableHead>Loại / Danh mục</TableHead>
              <TableHead>Khách hàng / Địa chỉ</TableHead>
              <TableHead>Định giá / Khảo sát</TableHead>
              <TableHead>Thời gian mong muốn</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs" title={r.id}>
                  #{formatShortId(r.id)}
                </TableCell>
                <TableCell>
                  <p className="font-medium">{r.serviceCategory}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.requestType === "WARRANTY_CLAIM"
                      ? "Bảo hành"
                      : "Sửa chữa / Dịch vụ"}
                  </p>
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="font-medium">
                    {r.requesterName || r.requesterProfileId}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.formattedAddress || r.address}
                  </p>
                </TableCell>
                <TableCell className="text-xs">
                  <span className="font-medium">{r.priceType}</span>
                  {r.inspectionFee > 0 ? (
                    <p className="text-muted-foreground">
                      Khảo sát: {formatVnd(r.inspectionFee)}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(r.preferredStart)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="w-[1%] whitespace-nowrap text-right">
                  {(() => {
                    const isAwaitingProvider = r.status === "AWAITING_PROVIDER";
                    const canQuote =
                      r.priceType === "QUOTE_REQUIRED" &&
                      (r.status === "DIAGNOSTIC_BOOKED" ||
                        r.status === "AWAITING_QUOTATION" ||
                        r.status === "QUOTATION_SENT");

                    if (!isAwaitingProvider && !canQuote) {
                      return (
                        <span className="text-xs text-muted-foreground">—</span>
                      );
                    }

                    return (
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
                                onSelect: () => handleAccept(r),
                              },
                              {
                                id: "quote",
                                label: "Gửi báo giá",
                                icon: FileText,
                                hidden: !canQuote,
                                onSelect: () => {
                                  setQuoteTarget(r);
                                  setLines([
                                    {
                                      type: "LABOR",
                                      description: "",
                                      quantity: 1,
                                      unitPrice: 250000,
                                    },
                                  ]);
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
                                onSelect: () => handleReject(r),
                              },
                            ],
                          },
                        ]}
                      />
                    );
                  })()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <FormDrawer
        open={Boolean(quoteTarget)}
        onClose={() => setQuoteTarget(null)}
        title={`Lập báo giá cho yêu cầu #${formatShortId(quoteTarget?.id ?? "")}`}
        description="Báo giá đã gửi là bất biến; gửi bản mới sẽ tự động thay thế (SUPERSEDE) phiên bản trước."
        isDirty={lines.some((l) => l.description.trim().length > 0)}
        saving={saving}
        submitLabel="Phát hành báo giá"
        onSubmit={handleSendQuotation}
        size="lg"
      >
        <FormSection
          title="Hạng mục công việc & Vật tư"
          description="Phí khảo sát đã thu sẽ được khấu trừ 100% vào tổng báo giá."
        >
          {lines.map((line, idx) => (
            <div
              key={idx}
              className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-12"
            >
              <div className="sm:col-span-3">
                <FormField label="Loại" htmlFor={`q-type-${idx}`}>
                  <NativeSelect
                    id={`q-type-${idx}`}
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
                    <NativeSelectOption value="LABOR">Nhân công</NativeSelectOption>
                    <NativeSelectOption value="MATERIAL">Vật tư</NativeSelectOption>
                    <NativeSelectOption value="OTHER">Khác</NativeSelectOption>
                  </NativeSelect>
                </FormField>
              </div>
              <div className="sm:col-span-4">
                <FormField label="Mô tả" htmlFor={`q-desc-${idx}`} required>
                  <Input
                    id={`q-desc-${idx}`}
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
                <FormField label="SL" htmlFor={`q-qty-${idx}`} required>
                  <Input
                    id={`q-qty-${idx}`}
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
                <FormField label="Đơn giá" htmlFor={`q-price-${idx}`} required>
                  <Input
                    id={`q-price-${idx}`}
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
                    onClick={() =>
                      setLines(lines.filter((_, i) => i !== idx))
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
              setLines([
                ...lines,
                { type: "MATERIAL", description: "", quantity: 1, unitPrice: 0 },
              ])
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
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Khấu trừ phí khảo sát đã thu:
              </span>
              <span className="font-medium text-emerald-600">
                -{formatVnd(preview.inspectionFeeCredit)}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Còn phải thu sau khấu trừ:</span>
              <span>{formatVnd(preview.totalDueAfterCredit)}</span>
            </div>
          </div>
        </FormSection>
      </FormDrawer>
    </div>
  );
}
