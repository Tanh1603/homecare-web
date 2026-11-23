import { organizationWorkspaceServerApi } from "@/features/admin/api/organization-workspace.server";
import { OrgWorkspaceTechniciansTable } from "@/features/admin/components/organization-workspace-tables";
import { ErrorState } from "@/shared/ui/error-state";
import { ServerPagination } from "@/shared/ui/server-pagination";

export default async function AdminOrganizationTechniciansPage({
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

  let pageData: Awaited<
    ReturnType<typeof organizationWorkspaceServerApi.listTechniciansPage>
  > | null = null;
  let loadError: string | undefined;

  try {
    pageData = await organizationWorkspaceServerApi.listTechniciansPage(
      orgId,
      { page, size: 20, q }
    );
  } catch (err) {
    loadError = err instanceof Error ? err.message : undefined;
  }

  if (!pageData) {
    return (
      <ErrorState
        title="Không thể tải danh sách kỹ thuật viên"
        message={loadError}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Kỹ thuật viên trực thuộc
          </h2>
          <p className="text-xs text-muted-foreground">
            Danh sách kỹ thuật viên thuộc tổ chức này (bao gồm nhân sự đang tạm
            ngưng).
          </p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          Tổng:{" "}
          <strong className="text-foreground">
            {pageData.pagination.totalItems}
          </strong>
        </span>
      </div>

      <OrgWorkspaceTechniciansTable
        organizationId={orgId}
        items={pageData.items}
        initialQuery={q}
      />

      <ServerPagination
        page={pageData.pagination.page}
        totalPages={pageData.pagination.totalPages}
        totalItems={pageData.pagination.totalItems}
        basePath={`/admin/organizations/${orgId}/technicians`}
        searchParams={q ? { q } : undefined}
      />
    </div>
  );
}
