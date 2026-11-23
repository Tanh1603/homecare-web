import { redirect } from "next/navigation";
import { requireOrgContext } from "@/shared/auth/guards";
import { orgOpsApi } from "@/features/org-ops/api/org-ops.adapter";
import { OrgQualificationsPanel } from "@/features/org-ops/components/org-qualifications-panel";
import { OrgServicesPanel } from "@/features/org-ops/components/org-services-panel";
import { PageHeader } from "@/shared/ui/page-header";
import { ServerPagination } from "@/shared/ui/server-pagination";

export default async function OrgServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const ctx = await requireOrgContext();
  if (ctx.activeOrganization.organizationStatus !== "APPROVED") {
    redirect("/org/status");
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const orgId = ctx.activeOrganization.organizationId;
  const { items: services, pagination } = await orgOpsApi.listServicesPage(
    orgId,
    page,
    20
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dịch vụ cung cấp"
        description="Quản lý danh mục dịch vụ sửa chữa & bảo dưỡng của tổ chức."
      />
      <OrgServicesPanel organizationId={orgId} initialServices={services} />
      <OrgQualificationsPanel organizationId={orgId} />
      <ServerPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        basePath="/org/services"
      />
    </div>
  );
}
