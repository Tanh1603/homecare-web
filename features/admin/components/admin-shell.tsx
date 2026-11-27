"use client";

import type { ReactNode } from "react";
import {
  Building2,
  FolderTree,
  LayoutDashboard,
  Scale,
  SlidersHorizontal,
  Users,
  Wrench,
} from "lucide-react";
import { PortalShell, type NavGroup } from "@/shared/ui/portal-shell";

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Tổng quan",
    icon: LayoutDashboard,
    defaultHref: "/admin",
    items: [{ href: "/admin", label: "Tổng quan", icon: LayoutDashboard }],
  },
  {
    id: "partners",
    label: "Đối tác & Nhân sự",
    icon: Building2,
    defaultHref: "/admin/organizations",
    items: [
      {
        href: "/admin/organizations",
        label: "Tổ chức đối tác",
        icon: Building2,
      },
      { href: "/admin/users", label: "Người dùng", icon: Users },
      { href: "/admin/technicians", label: "Kỹ thuật viên", icon: Wrench },
    ],
  },
  {
    id: "platform",
    label: "Danh mục & Hệ thống",
    icon: FolderTree,
    defaultHref: "/admin/catalog",
    items: [
      { href: "/admin/catalog", label: "Dịch vụ & Sản phẩm", icon: FolderTree },
      { href: "/admin/disputes", label: "Tranh chấp & SLA", icon: Scale },
      {
        href: "/admin/governance",
        label: "Cấu hình quản trị",
        icon: SlidersHorizontal,
      },
    ],
  },
];

export function AdminShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: ReactNode;
}) {
  return (
    <PortalShell
      portalTitle="HomeCare Admin"
      portalBadge="Admin"
      userEmail={userEmail}
      navGroups={ADMIN_NAV_GROUPS}
    >
      {children}
    </PortalShell>
  );
}
