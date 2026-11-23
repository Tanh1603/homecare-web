import type { ReactNode } from "react";
import { requireOrgContext } from "@/shared/auth/guards";
import { OrgShell } from "@/features/organizations/components/org-shell";

export default async function OrgLayout({ children }: { children: ReactNode }) {
  const ctx = await requireOrgContext();
  return (
    <OrgShell
      userEmail={ctx.email}
      memberships={ctx.memberships}
      activeOrganization={ctx.activeOrganization}
    >
      {children}
    </OrgShell>
  );
}
