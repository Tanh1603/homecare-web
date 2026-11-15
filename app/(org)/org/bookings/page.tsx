import { redirect } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { requireOrgContext } from "@/shared/auth/guards";
import { orgOpsApi } from "@/features/org-ops/api/org-ops.adapter";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
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
import { formatDateTime, formatShortId, formatVnd } from "@/shared/lib/utils";

export default async function OrgBookingsPage() {
  const ctx = await requireOrgContext();
  if (ctx.activeOrganization.organizationStatus !== "APPROVED") {
    redirect("/org/status");
  }

  const bookings = await orgOpsApi.listBookings(
    ctx.activeOrganization.organizationId
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đặt lịch dịch vụ"
        description="Theo dõi và điều phối kỹ thuật viên cho các yêu cầu dịch vụ của tổ chức."
      />
      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Chưa có lịch hẹn nào"
          description="Danh sách booking của tổ chức đang trống hoặc chưa đồng bộ từ Booking Service."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Dịch vụ</TableHead>
                <TableHead>Kỹ thuật viên</TableHead>
                <TableHead>Lịch hẹn</TableHead>
                <TableHead>Tổng tiền</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs" title={b.id}>
                    #{formatShortId(b.id)}
                  </TableCell>
                  <TableCell
                    className="font-mono text-xs text-muted-foreground"
                    title={b.customerName}
                  >
                    {formatShortId(b.customerName)}
                  </TableCell>
                  <TableCell className="font-medium">{b.serviceName}</TableCell>
                  <TableCell>{b.technicianName ?? "Chưa phân công"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(b.scheduledAt)}
                  </TableCell>
                  <TableCell>{formatVnd(b.totalAmount)}</TableCell>
                  <TableCell>
                    <StatusBadge status={b.status} />
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
