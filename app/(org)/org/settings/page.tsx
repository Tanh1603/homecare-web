import { redirect } from "next/navigation";
import { requireOrgContext } from "@/shared/auth/guards";
import { organizationsServerApi } from "@/features/organizations/api/organizations.server";
import {
  formatOrgRoleLabel,
  ORGANIZATION_TYPE_LABELS,
} from "@/features/organizations/contracts/organization";
import { OrgMembersPanel } from "@/features/organizations/components/org-members-panel";
import { PageHeader } from "@/shared/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { StatusBadge } from "@/shared/ui/status-badge";

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
        description="Thông tin pháp lý tổ chức và quản lý thành viên trong organization_members."
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{ctx.activeOrganization.organizationName}</CardTitle>
          <StatusBadge status={ctx.activeOrganization.organizationStatus} />
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Vai trò của bạn</p>
            <p className="mt-0.5 font-medium">
              {formatOrgRoleLabel(ctx.activeOrganization.memberRole)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Loại hình</p>
            <p className="mt-0.5 font-medium">
              {detail
                ? ORGANIZATION_TYPE_LABELS[detail.type] ?? detail.type
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Thành phố</p>
            <p className="mt-0.5 font-medium">{detail?.city ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Số điện thoại</p>
            <p className="mt-0.5 font-medium">{detail?.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mã số thuế</p>
            <p className="mt-0.5 font-medium">{detail?.taxCode ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Organization ID</p>
            <code className="mt-0.5 inline-block rounded bg-muted px-1.5 py-0.5 text-xs">
              {orgId}
            </code>
          </div>
          {detail?.address ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs text-muted-foreground">Địa chỉ trụ sở</p>
              <p className="mt-0.5 font-medium">{detail.address}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <OrgMembersPanel
        organizationId={orgId}
        currentUserId={ctx.userId}
        currentUserRole={ctx.activeOrganization.memberRole}
        initialMembers={members}
      />
    </div>
  );
}
