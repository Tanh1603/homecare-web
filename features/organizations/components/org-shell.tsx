"use client";

import type { ReactNode } from "react";
import {
  CalendarCheck,
  LayoutDashboard,
  Package,
  RotateCcw,
  Settings,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import { PortalShell, type NavGroup } from "@/shared/ui/portal-shell";
import type { OrganizationMembership } from "../contracts/organization";
import { OrgSwitcher } from "./org-switcher";

const ORG_NAV_GROUPS: NavGroup[] = [
  {
    id: "operations",
    label: "Vận hành hàng ngày",
    icon: CalendarCheck,
    defaultHref: "/org",
    items: [
      { href: "/org", label: "Tổng quan", icon: LayoutDashboard },
      { href: "/org/bookings", label: "Đặt lịch dịch vụ", icon: CalendarCheck },
      { href: "/org/orders", label: "Đơn hàng linh kiện", icon: Package },
      { href: "/org/returns", label: "Trả hàng / Hoàn tiền", icon: RotateCcw },
    ],
  },
  {
    id: "resources",
    label: "Dịch vụ & Bảo hành",
    icon: Wrench,
    defaultHref: "/org/technicians",
    items: [
      { href: "/org/technicians", label: "Kỹ thuật viên", icon: Users },
      { href: "/org/services", label: "Dịch vụ cung cấp", icon: Wrench },
      { href: "/org/warranties", label: "Bảo hành điện tử", icon: ShieldCheck },
    ],
  },
  {
    id: "organization",
    label: "Tổ chức",
    icon: Settings,
    defaultHref: "/org/settings",
    items: [{ href: "/org/settings", label: "Cài đặt tổ chức", icon: Settings }],
  },
];

export function OrgShell({
  userEmail,
  memberships,
  activeOrganization,
  children,
}: {
  userEmail: string;
  memberships: OrganizationMembership[];
  activeOrganization: OrganizationMembership;
  children: ReactNode;
}) {
  return (
    <PortalShell
      portalTitle="HomeCare Partner"
      portalBadge="ORGANIZATION"
      userEmail={userEmail}
      navGroups={ORG_NAV_GROUPS}
      headerSlot={
        <OrgSwitcher
          memberships={memberships}
          activeOrganization={activeOrganization}
        />
      }
    >
      {children}
    </PortalShell>
  );
}
