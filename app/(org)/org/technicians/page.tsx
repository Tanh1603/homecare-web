import { redirect } from "next/navigation";
import { requireOrgContext } from "@/shared/auth/guards";
import { orgOpsApi } from "@/features/org-ops/api/org-ops.adapter";
import { OrgTechniciansPanel } from "@/features/org-ops/components/org-technicians-panel";
import { PageHeader } from "@/shared/ui/page-header";
import { ServerPagination } from "@/shared/ui/server-pagination";

export default async function OrgTechniciansPage({
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
  const { items: technicians, pagination } =
    await orgOpsApi.listTechniciansPage(orgId, page, 20, true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đội ngũ Kỹ thuật viên"
        description="Quản lý kỹ thuật viên, chuyên môn và lịch làm việc thuộc tổ chức của bạn."
      />
      <OrgTechniciansPanel
        organizationId={orgId}
        initialTechnicians={technicians}
      />
      <ServerPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        basePath="/org/technicians"
      />
    </div>
  );
}
