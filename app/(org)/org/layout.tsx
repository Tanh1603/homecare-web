import { Suspense, type ReactNode } from "react";
import { requireOrgContext } from "@/shared/auth/guards";
import { OrgShell } from "@/features/organizations/components/org-shell";

async function OrgGuard({ children }: { children: ReactNode }) {
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

export default function OrgLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
          Đang tải Organization Portal...
        </div>
      }
    >
      <OrgGuard>{children}</OrgGuard>
    </Suspense>
  );
}
