"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Package,
  ShieldAlert,
  Wrench,
  Building2,
} from "lucide-react";
import {
  LEGAL_ENTITY_TYPE_LABELS,
  ORGANIZATION_TYPE_LABELS,
  type Organization,
} from "@/features/organizations/contracts/organization";
import {
  approveOrganizationAction,
  reactivateOrganizationAction,
} from "@/features/admin/lib/org-review-actions";
import {
  OrganizationActionDialogs,
  type OrganizationDialogState,
} from "@/features/admin/components/organization-action-dialogs";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/status-badge";
import { parseUploadedMediaRefs } from "@/shared/api/media-upload";
import { cn, formatDateTime } from "@/shared/lib/utils";
import type { WorkspaceSummaryData } from "@/features/admin/api/organization-workspace.server";

interface OperationalAlert {
  id: string;
  severity: "warning" | "destructive";
  title: string;
  detail: string;
  href?: string;
  hrefLabel?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "destructive";
  };
}

export function OrganizationOverviewPanel({
  organization,
  summary,
}: {
  organization: Organization;
  summary: WorkspaceSummaryData;
}) {
  const router = useRouter();
  const [localOrg, setLocalOrg] = React.useState<{
    baseUpdatedAt: string;
    data: Organization;
  } | null>(null);
  const org =
    localOrg && localOrg.baseUpdatedAt === organization.updatedAt
      ? localOrg.data
      : organization;
  const [dialog, setDialog] = React.useState<OrganizationDialogState>(null);
  const [busy, setBusy] = React.useState(false);

  const basePath = `/admin/organizations/${org.id}`;

  function handleUpdated(updated: Organization) {
    setLocalOrg({ baseUpdatedAt: organization.updatedAt, data: updated });
    router.refresh();
  }

  async function handleQuickApprove() {
    setBusy(true);
    try {
      const updated = await approveOrganizationAction(org);
      if (updated) handleUpdated(updated);
    } finally {
      setBusy(false);
    }
  }

  async function handleReactivate() {
    setBusy(true);
    try {
      const updated = await reactivateOrganizationAction(org);
      if (updated) handleUpdated(updated);
    } finally {
      setBusy(false);
    }
  }

  const alerts: OperationalAlert[] = [];

  if (org.status === "PENDING") {
    alerts.push({
      id: "pending-review",
      severity: "warning",
      title: "Hồ sơ tổ chức đang chờ phê duyệt",
      detail:
        "Kiểm tra thông tin pháp lý, mã số thuế và địa chỉ trước khi cho phép tổ chức tiếp nhận đơn dịch vụ.",
      href: `${basePath}/profile`,
      hrefLabel: "Xem hồ sơ",
      action: {
        label: "Phê duyệt ngay",
        onClick: handleQuickApprove,
        variant: "default",
      },
    });
  }

  if (org.pendingLegalEntityUpgrade) {
    const targetLabel =
      LEGAL_ENTITY_TYPE_LABELS[org.pendingLegalEntityUpgrade] ??
      org.pendingLegalEntityUpgrade;
    alerts.push({
      id: "pending-upgrade",
      severity: "warning",
      title: `Có yêu cầu nâng cấp loại hình pháp lý sang ${targetLabel}`,
      detail:
        "Tổ chức đã gửi yêu cầu chuyển đổi pháp nhân và đang chờ quản trị viên xác minh phê duyệt.",
      href: `${basePath}/profile`,
      hrefLabel: "Xem chi tiết",
      action: {
        label: "Duyệt nâng cấp",
        onClick: () => setDialog({ kind: "APPROVE_UPGRADE", org }),
        variant: "outline",
      },
    });
  }

  if (org.status === "SUSPENDED") {
    alerts.push({
      id: "suspended",
      severity: "destructive",
      title: "Tổ chức đang bị tạm ngưng hoạt động",
      detail:
        org.rejectReason ||
        "Tổ chức không thể tiếp nhận yêu cầu mới cho đến khi được kích hoạt lại hoặc chấp thuận kháng cáo.",
      action: {
        label: "Kích hoạt lại",
        onClick: handleReactivate,
        variant: "outline",
      },
    });
  }

  if (org.status === "BANNED") {
    alerts.push({
      id: "banned",
      severity: "destructive",
      title: "Tổ chức đang bị cấm vĩnh viễn",
      detail:
        org.rejectReason ||
        "Mọi hoạt động cung cấp dịch vụ và bán hàng đã bị khóa. Kháng cáo cần quản trị viên khác duyệt.",
      action: {
        label: "Xử lý kháng cáo",
        onClick: () => setDialog({ kind: "APPEAL", org }),
        variant: "outline",
      },
    });
  }

  if (
    !summary.services.error &&
    summary.services.withoutCoverage > 0
  ) {
    alerts.push({
      id: "missing-coverage",
      severity: "warning",
      title: `${summary.services.withoutCoverage} dịch vụ đang bật chưa cấu hình khu vực phủ sóng`,
      detail:
        "Các dịch vụ chưa gán khu vực tỉnh/phường sẽ không được ghép tự động với yêu cầu của khách hàng.",
      href: `${basePath}/coverage`,
      hrefLabel: "Xem khu vực phủ sóng",
    });
  }

  if (
    (org.type === "SERVICE" || org.type === "BOTH") &&
    !summary.technicians.error &&
    summary.technicians.active === 0
  ) {
    alerts.push({
      id: "no-active-tech",
      severity: "warning",
      title: "Chưa có kỹ thuật viên đang hoạt động",
      detail:
        "Tổ chức cung cấp dịch vụ cần ít nhất một kỹ thuật viên sẵn sàng để nhận điều phối lịch hẹn.",
      href: `${basePath}/technicians`,
      hrefLabel: "Mở danh sách KTV",
    });
  }

  if (!summary.products.error && summary.products.outOfStock > 0) {
    alerts.push({
      id: "out-of-stock",
      severity: "warning",
      title: `${summary.products.outOfStock} sản phẩm đang bán đã hết tồn kho khả dụng`,
      detail:
        "Kiểm tra tồn kho các mặt hàng đang kích hoạt để tránh gián đoạn đơn đặt linh kiện.",
      href: `${basePath}/products`,
      hrefLabel: "Kiểm tra sản phẩm",
    });
  }

  const uploadedDocsCount = parseUploadedMediaRefs(org.identityEvidenceRefs).length;
  const partialErrors = [
    summary.technicians.error,
    summary.services.error,
    summary.products.error,
  ].filter(Boolean) as string[];

  const kpis = [
    {
      id: "technicians",
      label: "Kỹ thuật viên",
      value: summary.technicians.error
        ? "—"
        : `${summary.technicians.active} / ${summary.technicians.total}`,
      sub: summary.technicians.error
        ? "Chưa tải được"
        : "Đang hoạt động / Tổng số",
      href: `${basePath}/technicians`,
      icon: Wrench,
    },
    {
      id: "services",
      label: "Dịch vụ cung cấp",
      value: summary.services.error
        ? "—"
        : `${summary.services.active} / ${summary.services.total}`,
      sub: summary.services.error ? "Chưa tải được" : "Đang mở / Tổng số",
      href: `${basePath}/services`,
      icon: Building2,
    },
    {
      id: "products",
      label: "Sản phẩm kinh doanh",
      value: summary.products.error
        ? "—"
        : `${summary.products.active} / ${summary.products.total}`,
      sub: summary.products.error
        ? "Chưa tải được"
        : summary.products.outOfStock > 0
          ? `${summary.products.outOfStock} sản phẩm hết hàng`
          : "Đang mở bán / Tổng số",
      href: `${basePath}/products`,
      icon: Package,
    },
    {
      id: "coverage",
      label: "Khu vực phủ sóng",
      value: summary.coverage.error
        ? "—"
        : `${summary.coverage.uniqueProvinces + summary.coverage.uniqueWards}`,
      sub: summary.coverage.error
        ? "Chưa tải được"
        : `${summary.coverage.uniqueProvinces} tỉnh · ${summary.coverage.uniqueWards} phường/xã`,
      href: `${basePath}/coverage`,
      icon: MapPin,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Operational Alerts & Action Queue */}
      <section aria-labelledby="org-alerts-heading" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2
            id="org-alerts-heading"
            className="text-sm font-semibold text-foreground"
          >
            Việc cần xử lý & Cảnh báo vận hành
          </h2>
          {alerts.length > 0 ? (
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {alerts.length} mục cần chú ý
            </span>
          ) : null}
        </div>

        {alerts.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <span>
              Không có cảnh báo tồn đọng. Hồ sơ và vận hành của tổ chức đang ổn
              định.
            </span>
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {alerts.map((alert) => {
              const Icon =
                alert.severity === "destructive" ? ShieldAlert : AlertTriangle;
              return (
                <div
                  key={alert.id}
                  className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <Icon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        alert.severity === "destructive"
                          ? "text-destructive"
                          : "text-warning"
                      )}
                    />
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium text-foreground">
                        {alert.title}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {alert.detail}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:pl-4">
                    {alert.href && alert.hrefLabel ? (
                      <Button variant="ghost" size="sm" asChild className="h-8 text-xs">
                        <Link href={alert.href}>
                          {alert.hrefLabel}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    ) : null}
                    {alert.action ? (
                      <Button
                        type="button"
                        size="sm"
                        variant={alert.action.variant ?? "outline"}
                        disabled={busy}
                        onClick={alert.action.onClick}
                        className="h-8 text-xs"
                      >
                        {alert.action.label}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {partialErrors.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Lưu ý: Một số chỉ số chưa tải đầy đủ từ máy chủ ({partialErrors[0]}).
          </p>
        ) : null}
      </section>

      {/* 2. Operational KPI Strip */}
      <section aria-label="Chỉ số vận hành">
        <div className="grid grid-cols-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Link
                key={kpi.id}
                href={kpi.href}
                className="group flex flex-col justify-between gap-2 p-4 transition-colors duration-150 hover:bg-surface-secondary"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {kpi.label}
                  </span>
                  <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xl font-semibold tracking-tight text-foreground tabular-nums">
                    {kpi.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Concise Legal & Verification Summary */}
      <section className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            Tóm tắt hồ sơ & kiểm duyệt
          </h2>
          <Link
            href={`${basePath}/profile`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-2"
          >
            Xem đầy đủ hồ sơ
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <dl className="grid gap-x-6 gap-y-4 p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Lĩnh vực hoạt động</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {ORGANIZATION_TYPE_LABELS[org.type] ?? org.type}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Loại hình pháp lý</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {org.legalEntityType
                ? (LEGAL_ENTITY_TYPE_LABELS[org.legalEntityType] ??
                  org.legalEntityType)
                : "Chưa cập nhật"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Trạng thái hiện tại</dt>
            <dd className="mt-1">
              <StatusBadge status={org.status} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Xác minh định danh</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {org.identityVerified ? "Đã xác minh" : "Chưa xác minh"}
              {typeof org.resubmitCount === "number" && org.resubmitCount > 0
                ? ` · Đã nộp lại ${org.resubmitCount} lần`
                : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Tài liệu pháp lý</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {uploadedDocsCount > 0 ? (
                <Link
                  href={`${basePath}/profile`}
                  className="text-primary hover:underline underline-offset-2 tabular-nums"
                >
                  {uploadedDocsCount} tài liệu đã nộp
                </Link>
              ) : org.identityEvidenceRefs?.trim() ? (
                <Link
                  href={`${basePath}/profile`}
                  className="text-primary hover:underline underline-offset-2"
                >
                  Đã đính kèm tài liệu
                </Link>
              ) : (
                <span className="text-muted-foreground">Chưa có tài liệu</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Địa chỉ hoạt động</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {org.address || org.city || "—"}
              {org.address && org.city ? `, ${org.city}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              Thời điểm tạo / Cập nhật
            </dt>
            <dd className="mt-0.5 text-xs text-foreground tabular-nums">
              {formatDateTime(org.createdAt)} · {formatDateTime(org.updatedAt)}
            </dd>
          </div>
        </dl>
      </section>

      <OrganizationActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
