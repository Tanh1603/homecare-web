"use client";

import * as React from "react";
import { toast } from "sonner";
import { warrantiesHttpApi, type PartsRequestItem } from "../api/warranties.http";
import { Button } from "@/shared/ui/button";
import { FormDrawer, FormField, FormSection } from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { StatusBadge } from "@/shared/ui/status-badge";

/**
 * Provider PartsRequest commercial approval drawer (D-19, BR-PART-01..02).
 * Displays private costPrice alongside customer-facing unitPrice for Org managers.
 */
export function OrgPartsReviewDrawer({
  bookingId,
  open,
  onOpenChange,
}: {
  bookingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [items, setItems] = React.useState<PartsRequestItem[]>([]);
  const [selected, setSelected] = React.useState<PartsRequestItem | null>(null);
  const [costPrice, setCostPrice] = React.useState("");
  const [unitPrice, setUnitPrice] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !bookingId) return;
    warrantiesHttpApi
      .orgListPartsRequests(bookingId)
      .then(setItems)
      .catch(() => setItems([]));
  }, [open, bookingId]);

  async function handleDecision(approved: boolean) {
    if (!bookingId || !selected) return;
    if (!approved && !reason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối linh kiện.");
      return;
    }
    setSaving(true);
    try {
      const updated = await warrantiesHttpApi.orgReviewPartsRequest(
        bookingId,
        selected.id,
        {
          approved,
          costPrice: costPrice ? Number(costPrice) : undefined,
          unitPrice: unitPrice ? Number(unitPrice) : undefined,
          reason: reason.trim() || undefined,
        },
        selected.version
      );
      setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
      setSelected(null);
      toast.success(approved ? "Đã duyệt linh kiện EXTERNAL_SUPPLIER" : "Đã từ chối yêu cầu linh kiện");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={() => onOpenChange(false)}
      title="Phê duyệt Yêu cầu Linh kiện (D-19)"
      description="Giá nhập (costPrice) chỉ hiển thị nội bộ cho Tổ chức, ẩn hoàn toàn với Khách hàng."
      onSubmit={(e) => {
        e.preventDefault();
        if (!selected) {
          onOpenChange(false);
          return;
        }
        void handleDecision(true);
      }}
      saving={saving}
      submitLabel={selected ? "Duyệt linh kiện" : "Đóng"}
    >
      <FormSection title="Danh sách linh kiện của lịch hẹn">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Chưa có yêu cầu linh kiện nào.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded border p-2.5 text-xs">
                <div>
                  <div className="font-medium">
                    {item.partName} × {item.quantity} ({item.partSource})
                  </div>
                  <div className="text-muted-foreground">
                    Giá nhập: {item.costPrice ?? "—"} | Giá bán: {item.unitPrice ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.status} />
                  {item.status === "PENDING_PROVIDER_APPROVAL" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelected(item);
                        setCostPrice(item.costPrice != null ? String(item.costPrice) : "");
                        setUnitPrice(item.unitPrice != null ? String(item.unitPrice) : "");
                        setReason("");
                      }}
                    >
                      Xét duyệt
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </FormSection>

      {selected && (
        <FormSection title={`Duyệt: ${selected.partName}`}>
          <FormField label="Giá nhập nội bộ (costPrice — VND)">
            <Input type="number" min={0} value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
          </FormField>
          <FormField label="Giá bán cho khách (unitPrice — VND)">
            <Input type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          </FormField>
          <FormField label="Lý do (nếu từ chối)">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={saving}
            onClick={() => void handleDecision(false)}
          >
            Từ chối yêu cầu này
          </Button>
        </FormSection>
      )}
    </FormDrawer>
  );
}
