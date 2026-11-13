import { redirect } from "next/navigation";
import { requireOrgContext } from "@/shared/auth/guards";
import { orgOpsApi } from "@/features/org-ops/api/org-ops.adapter";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { formatVnd } from "@/shared/lib/utils";

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
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã đơn</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>SL</TableHead>
              <TableHead>Thành tiền</TableHead>
              <TableHead>Bảo hành</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.id}</TableCell>
                <TableCell className="font-medium">{o.buyerName}</TableCell>
                <TableCell>{o.productName}</TableCell>
                <TableCell>{o.quantity}</TableCell>
                <TableCell>{formatVnd(o.totalAmount)}</TableCell>
                <TableCell>
                  <Badge variant={o.warrantyActivated ? "success" : "secondary"}>
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
    </div>
  );
}
