"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, Truck } from "lucide-react";
import { toast } from "sonner";
import type { OrgOrderItem } from "../api/org-ops.adapter";
import { orgOpsHttpApi } from "../api/org-ops.http";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ContextInspector } from "@/shared/ui/context-inspector";
import { StatusBadge } from "@/shared/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { formatShortId, formatVnd } from "@/shared/lib/utils";

export function OrgOrdersTable({
  organizationId,
  initialOrders,
}: {
  organizationId: string;
  initialOrders: OrgOrderItem[];
}) {
  const router = useRouter();
  const [orders, setOrders] = React.useState<OrgOrderItem[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] =
    React.useState<OrgOrderItem | null>(null);
  const [busyLineId, setBusyLineId] = React.useState<string | null>(null);

  async function handleFulfill(orderId: string, lineId: string) {
    setBusyLineId(lineId);
    try {
      const updated = await orgOpsHttpApi.fulfillOrderLine(
        organizationId,
        orderId,
        lineId
      );
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o))
      );
      setSelectedOrder((prev) =>
        prev && prev.id === orderId ? { ...prev, ...updated } : prev
      );
      toast.success("Đã cập nhật giao hàng cho dòng sản phẩm");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể xác nhận giao hàng"
      );
    } finally {
      setBusyLineId(null);
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã đơn</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>SL</TableHead>
              <TableHead>Thành tiền</TableHead>
              <TableHead>Thanh toán</TableHead>
              <TableHead>Bảo hành</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs" title={o.id}>
                  #{formatShortId(o.id)}
                </TableCell>
                <TableCell className="font-medium">{o.buyerName}</TableCell>
                <TableCell>{o.productName}</TableCell>
                <TableCell>{o.quantity}</TableCell>
                <TableCell>{formatVnd(o.totalAmount)}</TableCell>
                <TableCell>
                  {o.paymentStatus ? (
                    <StatusBadge status={o.paymentStatus} />
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={o.warrantyActivated ? "success" : "secondary"}
                  >
                    {o.warrantyActivated ? "Đã kích hoạt" : "Chưa kích hoạt"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge status={o.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedOrder(o)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Xem
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <ContextInspector
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={`Chi tiết đơn hàng #${formatShortId(selectedOrder?.id ?? "")}`}
        subtitle="Danh sách dòng sản phẩm và trạng thái xác nhận giao hàng."
        className="max-w-xl"
      >
        {selectedOrder ? (
          <div className="space-y-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-xs text-muted-foreground">
                  Khách hàng
                </span>
                <p className="font-medium">{selectedOrder.buyerName}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  Địa chỉ giao hàng
                </span>
                <div className="mt-1 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                  <p className="font-medium text-foreground">
                    {selectedOrder.shippingAddress ?? "—"}
                  </p>
                  {selectedOrder.shippingAddressSnapshot ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {[
                          selectedOrder.shippingAddressSnapshot.recipientName,
                          selectedOrder.shippingAddressSnapshot.phoneNumber,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {selectedOrder.shippingAddressSnapshot.wardName ||
                      selectedOrder.shippingAddressSnapshot.provinceName ? (
                        <span className="inline-flex items-center rounded-md border border-border/60 bg-background px-2 py-0.5 text-[11px]">
                          {[
                            selectedOrder.shippingAddressSnapshot.wardName,
                            selectedOrder.shippingAddressSnapshot.provinceName,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>SL</TableHead>
                    <TableHead>Đơn giá</TableHead>
                    <TableHead>Giao hàng</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrder.lines.map((line) => {
                    const canFulfill =
                      selectedOrder.paymentStatus === "PAID" &&
                      line.fulfillmentStatus !== "DELIVERED" &&
                      line.fulfillmentStatus !== "RETURNED";
                    return (
                      <TableRow key={line.id}>
                        <TableCell className="font-medium">
                          {line.productName}
                        </TableCell>
                        <TableCell>{line.quantity}</TableCell>
                        <TableCell>{formatVnd(line.unitPrice)}</TableCell>
                        <TableCell>
                          <StatusBadge status={line.fulfillmentStatus} />
                        </TableCell>
                        <TableCell className="text-right">
                          {canFulfill ? (
                            <Button
                              size="sm"
                              disabled={busyLineId === line.id}
                              onClick={() =>
                                handleFulfill(selectedOrder.id, line.id)
                              }
                            >
                              <Truck className="h-3.5 w-3.5" />
                              {busyLineId === line.id
                                ? "Đang xử lý..."
                                : "Xác nhận đã giao"}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </ContextInspector>
    </>
  );
}
