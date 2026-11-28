import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { requireOrgContext } from "@/shared/auth/guards";
import { orgOpsApi } from "@/features/org-ops/api/org-ops.adapter";
import { OrgWarrantiesTable } from "@/features/org-ops/components/org-warranties-table";
import { OrgWarrantyClaimsPanel } from "@/features/warranties/components/org-warranty-claims-panel";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState } from "@/shared/ui/empty-state";
import { ServerPagination } from "@/shared/ui/server-pagination";

export default async function OrgWarrantiesPage({
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
  const { items: warranties, pagination } = await orgOpsApi.listWarrantiesPage(
    ctx.activeOrganization.organizationId,
    page,
    20
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảo hành điện tử"
        description="Theo dõi thời hạn bảo hành linh kiện & dịch vụ đã kích hoạt cho khách hàng."
      />
      {warranties.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Chưa có phiếu bảo hành nào"
          description="Bảo hành điện tử được kích hoạt tự động khi giao linh kiện hoặc tạo thủ công cho thiết bị."
        />
      ) : (
        <>
          <OrgWarrantiesTable initialWarranties={warranties} />
          <ServerPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            basePath="/org/warranties"
          />
        </>
      )}
      <OrgWarrantyClaimsPanel />
    </div>
  );
}
