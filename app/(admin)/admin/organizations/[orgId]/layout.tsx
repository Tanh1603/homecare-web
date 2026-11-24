import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Building2, ShieldAlert } from "lucide-react";
import { organizationWorkspaceServerApi } from "@/features/admin/api/organization-workspace.server";
import { OrganizationWorkspaceShell } from "@/features/admin/components/organization-workspace-shell";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";

export default async function AdminOrganizationWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const { organization, errorStatus, errorMessage } =
    await organizationWorkspaceServerApi.getDetail(orgId);

  if (!organization) {
    if (errorStatus === 401 || errorStatus === 403) {
      return (
        <div className="space-y-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/organizations">
              <ArrowLeft className="h-3.5 w-3.5" />
              Quay lại danh sách tổ chức
            </Link>
          </Button>
          <EmptyState
            icon={ShieldAlert}
            title="Không đủ quyền truy cập tổ chức này"
            description={
              errorMessage ||
              "Tài khoản hiện tại không có quyền xem hoặc quản trị hồ sơ tổ chức đối tác này."
            }
          />
        </div>
      );
    }

    if (errorStatus === 404) {
      return (
        <div className="space-y-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/organizations">
              <ArrowLeft className="h-3.5 w-3.5" />
              Quay lại danh sách tổ chức
            </Link>
          </Button>
          <EmptyState
            icon={Building2}
            title="Không tìm thấy tổ chức đối tác"
            description="Tổ chức có thể đã bị xóa hoặc mã định danh không tồn tại trong hệ thống."
          />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/organizations">
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại danh sách tổ chức
          </Link>
        </Button>
        <ErrorState
          title="Không thể tải không gian tổ chức"
          message={errorMessage ?? undefined}
        />
      </div>
    );
  }

  const summary =
    await organizationWorkspaceServerApi.getWorkspaceSummary(orgId);

  return (
    <OrganizationWorkspaceShell
      initialOrganization={organization}
      counts={{
        technicians: summary.technicians.error
          ? undefined
          : summary.technicians.total,
        services: summary.services.error ? undefined : summary.services.total,
        products: summary.products.error ? undefined : summary.products.total,
        coverage: summary.coverage.error
          ? undefined
          : summary.coverage.uniqueProvinces + summary.coverage.uniqueWards,
      }}
    >
      {children}
    </OrganizationWorkspaceShell>
  );
}
