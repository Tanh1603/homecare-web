import { redirect } from "next/navigation";
import { requireOrgContext } from "@/shared/auth/guards";
import { PageHeader } from "@/shared/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { StatusBadge } from "@/shared/ui/status-badge";

export default async function OrgSettingsPage() {
  const ctx = await requireOrgContext();
  if (ctx.activeOrganization.organizationStatus !== "APPROVED") {
    redirect("/org/status");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cài đặt tổ chức"
        description="Thông tin tổ chức hiện tại và thành viên trong organization_members."
      />
      <Card>
        <CardHeader>
          <CardTitle>{ctx.activeOrganization.organizationName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Trạng thái:</span>
            <StatusBadge status={ctx.activeOrganization.organizationStatus} />
          </div>
          <p>
            <span className="text-muted-foreground">Vai trò của bạn:</span>{" "}
            <strong>{ctx.activeOrganization.memberRole}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">Organization ID:</span>{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {ctx.activeOrganization.organizationId}
            </code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
