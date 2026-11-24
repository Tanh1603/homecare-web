import { organizationWorkspaceServerApi } from "@/features/admin/api/organization-workspace.server";
import { OrganizationOverviewPanel } from "@/features/admin/components/organization-overview-panel";
import { ErrorState } from "@/shared/ui/error-state";

export default async function AdminOrganizationOverviewPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [{ organization, errorMessage }, summary] = await Promise.all([
    organizationWorkspaceServerApi.getDetail(orgId),
    organizationWorkspaceServerApi.getWorkspaceSummary(orgId),
  ]);

  if (!organization) {
    return (
      <ErrorState
        title="Không thể tải tổng quan tổ chức"
        message={errorMessage ?? undefined}
      />
    );
  }

  return (
    <OrganizationOverviewPanel organization={organization} summary={summary} />
  );
}
