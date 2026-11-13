"use client";

import type { ReactNode } from "react";
import {
  Building2,
  FileText,
  FolderTree,
  LayoutDashboard,
  Users,
  Wrench,
} from "lucide-react";
import { PortalShell, type NavItem } from "@/shared/ui/portal-shell";

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/organizations", label: "Tổ chức đối tác", icon: Building2 },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/technicians", label: "Kỹ thuật viên", icon: Wrench },
  { href: "/admin/catalog", label: "Danh mục", icon: FolderTree },
  { href: "/admin/content", label: "Nội dung", icon: FileText },
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
      portalBadge="ADMIN"
      userEmail={userEmail}
      navItems={ADMIN_NAV}
    >
      {children}
    </PortalShell>
  );
}
