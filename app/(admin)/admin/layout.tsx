import type { ReactNode } from "react";
import { requireAdmin } from "@/shared/auth/guards";
import { AdminShell } from "@/features/admin/components/admin-shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const ctx = await requireAdmin();
  return <AdminShell userEmail={ctx.email}>{children}</AdminShell>;
}
