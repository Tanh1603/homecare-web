import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Clock,
  FolderTree,
  Users,
  Wrench,
} from "lucide-react";
import { organizationsServerApi } from "@/features/organizations/api/organizations.server";
import { ORGANIZATION_TYPE_LABELS } from "@/features/organizations/contracts/organization";
import { adminApi } from "@/features/admin/api/admin.adapter";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/status-badge";
import { EmptyState } from "@/shared/ui/empty-state";

export default async function AdminDashboardPage() {
  const [orgs, users, catalog] = await Promise.all([
    organizationsServerApi.listAll(),
    adminApi.listUsers(),
    adminApi.listCatalog(),
  ]);

  const pendingOrgs = orgs.filter((o) => o.status === "PENDING");
  const approvedOrgs = orgs.filter((o) => o.status === "APPROVED");
  const serviceCount = catalog.filter((c) => c.type === "SERVICE").length;
  const productCount = catalog.filter((c) => c.type === "PRODUCT").length;

  const roleCounts = [
    {
      label: "Đối tác Organization",
      count: users.filter((u) => u.role === "ORGANIZATION").length,
      barClass: "bg-primary",
    },
    {
      label: "Kỹ thuật viên",
      count: users.filter((u) => u.role === "TECHNICIAN").length,
      barClass: "bg-success",
    },
    {
      label: "Khách hàng",
      count: users.filter((u) => u.role === "CUSTOMER").length,
      barClass: "bg-amber-500",
    },
  ];
  const totalUsers = Math.max(users.length, 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan hệ thống"
        description="Theo dõi đối tác Organization, người dùng và danh mục chuẩn HomeCare."
        actions={
          <Button asChild>
            <Link href="/admin/organizations">Duyệt hồ sơ đối tác</Link>
          </Button>
        }
      />

      {/* Unified operational summary strip */}
      <section
        aria-label="Chỉ số vận hành hệ thống"
        className="rounded-xl border border-border bg-surface shadow-2xs grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border"
      >
        <div className="p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Tổng tổ chức</span>
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {orgs.length}
          </p>
          <p className="text-xs text-muted-foreground">
            {approvedOrgs.length} đang hoạt động
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Chờ phê duyệt</span>
            <Clock className="h-4 w-4 text-warning" />
          </div>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {pendingOrgs.length}
          </p>
          <p className="text-xs text-muted-foreground">
            {pendingOrgs.length > 0 ? "Cần admin xem xét" : "Đã xử lý hết"}
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Người dùng</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {users.length}
          </p>
          <p className="text-xs text-muted-foreground">
            Tài khoản trên Supabase Auth
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Dịch vụ & Linh kiện</span>
            <FolderTree className="h-4 w-4 text-success" />
          </div>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {catalog.length}
          </p>
          <p className="text-xs text-muted-foreground">
            {serviceCount} dịch vụ · {productCount} linh kiện
          </p>
        </div>
      </section>

      {/* Asymmetric two-column operational workspace */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <section className="lg:col-span-8 rounded-xl border border-border bg-surface shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Hồ sơ Organization chờ duyệt
              </h2>
              <p className="text-xs text-muted-foreground">
                Các đối tác vừa gửi yêu cầu kích hoạt trên hệ thống.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/organizations">
                Quản lý tổ chức
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="p-5">
            {pendingOrgs.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="Không có hồ sơ chờ duyệt"
                description="Tất cả hồ sơ đối tác đã được xử lý hoặc chưa có tổ chức mới đăng ký."
              />
            ) : (
              <div className="divide-y divide-border">
                {pendingOrgs.map((org) => (
                  <div
                    key={org.id}
                    className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {org.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ORGANIZATION_TYPE_LABELS[org.type] ?? org.type} ·{" "}
                        {org.city}
                        {org.taxCode ? ` · MST: ${org.taxCode}` : ""} ·{" "}
                        {org.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={org.status} />
                      <Button asChild variant="ghost" size="sm">
                        <Link href="/admin/organizations">Xem xét</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="lg:col-span-4 space-y-6">
          <section className="rounded-xl border border-border bg-surface p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Phân bổ vai trò người dùng
              </h2>
              <Link
                href="/admin/users"
                className="text-xs font-medium text-primary hover:underline"
              >
                Chi tiết
              </Link>
            </div>

            <div className="space-y-3">
              {roleCounts.map((item) => {
                const pct = Math.round((item.count / totalUsers) * 100);
                return (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${item.barClass}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5 shadow-2xs space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Truy cập nhanh
            </h2>
            <div className="grid gap-2">
              <Link
                href="/admin/users"
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-secondary px-3 py-2.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  Quản lý tài khoản & phân quyền
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link
                href="/admin/technicians"
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-secondary px-3 py-2.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Wrench className="h-3.5 w-3.5 text-success" />
                  Giám sát kỹ thuật viên
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link
                href="/admin/catalog"
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-secondary px-3 py-2.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FolderTree className="h-3.5 w-3.5 text-warning" />
                  Danh mục dịch vụ & linh kiện
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
