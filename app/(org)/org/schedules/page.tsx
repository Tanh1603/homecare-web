import { redirect } from "next/navigation";
import { requireOrgContext } from "@/shared/auth/guards";
import { orgOpsApi } from "@/features/org-ops/api/org-ops.adapter";
import { OrgScheduleCalendar } from "@/features/org-ops/components/org-schedule-calendar";
import { PageHeader } from "@/shared/ui/page-header";

const MANAGE_ROLES = new Set(["ORG_OWNER", "ORG_ADMIN", "OWNER", "MANAGER"]);

export default async function OrgSchedulesPage() {
  const ctx = await requireOrgContext();
  if (ctx.activeOrganization.organizationStatus !== "APPROVED") {
    redirect("/org/status");
  }

  const orgId = ctx.activeOrganization.organizationId;
  const canManage = MANAGE_ROLES.has(ctx.activeOrganization.role);
  const { items: technicians } = await orgOpsApi.listTechniciansPage(
    orgId,
    1,
    100,
    false
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý lịch làm việc"
        description="Theo dõi lịch trực toàn đội kỹ thuật viên theo ngày/tuần/tháng, lọc theo trạng thái và điều chỉnh ca làm việc tập trung."
      />
      <OrgScheduleCalendar
        organizationId={orgId}
        canManage={canManage}
        initialTechnicians={technicians}
      />
    </div>
  );
}
