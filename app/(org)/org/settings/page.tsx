import { redirect } from "next/navigation";
import { requireOrgContext } from "@/shared/auth/guards";
import { organizationsServerApi } from "@/features/organizations/api/organizations.server";
import { OrgMembersPanel } from "@/features/organizations/components/org-members-panel";
import { OrgProfileForm } from "@/features/organizations/components/org-profile-form";
import { PageHeader } from "@/shared/ui/page-header";

export default async function OrgSettingsPage() {
  const ctx = await requireOrgContext();
  if (ctx.activeOrganization.organizationStatus !== "APPROVED") {
    redirect("/org/status");
  }

  const orgId = ctx.activeOrganization.organizationId;
  const [detail, members] = await Promise.all([
    organizationsServerApi.getDetail(orgId),
    organizationsServerApi.listCurrentMembers(orgId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cài đặt tổ chức"
        description="Thông tin pháp lý tổ chức và quản lý danh sách thành viên."
      />
      <OrgProfileForm
        organizationId={orgId}
        organizationName={ctx.activeOrganization.organizationName}
        organizationStatus={ctx.activeOrganization.organizationStatus}
        currentUserRole={ctx.activeOrganization.memberRole}
        initialOrganization={detail}
      />

      <OrgMembersPanel
        organizationId={orgId}
        currentUserId={ctx.userId}
        currentUserRole={ctx.activeOrganization.memberRole}
        initialMembers={members}
      />
    </div>
  );
}
