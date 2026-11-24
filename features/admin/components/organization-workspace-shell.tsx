"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Ban,
  Building2,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  MapPin,
  Package,
  PauseCircle,
  Scale,
  ShieldCheck,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  LEGAL_ENTITY_TYPE_LABELS,
  ORGANIZATION_TYPE_LABELS,
  type Organization,
} from "@/features/organizations/contracts/organization";
import { formatOrgClassification } from "@/features/admin/lib/admin-labels";
import {
  approveOrganizationAction,
  reactivateOrganizationAction,
} from "@/features/admin/lib/org-review-actions";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import {
  OrganizationActionDialogs,
  type OrganizationDialogState,
} from "@/features/admin/components/organization-action-dialogs";
import { StatusBadge } from "@/shared/ui/status-badge";
import {
  usePortalBreadcrumb,
  type BreadcrumbSegment,
} from "@/shared/ui/portal-shell";
import {
  RowActionsMenu,
  type RowPrimaryAction,
} from "@/shared/ui/row-actions-menu";
import { cn } from "@/shared/lib/utils";

export interface WorkspaceNavCounts {
  technicians?: number;
  services?: number;
  products?: number;
  coverage?: number;
}

interface SecondaryNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  count?: number;
}

export function OrganizationWorkspaceShell({
  initialOrganization,
  counts,
  children,
}: {
  initialOrganization: Organization;
  counts?: WorkspaceNavCounts;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [localOrg, setLocalOrg] = React.useState<{
    baseUpdatedAt: string;
    data: Organization;
  } | null>(null);
  const org =
    localOrg && localOrg.baseUpdatedAt === initialOrganization.updatedAt
      ? localOrg.data
      : initialOrganization;
  const [dialog, setDialog] = React.useState<OrganizationDialogState>(null);
  const [busy, setBusy] = React.useState(false);

  const basePath = `/admin/organizations/${org.id}`;

  const navItems: SecondaryNavItem[] = React.useMemo(
    () => [
      {
        id: "overview",
        label: "Tổng quan",
        href: basePath,
        icon: LayoutDashboard,
        exact: true,
      },
      {
        id: "profile",
        label: "Hồ sơ pháp lý",
        href: `${basePath}/profile`,
        icon: FileText,
      },
      {
        id: "technicians",
        label: "Kỹ thuật viên",
        href: `${basePath}/technicians`,
        icon: Wrench,
        count: counts?.technicians,
      },
      {
        id: "services",
        label: "Dịch vụ cung cấp",
        href: `${basePath}/services`,
        icon: Building2,
        count: counts?.services,
      },
      {
        id: "products",
        label: "Sản phẩm kinh doanh",
        href: `${basePath}/products`,
        icon: Package,
        count: counts?.products,
      },
      {
        id: "coverage",
        label: "Khu vực phủ sóng",
        href: `${basePath}/coverage`,
        icon: MapPin,
        count: counts?.coverage,
      },
    ],
    [basePath, counts]
  );

  const activeNavItem = React.useMemo(() => {
    const matched = navItems.find((item) =>
      item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
    return matched ?? navItems[0];
  }, [navItems, pathname]);

  const activeNavHref = activeNavItem?.href ?? basePath;

  const breadcrumbTrail = React.useMemo<BreadcrumbSegment[]>(() => {
    const segments: BreadcrumbSegment[] = [
      { label: "Tổ chức đối tác", href: "/admin/organizations" },
    ];
    if (activeNavItem && activeNavItem.id !== "overview") {
      segments.push({ label: org.name, href: basePath });
      segments.push({ label: activeNavItem.label });
    } else {
      segments.push({ label: org.name });
    }
    return segments;
  }, [activeNavItem, basePath, org.name]);

  usePortalBreadcrumb(breadcrumbTrail);

  function handleUpdated(updated: Organization) {
    setLocalOrg({ baseUpdatedAt: initialOrganization.updatedAt, data: updated });
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

  const primaryAction: RowPrimaryAction | null = React.useMemo(() => {
    if (org.status === "PENDING") {
      return {
        label: "Phê duyệt",
        icon: CheckCircle2,
        variant: "default",
        onClick: handleQuickApprove,
      };
    }
    if (org.pendingLegalEntityUpgrade) {
      return {
        label: "Duyệt nâng cấp",
        icon: ShieldCheck,
        variant: "default",
        onClick: () => setDialog({ kind: "APPROVE_UPGRADE", org }),
      };
    }
    if (org.status === "SUSPENDED") {
      return {
        label: "Kích hoạt lại",
        icon: CheckCircle2,
        variant: "outline",
        onClick: handleReactivate,
      };
    }
    if (org.status === "BANNED") {
      return {
        label: "Xử lý kháng cáo",
        icon: Scale,
        variant: "outline",
        onClick: () => setDialog({ kind: "APPEAL", org }),
      };
    }
    if (org.status === "REJECTED") {
      return {
        label: "Phê duyệt lại",
        icon: CheckCircle2,
        variant: "outline",
        onClick: handleQuickApprove,
      };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org]);

  const classificationLabel = formatOrgClassification(
    ORGANIZATION_TYPE_LABELS[org.type] ?? org.type,
    org.legalEntityType
      ? (LEGAL_ENTITY_TYPE_LABELS[org.legalEntityType] ?? org.legalEntityType)
      : null
  );

  return (
    <div className="space-y-5">
      {/* Compact Organization Header */}
      <header className="rounded-xl border border-border bg-surface px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg font-semibold tracking-tight text-foreground truncate">
                {org.name}
              </h1>
              <StatusBadge status={org.status} />
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
              <span className="text-foreground/80">{classificationLabel}</span>
              {org.taxCode ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    MST:{" "}
                    <span className="font-mono text-foreground">
                      {org.taxCode}
                    </span>
                  </span>
                </>
              ) : null}
              {org.city ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{org.city}</span>
                </>
              ) : null}
              {org.phone ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{org.phone}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="shrink-0">
            <RowActionsMenu
              ariaLabel={`Thao tác quản trị cho ${org.name}`}
              disabled={busy}
              primaryAction={primaryAction}
              groups={[
                {
                  id: "lifecycle",
                  items: [
                    {
                      id: "approve",
                      label: "Phê duyệt hồ sơ",
                      icon: CheckCircle2,
                      hidden: org.status === "APPROVED",
                      onSelect: handleQuickApprove,
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
                      onSelect: handleReactivate,
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
        </div>
      </header>

      {/* Mobile / Tablet Secondary Navigation */}
      <div className="lg:hidden">
        <label htmlFor="org-workspace-section" className="sr-only">
          Chọn phân mục trong không gian tổ chức
        </label>
        <NativeSelect
          id="org-workspace-section"
          value={activeNavHref}
          onChange={(e) => router.push(e.target.value)}
          className="h-10 font-medium"
        >
          {navItems.map((item) => (
            <NativeSelectOption key={item.id} value={item.href}>
              {item.label}
              {typeof item.count === "number" ? ` (${item.count})` : ""}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {/* Desktop Two-Level Body: Secondary Vertical Nav + Main Content */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[208px_minmax(0,1fr)]">
        <aside
          aria-label="Điều hướng phân mục tổ chức"
          className="hidden lg:block lg:sticky lg:top-20"
        >
          <nav className="rounded-xl border border-border bg-surface p-2 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeNavHref === item.href;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors duration-150",
                    active
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "text-muted-foreground font-medium hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {typeof item.count === "number" ? (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                        active
                          ? "bg-primary/10 text-accent-foreground"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {item.count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0">{children}</section>
      </div>

      <OrganizationActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
