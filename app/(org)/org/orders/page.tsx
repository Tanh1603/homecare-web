import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { requireOrgContext } from "@/shared/auth/guards";
import { orgOpsApi } from "@/features/org-ops/api/org-ops.adapter";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Badge } from "@/shared/ui/badge";
import { EmptyState } from "@/shared/ui/empty-state";
import { Card } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { formatShortId, formatVnd } from "@/shared/lib/utils";

export default async function OrgOrdersPage() {
  const ctx = await requireOrgContext();
  if (ctx.activeOrganization.organizationStatus !== "APPROVED") {
    redirect("/org/status");
  }

  const orders = await orgOpsApi.listOrders(
    ctx.activeOrganization.organizationId
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đơn hàng linh kiện"
        description="Quản lý đơn hàng vật tư, linh kiện chính hãng và kích hoạt bảo hành."
      />
      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Chưa có đơn hàng linh kiện"
          description="Khi khách hàng đặt mua vật tư thuộc tổ chức, đơn hàng sẽ hiển thị tại đây."
        />
      ) : (
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs" title={o.id}>
                    #{formatShortId(o.id)}
                  </TableCell>
                  <TableCell
                    className="font-mono text-xs text-muted-foreground"
                    title={o.buyerName}
                  >
                    {formatShortId(o.buyerName)}
                  </TableCell>
                  <TableCell className="font-medium">{o.productName}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
