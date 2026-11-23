import { organizationWorkspaceServerApi } from "@/features/admin/api/organization-workspace.server";
import { OrgWorkspaceCoveragePanel } from "@/features/admin/components/organization-workspace-tables";
import { ErrorState } from "@/shared/ui/error-state";

export default async function AdminOrganizationCoveragePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const { entries, error } =
    await organizationWorkspaceServerApi.listCoverageMatrix(orgId);

  if (error) {
    return (
      <ErrorState title="Không thể tải khu vực phủ sóng" message={error} />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Khu vực phủ sóng theo dịch vụ
        </h2>
        <p className="text-xs text-muted-foreground">
          Giám sát phạm vi tỉnh/thành phố và phường/xã đang phục vụ của từng
          dịch vụ thuộc tổ chức.
        </p>
      </div>

      <OrgWorkspaceCoveragePanel organizationId={orgId} entries={entries} />
    </div>
  );
}
