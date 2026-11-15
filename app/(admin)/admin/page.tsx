import Link from "next/link";
import { Building2, Clock, FolderTree, Users } from "lucide-react";
import { organizationsServerApi } from "@/features/organizations/api/organizations.server";
import { ORGANIZATION_TYPE_LABELS } from "@/features/organizations/contracts/organization";
import { adminApi } from "@/features/admin/api/admin.adapter";
import { PageHeader } from "@/shared/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng tổ chức
            </CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{orgs.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chờ phê duyệt
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {pendingOrgs.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Người dùng
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{users.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dịch vụ & Linh kiện
            </CardTitle>
            <FolderTree className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{catalog.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Hồ sơ Organization chờ duyệt gần đây</CardTitle>
          {pendingOrgs.length > 0 ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/organizations">Xem tất cả</Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
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
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {org.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ORGANIZATION_TYPE_LABELS[org.type] ?? org.type} ·{" "}
                      {org.city}
                      {org.taxCode ? ` · MST: ${org.taxCode}` : ""} ·{" "}
                      {org.phone}
                    </p>
                  </div>
                  <StatusBadge status={org.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
