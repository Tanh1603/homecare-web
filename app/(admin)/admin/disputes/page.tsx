import { gatewayFetch } from "@/shared/api/gateway-client";
import { extractPageItems } from "@/shared/api/api-envelope";
import { PageHeader } from "@/shared/ui/page-header";
import { AdminDisputesPanel } from "@/features/disputes/components/admin-disputes-panel";
import type {
  AdminNotificationFailedBooking,
  DisputeItem,
} from "@/features/disputes/api/disputes.http";

export default async function AdminDisputesPage() {
  let disputes: DisputeItem[] = [];
  let notificationFailed: AdminNotificationFailedBooking[] = [];
  let loadError: string | null = null;

  const [disputeResult, notifResult] = await Promise.allSettled([
    gatewayFetch<DisputeItem[] | { items?: DisputeItem[] }>(
      "/admin/disputes?page=1&size=30"
    ),
    gatewayFetch<AdminNotificationFailedBooking[] | { items?: AdminNotificationFailedBooking[] }>(
      "/admin/bookings/notification-failed?page=1&size=30"
    ),
  ]);

  if (disputeResult.status === "fulfilled") {
    disputes = extractPageItems<DisputeItem>(disputeResult.value);
  } else {
    loadError =
      disputeResult.reason instanceof Error
        ? disputeResult.reason.message
        : "Không thể tải danh sách tranh chấp.";
  }

  if (notifResult.status === "fulfilled") {
    notificationFailed = extractPageItems<AdminNotificationFailedBooking>(notifResult.value);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Tranh chấp & SLA"
        description="Tiếp nhận, đối chiếu bằng chứng, theo dõi SLA phản hồi 48h/7 ngày và xử lý lỗi gửi thông báo nghiệm thu (D-07, D-27)."
      />
      <AdminDisputesPanel
        initialDisputes={disputes}
        initialNotificationFailed={notificationFailed}
        initialError={loadError}
      />
    </div>
  );
}
