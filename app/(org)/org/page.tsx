import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  CalendarCheck,
  Package,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import { requireOrgContext } from "@/shared/auth/guards";
import { formatOrgRoleLabel } from "@/features/organizations/contracts/organization";
import { orgOpsApi } from "@/features/org-ops/api/org-ops.adapter";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { EmptyState } from "@/shared/ui/empty-state";
import { Button } from "@/shared/ui/button";
import { formatShortId, formatVnd } from "@/shared/lib/utils";

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

  const activeBookings = bookings.filter(
    (b) => !["COMPLETED", "CANCELLED"].includes(b.status.toUpperCase())
  );
  const completedBookings = bookings.filter(
    (b) => b.status.toUpperCase() === "COMPLETED"
  );
  const pendingOrders = orders.filter(
    (o) => !["DELIVERED", "COMPLETED", "CANCELLED"].includes(o.status.toUpperCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Xin chào, ${ctx.activeOrganization.organizationName}`}
        description={`Vai trò của bạn trong tổ chức: ${formatOrgRoleLabel(ctx.activeOrganization.memberRole)}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/org/bookings">Xem tất cả lịch hẹn</Link>
          </Button>
        }
      />

      {/* Unified operational summary strip */}
      <section
        aria-label="Tổng quan vận hành tổ chức"
        className="rounded-xl border border-border bg-surface shadow-2xs grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border"
      >
        <div className="p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Lịch hẹn dịch vụ</span>
            <CalendarCheck className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {bookings.length}
          </p>
          <p className="text-xs text-muted-foreground">
            {activeBookings.length} đang mở · {completedBookings.length} hoàn thành
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Đơn hàng linh kiện</span>
            <Package className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {orders.length}
          </p>
          <p className="text-xs text-muted-foreground">
            {pendingOrders.length} đơn cần xử lý
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Kỹ thuật viên</span>
            <Users className="h-4 w-4 text-success" />
          </div>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {technicians.length}
          </p>
          <p className="text-xs text-muted-foreground">
            Nhân sự trực thuộc tổ chức
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Bảo hành điện tử</span>
            <ShieldCheck className="h-4 w-4 text-success" />
          </div>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {warranties.length}
          </p>
          <p className="text-xs text-muted-foreground">
            Hồ sơ đang quản lý
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <section className="lg:col-span-8 rounded-xl border border-border bg-surface shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Booking dịch vụ gần đây
              </h2>
              <p className="text-xs text-muted-foreground">
                Theo dõi tiến độ tiếp nhận và điều phối kỹ thuật viên.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/org/bookings">
                Điều phối ngay
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="p-5">
            {bookings.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="Chưa có lịch hẹn dịch vụ"
                description="Khi khách hàng đặt dịch vụ của tổ chức qua ứng dụng, lịch hẹn mới sẽ xuất hiện tại đây."
              />
            ) : (
              <div className="divide-y divide-border">
                {bookings.slice(0, 6).map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        <span className="font-mono text-xs text-muted-foreground">
                          #{formatShortId(b.id)}
                        </span>{" "}
                        · {b.serviceName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Khách hàng: {b.customerName} · Thợ:{" "}
                        {b.technicianName ?? "Chưa phân công"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatVnd(b.totalAmount)}
                      </span>
                      <StatusBadge status={b.status} domain="booking" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="lg:col-span-4 space-y-6">
          <section className="rounded-xl border border-border bg-surface p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Đơn hàng linh kiện mới
              </h2>
              <Link
                href="/org/orders"
                className="text-xs font-medium text-primary hover:underline"
              >
                Tất cả
              </Link>
            </div>
            {orders.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Chưa có đơn hàng linh kiện nào.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {orders.slice(0, 4).map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-medium text-foreground truncate">
                        #{formatShortId(o.id)}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatVnd(o.totalAmount)}
                      </p>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-surface p-5 shadow-2xs space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Lối tắt vận hành
            </h2>
            <div className="grid gap-2">
              <Link
                href="/org/technicians"
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-secondary px-3 py-2.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  Đội ngũ kỹ thuật viên
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link
                href="/org/services"
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-secondary px-3 py-2.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Wrench className="h-3.5 w-3.5 text-success" />
                  Quản lý dịch vụ & vật tư
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link
                href="/org/warranties"
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-secondary px-3 py-2.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-warning" />
                  Tra cứu bảo hành điện tử
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
