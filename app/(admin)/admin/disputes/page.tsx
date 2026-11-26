import { gatewayFetch } from "@/shared/api/gateway-client";
import { extractPageItems } from "@/shared/api/api-envelope";
import { PageHeader } from "@/shared/ui/page-header";
import { AdminDisputesPanel } from "@/features/disputes/components/admin-disputes-panel";
import type { DisputeItem } from "@/features/disputes/api/disputes.http";

export default async function AdminDisputesPage() {
  let disputes: DisputeItem[] = [];
  let loadError: string | null = null;
  try {
    const raw = await gatewayFetch<DisputeItem[] | { items?: DisputeItem[] }>(
      "/admin/disputes?page=1&size=30"
    );
    disputes = extractPageItems<DisputeItem>(raw);
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : "Không thể tải danh sách tranh chấp.";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Tranh chấp & SLA"
        description="Tiếp nhận, đối chiếu bằng chứng, theo dõi SLA phản hồi 48h/7 ngày và ghi nhận kết luận xử lý nội bộ (D-07, D-27)."
      />
      <AdminDisputesPanel initialDisputes={disputes} initialError={loadError} />
    </div>
  );
}
