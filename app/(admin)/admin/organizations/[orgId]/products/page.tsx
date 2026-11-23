import { organizationWorkspaceServerApi } from "@/features/admin/api/organization-workspace.server";
import { OrgWorkspaceProductsTable } from "@/features/admin/components/organization-workspace-tables";
import { ErrorState } from "@/shared/ui/error-state";
import { ServerPagination } from "@/shared/ui/server-pagination";

export default async function AdminOrganizationProductsPage({
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
    const pageData = await organizationWorkspaceServerApi.listProductsPage(
      orgId,
      { page, size: 20, q }
    );

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Sản phẩm & linh kiện của tổ chức
            </h2>
            <p className="text-xs text-muted-foreground">
              Danh sách sản phẩm do tổ chức kinh doanh, gồm giá bán, bảo hành và
              tồn kho thực tế.
            </p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            Tổng: <strong className="text-foreground">{pageData.pagination.totalItems}</strong>
          </span>
        </div>

        <OrgWorkspaceProductsTable
          organizationId={orgId}
          items={pageData.items}
          initialQuery={q}
        />

        <ServerPagination
          page={pageData.pagination.page}
          totalPages={pageData.pagination.totalPages}
          totalItems={pageData.pagination.totalItems}
          basePath={`/admin/organizations/${orgId}/products`}
          searchParams={q ? { q } : undefined}
        />
      </div>
    );
  } catch (err) {
    return (
      <ErrorState
        title="Không thể tải danh sách sản phẩm"
        message={err instanceof Error ? err.message : undefined}
      />
    );
  }
}
