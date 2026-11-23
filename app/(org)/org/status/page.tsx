import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Clock, XCircle } from "lucide-react";
import { requireOrgContext } from "@/shared/auth/guards";
import { organizationsServerApi } from "@/features/organizations/api/organizations.server";
import { OrgAppealForm } from "@/features/organizations/components/org-appeal-form";
import { OrgResubmitForm } from "@/features/organizations/components/org-resubmit-form";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Button } from "@/shared/ui/button";

export default async function OrgStatusPage() {
  const ctx = await requireOrgContext();
  const org = ctx.activeOrganization;

  if (org.organizationStatus === "APPROVED") {
    redirect("/org");
  }

  const isPending = org.organizationStatus === "PENDING";
  const isRejected = org.organizationStatus === "REJECTED";
  const reason = org.rejectReason ?? org.rejectionReason;
  const orgDetail =
    isRejected && org.memberRole === "ORG_OWNER"
      ? await organizationsServerApi.getDetail(org.organizationId).catch(() => null)
      : null;

  return (
    <div className="mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning-bg text-warning">
              {isPending ? (
                <Clock className="h-5 w-5" />
              ) : isRejected ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
            </div>
            <StatusBadge status={org.organizationStatus} />
          </div>
          <CardTitle className="text-xl">{org.organizationName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPending ? (
            <p className="text-sm text-muted-foreground">
              Hồ sơ đăng ký tổ chức của bạn đang được quản trị viên HomeCare xem
              xét. Sau khi được phê duyệt (<strong>APPROVED</strong>), backend sẽ
              cấp quyền <strong>ORGANIZATION</strong> để bạn mở khóa đầy đủ chức
              năng điều phối và kinh doanh.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Tổ chức hiện đang ở trạng thái{" "}
                <strong>{org.organizationStatus}</strong> và tạm thời chưa thể
                truy cập các chức năng vận hành.
              </p>
              {reason ? (
                <Alert variant="destructive">
                  <AlertDescription>Lý do: {reason}</AlertDescription>
                </Alert>
              ) : null}
              {isRejected && org.memberRole === "ORG_OWNER" && orgDetail ? (
                <OrgResubmitForm organization={orgDetail} />
              ) : null}
              {(org.organizationStatus === "SUSPENDED" ||
                org.organizationStatus === "BANNED") &&
              org.memberRole === "ORG_OWNER" ? (
                <OrgAppealForm organizationId={org.organizationId} />
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild variant="outline">
              <Link href="/register/org">Nộp hồ sơ tổ chức khác</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/">Về trang chủ</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
