import { gatewayFetch } from "@/shared/api/gateway-client";
import { extractPageItems, extractPaginationMeta } from "@/shared/api/api-envelope";
import { PageHeader } from "@/shared/ui/page-header";
import { AdminReviewsPanel } from "@/features/reviews/components/admin-reviews-panel";
import type { AdminReviewItem } from "@/features/reviews/api/reviews.http";

export default async function AdminReviewsPage() {
  let items: AdminReviewItem[] = [];
  let pagination = extractPaginationMeta<AdminReviewItem>([], 1, 20);
  let loadError: string | null = null;

  try {
    const raw = await gatewayFetch<AdminReviewItem[] | { items?: AdminReviewItem[] }>(
      "/admin/service-reviews?page=1&size=20"
    );
    items = extractPageItems(raw);
    pagination = extractPaginationMeta(raw, 1, 20);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Không thể tải danh sách đánh giá.";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kiểm duyệt Đánh giá & Đồng bộ Rating (D-31)"
        description="Tìm kiếm, lọc, ẩn/khôi phục đánh giá vi phạm kèm nhật ký kiểm duyệt và đồng bộ lại điểm trung bình đơn vị."
      />
      <AdminReviewsPanel
        initialItems={items}
        initialPagination={pagination}
        initialError={loadError}
      />
    </div>
  );
}
