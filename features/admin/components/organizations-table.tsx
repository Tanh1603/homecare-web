"use client";

import * as React from "react";
import Link from "next/link";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import {
  ArrowUpRight,
  Ban,
  CheckCircle2,
  Eye,
  FolderKanban,
  PauseCircle,
  Scale,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  LEGAL_ENTITY_TYPE_LABELS,
  ORGANIZATION_TYPE_LABELS,
  type Organization,
  type OrganizationStatus,
} from "@/features/organizations/contracts/organization";
import { organizationsApi } from "@/features/organizations/api";
import {
  ORG_STATUS_LABELS,
  formatOrgClassification,
  formatShortCode,
} from "@/features/admin/lib/admin-labels";
import {
  OrganizationActionDialogs,
  type OrganizationDialogState,
} from "@/features/admin/components/organization-action-dialogs";
import { DataTable } from "@/shared/ui/data-table";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ContextInspector } from "@/shared/ui/context-inspector";
import { RowActionsMenu } from "@/shared/ui/row-actions-menu";
import { cn, formatDateTime } from "@/shared/lib/utils";

type StatusFilter = "ALL" | OrganizationStatus;

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "SUSPENDED", label: "Tạm ngưng" },
  { value: "BANNED", label: "Cấm vĩnh viễn" },
  { value: "REJECTED", label: "Từ chối" },
];

export function OrganizationsTable({
  initialData,
}: {
  initialData: Organization[];
}) {
  const [rows, setRows] = React.useState<Organization[]>(initialData);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");
  const [dialog, setDialog] = React.useState<OrganizationDialogState>(null);
  const [detailTarget, setDetailTarget] = React.useState<Organization | null>(
    null
  );
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const filteredRows = React.useMemo(() => {
    if (statusFilter === "ALL") return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [rows, statusFilter]);

  function replaceRow(updated: Organization) {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setDetailTarget((prev) => (prev && prev.id === updated.id ? updated : prev));
  }

  async function handleQuickApprove(org: Organization) {
    setBusyId(org.id);
    try {
      const updated = await organizationsApi.review(org.id, {
        status: "APPROVED",
      });
      replaceRow(updated);
      toast.success(
        `Đã cập nhật trạng thái ${org.name} → ${ORG_STATUS_LABELS.APPROVED}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReactivate(org: Organization) {
    setBusyId(org.id);
    try {
      const updated = await organizationsApi.reactivate(org.id);
      replaceRow(updated);
      toast.success(`Đã kích hoạt lại "${org.name}"`);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Không thể kích hoạt lại tổ chức"
      );
    } finally {
      setBusyId(null);
    }
  }

  const columns: LegacyColumnDef<Organization, unknown>[] = [
    {
      accessorKey: "name",
      header: "Tổ chức",
      cell: ({ row }) => {
        const org = row.original;
        const typeLabel = ORGANIZATION_TYPE_LABELS[org.type] ?? org.type;
        const legalLabel = org.legalEntityType
          ? (LEGAL_ENTITY_TYPE_LABELS[org.legalEntityType] ??
            org.legalEntityType)
          : null;
        return (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/organizations/${org.id}`}
                className="group inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors"
              >
                <span className="group-hover:underline underline-offset-2">
                  {org.name}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
              <Badge variant="secondary" className="text-[11px] font-normal">
                {formatOrgClassification(typeLabel, legalLabel)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {org.taxCode ? `MST: ${org.taxCode}` : ""}
              {org.taxCode && org.city ? " · " : ""}
              {org.city || ""}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Liên hệ & Địa chỉ",
      cell: ({ row }) => (
        <div className="text-xs space-y-0.5">
          <p className="font-medium text-foreground tabular-nums">
            {row.original.phone}
          </p>
          <p className="max-w-60 truncate text-muted-foreground">
            {row.original.address || row.original.city}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.status} />
          {row.original.pendingLegalEntityUpgrade ? (
            <p className="text-[11px] font-medium text-warning">
              Chờ duyệt nâng cấp pháp nhân
            </p>
          ) : null}
          {row.original.rejectReason ? (
            <p
              className="max-w-50 truncate text-[11px] text-destructive"
              title={row.original.rejectReason}
            >
              {row.original.rejectReason}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Thao tác</span>,
      cell: ({ row }) => {
        const org = row.original;
        const disabled = busyId === org.id;
        return (
          <div className="flex justify-end">
            <RowActionsMenu
              ariaLabel={`Mở menu thao tác cho ${org.name}`}
              disabled={disabled}
              primaryAction={
                org.status === "PENDING"
                  ? {
                      label: "Duyệt",
                      icon: CheckCircle2,
                      onClick: () => handleQuickApprove(org),
                    }
                  : null
              }
              groups={[
                {
                  id: "navigation",
                  items: [
                    {
                      id: "workspace",
                      label: "Mở không gian quản lý",
                      icon: FolderKanban,
                      href: `/admin/organizations/${org.id}`,
                    },
                    {
                      id: "inspect",
                      label: "Xem nhanh hồ sơ",
                      icon: Eye,
                      onSelect: () => setDetailTarget(org),
                    },
                  ],
                },
                {
                  id: "lifecycle",
                  items: [
                    {
                      id: "approve",
                      label: "Phê duyệt hồ sơ",
                      icon: CheckCircle2,
                      hidden: org.status === "APPROVED",
                      onSelect: () => handleQuickApprove(org),
                    },
                    {
                      id: "approve-upgrade",
                      label: "Duyệt nâng cấp pháp nhân",
                      icon: ShieldCheck,
                      hidden: !org.pendingLegalEntityUpgrade,
                      onSelect: () =>
                        setDialog({ kind: "APPROVE_UPGRADE", org }),
                    },
                    {
                      id: "reactivate",
                      label: "Kích hoạt lại",
                      icon: CheckCircle2,
                      hidden: org.status !== "SUSPENDED",
                      onSelect: () => handleReactivate(org),
                    },
                    {
                      id: "appeal",
                      label: "Xử lý kháng cáo",
                      icon: Scale,
                      hidden:
                        org.status !== "SUSPENDED" && org.status !== "BANNED",
                      onSelect: () => setDialog({ kind: "APPEAL", org }),
                    },
                  ],
                },
                {
                  id: "danger",
                  items: [
                    {
                      id: "reject",
                      label: "Từ chối hồ sơ",
                      icon: XCircle,
                      destructive: true,
                      hidden: org.status !== "PENDING",
                      onSelect: () => setDialog({ kind: "REJECT", org }),
                    },
                    {
                      id: "suspend",
                      label: "Tạm ngưng hoạt động",
                      icon: PauseCircle,
                      destructive: true,
                      hidden: org.status !== "APPROVED",
                      onSelect: () => setDialog({ kind: "SUSPEND", org }),
                    },
                    {
                      id: "ban",
                      label: "Cấm vĩnh viễn",
                      icon: Ban,
                      destructive: true,
                      hidden:
                        org.status !== "APPROVED" && org.status !== "SUSPENDED",
                      onSelect: () => setDialog({ kind: "BAN", org }),
                    },
                  ],
                },
              ]}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.value === "ALL"
              ? rows.length
              : rows.filter((r) => r.status === tab.value).length;
          const active = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                active
                  ? "border-primary/30 bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              <span className="tabular-nums opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      <DataTable
        data={filteredRows}
        columns={columns}
        searchPlaceholder="Tìm tên tổ chức, MST, thành phố..."
        emptyMessage="Không có hồ sơ tổ chức nào khớp bộ lọc."
      />

      <ContextInspector
        open={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        title={`Hồ sơ tổ chức: ${detailTarget?.name ?? ""}`}
        subtitle="Xem nhanh pháp lý, liên hệ và trạng thái kiểm duyệt."
        className="max-w-lg"
        footer={
          detailTarget ? (
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailTarget(null)}
              >
                Đóng
              </Button>
              <Button size="sm" asChild>
                <Link href={`/admin/organizations/${detailTarget.id}`}>
                  <FolderKanban className="h-3.5 w-3.5" />
                  Mở không gian quản lý
                </Link>
              </Button>
            </div>
          ) : null
        }
      >
        {detailTarget ? (
          <div className="grid gap-3.5 text-sm sm:grid-cols-2">
            <div>
              <span className="text-xs text-muted-foreground">
                Lĩnh vực hoạt động
              </span>
              <p className="font-medium">
                {ORGANIZATION_TYPE_LABELS[detailTarget.type] ??
                  detailTarget.type}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">
                Loại hình pháp lý
              </span>
              <p className="font-medium">
                {detailTarget.legalEntityType
                  ? (LEGAL_ENTITY_TYPE_LABELS[detailTarget.legalEntityType] ??
                    detailTarget.legalEntityType)
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Trạng thái</span>
              <div className="mt-0.5">
                <StatusBadge status={detailTarget.status} />
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Mã số thuế</span>
              <p className="font-medium font-mono text-xs">
                {detailTarget.taxCode || "—"}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Điện thoại</span>
              <p className="font-medium tabular-nums">
                {detailTarget.phone || "—"}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Mã tổ chức</span>
              <p className="font-mono text-xs text-foreground">
                #{formatShortCode(detailTarget.id)}
              </p>
            </div>
            <div className="sm:col-span-2">
              <span className="text-xs text-muted-foreground">Địa chỉ</span>
              <p className="font-medium">
                {detailTarget.address || detailTarget.city || "—"}
                {detailTarget.address && detailTarget.city
                  ? `, ${detailTarget.city}`
                  : ""}
              </p>
            </div>
            <div className="sm:col-span-2">
              <span className="text-xs text-muted-foreground">Mô tả</span>
              <p className="font-medium whitespace-pre-wrap">
                {detailTarget.description || "—"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <span className="text-xs text-muted-foreground">
                Ngày tạo / Cập nhật
              </span>
              <p className="text-xs tabular-nums">
                {formatDateTime(detailTarget.createdAt)} ·{" "}
                {formatDateTime(detailTarget.updatedAt)}
              </p>
            </div>
            {detailTarget.rejectReason ? (
              <div className="sm:col-span-2">
                <span className="text-xs text-muted-foreground">
                  Lý do từ chối / Tạm ngưng
                </span>
                <p className="font-medium text-destructive">
                  {detailTarget.rejectReason}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </ContextInspector>

      <OrganizationActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onUpdated={replaceRow}
      />
    </div>
  );
}
