import { redirect } from "next/navigation";
import { requireOrgContext } from "@/shared/auth/guards";
import { orgOpsApi } from "@/features/org-ops/api/org-ops.adapter";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Card } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { formatDateTime } from "@/shared/lib/utils";

export default async function OrgWarrantiesPage() {
  const ctx = await requireOrgContext();
  if (ctx.activeOrganization.organizationStatus !== "APPROVED") {
    redirect("/org/status");
  }

  const warranties = await orgOpsApi.listWarranties(
    ctx.activeOrganization.organizationId
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảo hành điện tử"
        description="Theo dõi thời hạn bảo hành linh kiện & dịch vụ đã kích hoạt cho khách hàng."
      />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã BH</TableHead>
              <TableHead>Thiết bị / Linh kiện</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Hết hạn</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warranties.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-mono text-xs">{w.id}</TableCell>
                <TableCell className="font-medium">{w.deviceOrPart}</TableCell>
                <TableCell>{w.customerName}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDateTime(w.expiresAt)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={w.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
