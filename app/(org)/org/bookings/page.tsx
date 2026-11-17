import { redirect } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { requireOrgContext } from "@/shared/auth/guards";
import { orgOpsApi } from "@/features/org-ops/api/org-ops.adapter";
import { OrgBookingsTable } from "@/features/org-ops/components/org-bookings-table";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState } from "@/shared/ui/empty-state";
import { ServerPagination } from "@/shared/ui/server-pagination";

export default async function OrgBookingsPage({
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
  const { items: bookings, pagination } = await orgOpsApi.listBookingsPage(
    ctx.activeOrganization.organizationId,
    page,
    20
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đặt lịch dịch vụ"
        description="Theo dõi và điều phối kỹ thuật viên cho các yêu cầu dịch vụ của tổ chức."
      />
      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Chưa có lịch hẹn nào"
          description="Danh sách booking của tổ chức đang trống hoặc chưa đồng bộ từ Booking Service."
        />
      ) : (
        <>
          <OrgBookingsTable
            organizationId={ctx.activeOrganization.organizationId}
            initialBookings={bookings}
          />
          <ServerPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            basePath="/org/bookings"
          />
        </>
      )}
    </div>
  );
}
