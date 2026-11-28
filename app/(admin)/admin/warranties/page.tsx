import { gatewayFetch } from "@/shared/api/gateway-client";
import { extractPageItems } from "@/shared/api/api-envelope";
import { PageHeader } from "@/shared/ui/page-header";
import { AdminWarrantiesPanel } from "@/features/warranties/components/admin-warranties-panel";
import type {
  HouseholdWarrantyItem,
  WarrantyClaimItem,
} from "@/features/warranties/api/warranties.http";

export default async function AdminWarrantiesPage() {
  let warranties: HouseholdWarrantyItem[] = [];
  let claims: WarrantyClaimItem[] = [];
  let loadError: string | null = null;

  try {
    const [rawW, rawC] = await Promise.all([
      gatewayFetch<HouseholdWarrantyItem[] | { items?: HouseholdWarrantyItem[] }>(
        "/admin/warranties?page=1&size=30"
      ),
      gatewayFetch<WarrantyClaimItem[] | { items?: WarrantyClaimItem[] }>(
        "/admin/warranty-claims?page=1&size=30"
      ),
    ]);
    warranties = extractPageItems<HouseholdWarrantyItem>(rawW);
    claims = extractPageItems<WarrantyClaimItem>(rawC);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Không thể tải danh sách bảo hành.";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Xác minh Bảo hành & Claims (D-14)"
        description="Kiểm duyệt bảo hành hãng, bằng chứng ủy quyền đối tác và theo dõi SLA 48h yêu cầu bảo hành."
      />
      <AdminWarrantiesPanel
        initialWarranties={warranties}
        initialClaims={claims}
        initialError={loadError}
      />
    </div>
  );
}
