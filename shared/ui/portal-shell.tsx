"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  LogOut,
  Menu,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "./button";
import { createSupabaseBrowserClient } from "@/shared/lib/supabase/client";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function PortalShell({
  portalTitle,
  portalBadge,
  userEmail,
  navItems,
  headerSlot,
  children,
}: {
  portalTitle: string;
  portalBadge: string;
  userEmail: string;
  navItems: NavItem[];
  headerSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  async function handleSignOut() {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore in mock mode when Supabase env is not configured
    }
    router.push("/login");
    router.refresh();
  }

  const navContent = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Sidebar">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.href !== "/admin" &&
            item.href !== "/org" &&
            pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-card">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            {portalBadge === "ADMIN" ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{portalTitle}</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {portalBadge}
            </p>
          </div>
        </div>
        {navContent}
        <div className="border-t border-border p-3">
          <div className="mb-2 truncate px-2 text-xs text-muted-foreground">
            {userEmail}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex w-64 flex-col bg-card border-r border-border">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="text-sm font-semibold">{portalTitle}</span>
              <button
                type="button"
                aria-label="Đóng menu"
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary cursor-pointer"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      ) : null}

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/90 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Mở menu"
              className="rounded-md p-2 text-muted-foreground hover:bg-secondary lg:hidden cursor-pointer"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            {headerSlot}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              href={portalBadge === "ADMIN" ? "/org" : "/admin"}
              className="rounded-md border border-border px-2.5 py-1.5 font-medium text-foreground hover:bg-secondary transition-colors"
            >
              {portalBadge === "ADMIN" ? "Sang Org Portal" : "Sang Admin Portal"}
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
