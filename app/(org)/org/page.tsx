import { redirect } from "next/navigation";
import { CalendarCheck, Package, ShieldCheck, Users } from "lucide-react";
import { requireOrgContext } from "@/shared/auth/guards";
import { orgOpsApi } from "@/features/org-ops/api/org-ops.adapter";
import { PageHeader } from "@/shared/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { StatusBadge } from "@/shared/ui/status-badge";
import { formatVnd } from "@/shared/lib/utils";

export default async function OrgDashboardPage() {
  const ctx = await requireOrgContext();
  if (ctx.activeOrganization.organizationStatus !== "APPROVED") {
    redirect("/org/status");
  }

  const orgId = ctx.activeOrganization.organizationId;
  const [bookings, orders, technicians, warranties] = await Promise.all([
    orgOpsApi.listBookings(orgId),
    orgOpsApi.listOrders(orgId),
    orgOpsApi.listTechnicians(orgId),
    orgOpsApi.listWarranties(orgId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Xin chào, ${ctx.activeOrganization.organizationName}`}
        description={`Vai trò của bạn trong tổ chức: ${ctx.activeOrganization.memberRole}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lịch hẹn dịch vụ
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{bookings.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Đơn hàng linh kiện
            </CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{orders.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Kỹ thuật viên
            </CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {technicians.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bảo hành đang hiệu lực
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {warranties.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking dịch vụ gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">
                    {b.id} · {b.serviceName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Khách hàng: {b.customerName} · Thợ:{" "}
                    {b.technicianName ?? "Chưa phân công"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium tabular-nums">
                    {formatVnd(b.totalAmount)}
                  </span>
                  <StatusBadge status={b.status} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
