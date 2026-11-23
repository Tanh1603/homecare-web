import {
  LEGAL_ENTITY_TYPE_LABELS,
  ORGANIZATION_TYPE_LABELS,
} from "@/features/organizations/contracts/organization";
import { organizationWorkspaceServerApi } from "@/features/admin/api/organization-workspace.server";
import { AdminQualificationsPanel } from "@/features/admin/components/admin-qualifications-panel";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { ErrorState } from "@/shared/ui/error-state";
import { EvidenceDocumentsList } from "@/shared/ui/evidence-documents-list";
import { StatusBadge } from "@/shared/ui/status-badge";
import { formatDateTime } from "@/shared/lib/utils";

export default async function AdminOrganizationProfilePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const { organization: org, errorMessage } =
    await organizationWorkspaceServerApi.getDetail(orgId);

  if (!org) {
    return (
      <ErrorState
        title="Không thể tải hồ sơ pháp lý"
        message={errorMessage ?? undefined}
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">
            Thông tin pháp lý & định danh
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Hồ sơ đăng ký đối tác, tư cách pháp nhân và tình trạng kiểm duyệt
            hiện tại.
          </p>
        </div>

        <dl className="grid gap-x-6 gap-y-4 p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Tên tổ chức</dt>
            <dd className="mt-0.5 font-medium text-foreground">{org.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Trạng thái duyệt</dt>
            <dd className="mt-1">
              <StatusBadge status={org.status} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Lĩnh vực hoạt động</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {ORGANIZATION_TYPE_LABELS[org.type] ?? org.type}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Loại hình pháp lý</dt>
            <dd className="mt-0.5 flex flex-wrap items-center gap-2 font-medium text-foreground">
              <span>
                {org.legalEntityType
                  ? (LEGAL_ENTITY_TYPE_LABELS[org.legalEntityType] ??
                    org.legalEntityType)
                  : "Chưa cập nhật"}
              </span>
              {org.pendingLegalEntityUpgrade ? (
                <Badge variant="warning" className="text-[11px]">
                  Chờ nâng cấp:{" "}
                  {LEGAL_ENTITY_TYPE_LABELS[org.pendingLegalEntityUpgrade] ??
                    org.pendingLegalEntityUpgrade}
                </Badge>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Mã số thuế</dt>
            <dd className="mt-0.5 font-mono text-xs font-medium text-foreground">
              {org.taxCode || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              Xác minh định danh
            </dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {org.identityVerified ? "Đã xác minh" : "Chưa xác minh"}
              {typeof org.resubmitCount === "number"
                ? ` · Số lần nộp lại hồ sơ: ${org.resubmitCount}`
                : ""}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">
            Tài liệu chứng minh pháp lý
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tài liệu đính kèm khi đăng ký, nộp lại hồ sơ hoặc yêu cầu nâng cấp
            loại hình pháp lý.
          </p>
        </div>
        <div className="p-5">
          <EvidenceDocumentsList
            value={org.identityEvidenceRefs}
            organizationId={org.id}
          />
        </div>
      </section>

      <AdminQualificationsPanel organizationId={org.id} />

      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">
            Liên hệ, địa chỉ & mô tả
          </h2>
        </div>

        <dl className="grid gap-x-6 gap-y-4 p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Số điện thoại</dt>
            <dd className="mt-0.5 font-medium tabular-nums text-foreground">
              {org.phone || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Tỉnh / Thành phố</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {org.city || "—"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Địa chỉ trụ sở</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {org.address || org.city || "—"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Giới thiệu</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-foreground">
              {org.description || "Chưa có mô tả chi tiết."}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Ngày tạo hồ sơ</dt>
            <dd className="mt-0.5 text-xs tabular-nums text-foreground">
              {formatDateTime(org.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Cập nhật gần nhất</dt>
            <dd className="mt-0.5 text-xs tabular-nums text-foreground">
              {formatDateTime(org.updatedAt)}
            </dd>
          </div>
          {org.rejectReason ? (
            <Alert variant="destructive" className="sm:col-span-2">
              <AlertTitle className="text-xs">
                Lý do từ chối / Tạm ngưng / Chế tài gần nhất
              </AlertTitle>
              <AlertDescription className="text-foreground">
                {org.rejectReason}
              </AlertDescription>
            </Alert>
          ) : null}
        </dl>
      </section>
    </div>
  );
}
