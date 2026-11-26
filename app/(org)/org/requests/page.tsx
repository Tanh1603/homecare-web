import { redirect } from "next/navigation";
import { requireOrgContext } from "@/shared/auth/guards";
import { PageHeader } from "@/shared/ui/page-header";
import { OrgRequestsPanel } from "@/features/org-ops/components/org-requests-panel";
import { gatewayFetch } from "@/shared/api/gateway-client";
import { extractPageItems } from "@/shared/api/api-envelope";
import type { OrgServiceRequestItem } from "@/features/org-ops/api/org-ops.adapter";

export default async function OrgRequestsPage() {
  const ctx = await requireOrgContext();
  if (ctx.activeOrganization.organizationStatus !== "APPROVED") {
    redirect("/org/status");
  }
  const orgId = ctx.activeOrganization.organizationId;

  let requests: OrgServiceRequestItem[] = [];
  let loadError: string | null = null;
  if (orgId) {
    try {
      const raw = await gatewayFetch<
        OrgServiceRequestItem[] | { items?: OrgServiceRequestItem[] }
      >("/service-requests?page=1&size=50", {
        organizationId: orgId,
      });
      requests = extractPageItems<OrgServiceRequestItem>(raw);
    } catch (err) {
      requests = [];
      loadError =
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách yêu cầu dịch vụ.";
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yêu cầu dịch vụ & Báo giá"
        description="Tiếp nhận yêu cầu sửa chữa/bảo hành, điều phối khảo sát và phát hành báo giá theo phiên bản."
      />
      <OrgRequestsPanel
        organizationId={orgId}
        initialRequests={requests}
        initialError={loadError}
      />
    </div>
  );
}
