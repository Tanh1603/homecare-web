import { redirect } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { requireOrgContext } from "@/shared/auth/guards";
import { orgOpsApi } from "@/features/org-ops/api/org-ops.adapter";
import { OrgReturnsTable } from "@/features/org-ops/components/org-returns-table";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState } from "@/shared/ui/empty-state";
import { ServerPagination } from "@/shared/ui/server-pagination";

export default async function OrgReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const ctx = await requireOrgContext();
  if (ctx.activeOrganization.organizationStatus !== "APPROVED") {
    redirect("/org/status");
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const orgId = ctx.activeOrganization.organizationId;
  const { items: returns, pagination } = await orgOpsApi.listReturnsPage(
    orgId,
    page,
    20,
    sp.status
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trả hàng & Hoàn tiền"
        description="Hộp thư tiếp nhận và xử lý yêu cầu trả hàng/hoàn tiền từ khách hàng."
      />
      {returns.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="Chưa có yêu cầu trả hàng nào"
          description="Các yêu cầu hoàn tiền / trả hàng của khách hàng sẽ xuất hiện tại đây."
        />
      ) : (
        <>
          <OrgReturnsTable
            organizationId={orgId}
            currentUserRole={ctx.activeOrganization.role}
            initialReturns={returns}
          />
          <ServerPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            basePath="/org/returns"
            searchParams={{ status: sp.status }}
          />
        </>
      )}
    </div>
  );
}
