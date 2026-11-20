import { cookies } from "next/headers";
import { PageHeader } from "@/shared/ui/page-header";
import { OrgRequestsPanel } from "@/features/org-ops/components/org-requests-panel";
import { gatewayFetch } from "@/shared/api/gateway-client";
import { extractPageItems } from "@/shared/api/api-envelope";
import type { OrgServiceRequestItem } from "@/features/org-ops/api/org-ops.adapter";

export default async function OrgRequestsPage() {
  const cookieStore = await cookies();
  const orgId = cookieStore.get("hc_active_org_id")?.value ?? "";

  let requests: OrgServiceRequestItem[] = [];
  if (orgId) {
    try {
      const raw = await gatewayFetch<
        OrgServiceRequestItem[] | { items?: OrgServiceRequestItem[] }
      >("/service-requests?page=1&size=50", {
        organizationId: orgId,
      });
      requests = extractPageItems<OrgServiceRequestItem>(raw);
    } catch {
      requests = [];
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yêu cầu dịch vụ & Báo giá"
        description="Tiếp nhận yêu cầu sửa chữa/bảo hành, điều phối khảo sát và phát hành báo giá theo phiên bản."
      />
      <OrgRequestsPanel organizationId={orgId} initialRequests={requests} />
    </div>
  );
}
