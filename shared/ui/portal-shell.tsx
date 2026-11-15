"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
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

function getInitials(email: string): string {
  const local = email.split("@")[0] ?? "HC";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || "HC";
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
      // Ignore if client session is already cleared
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
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
              active
                ? "bg-accent text-accent-foreground font-semibold"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const accountFooter = (
    <div className="border-t border-border p-3 space-y-2.5">
      <div className="flex items-center gap-2.5 rounded-lg bg-secondary/60 px-2.5 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
          {getInitials(userEmail)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">
            {userEmail}
          </p>
          <p className="text-[11px] text-muted-foreground">{portalBadge}</p>
        </div>
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
  );

  const brandHeader = (
    <Link
      href="/"
      className="flex h-16 items-center gap-3 border-b border-border px-5 transition-colors hover:bg-secondary/40"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
        {portalBadge === "ADMIN" ? (
          <ShieldCheck className="h-4 w-4" />
        ) : (
          <Building2 className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-tight text-foreground">
          {portalTitle}
        </p>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {portalBadge}
        </p>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-border lg:bg-card">
        {brandHeader}
        {navContent}
        {accountFooter}
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
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary cursor-pointer"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {navContent}
            {accountFooter}
          </aside>
        </div>
      ) : null}

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/95 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
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
          <div className="flex items-center gap-2 shrink-0 text-xs">
            <Link
              href={portalBadge === "ADMIN" ? "/org" : "/admin"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
              {portalBadge === "ADMIN" ? "Org Portal" : "Admin Portal"}
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
