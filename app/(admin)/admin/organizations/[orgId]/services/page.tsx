import { organizationWorkspaceServerApi } from "@/features/admin/api/organization-workspace.server";
import { OrgWorkspaceServicesTable } from "@/features/admin/components/organization-workspace-tables";
import { ErrorState } from "@/shared/ui/error-state";
import { ServerPagination } from "@/shared/ui/server-pagination";

export default async function AdminOrganizationServicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { orgId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim() ?? "";

  try {
    const pageData = await organizationWorkspaceServerApi.listServicesPage(
      orgId,
      { page, size: 20, q }
    );

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Dịch vụ cung cấp của tổ chức
            </h2>
            <p className="text-xs text-muted-foreground">
              Các gói dịch vụ riêng do tổ chức đăng ký cung cấp, tách biệt với
              Danh mục dịch vụ toàn hệ thống.
            </p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            Tổng: <strong className="text-foreground">{pageData.pagination.totalItems}</strong>
          </span>
        </div>

        <OrgWorkspaceServicesTable
          organizationId={orgId}
          items={pageData.items}
          initialQuery={q}
        />

        <ServerPagination
          page={pageData.pagination.page}
          totalPages={pageData.pagination.totalPages}
          totalItems={pageData.pagination.totalItems}
          basePath={`/admin/organizations/${orgId}/services`}
          searchParams={q ? { q } : undefined}
        />
      </div>
    );
  } catch (err) {
    return (
      <ErrorState
        title="Không thể tải danh sách dịch vụ cung cấp"
        message={err instanceof Error ? err.message : undefined}
      />
    );
  }
}
