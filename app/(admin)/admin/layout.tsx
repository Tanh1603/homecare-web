import { Suspense, type ReactNode } from "react";
import { requireAdmin } from "@/shared/auth/guards";
import { AdminShell } from "@/features/admin/components/admin-shell";

async function AdminGuard({ children }: { children: ReactNode }) {
  const ctx = await requireAdmin();
  return <AdminShell userEmail={ctx.email}>{children}</AdminShell>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
          Đang tải Admin Portal...
        </div>
      }
    >
      <AdminGuard>{children}</AdminGuard>
    </Suspense>
  );
}
