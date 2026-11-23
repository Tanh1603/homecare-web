"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "./button";
import { ThemeToggle } from "./theme-toggle";
import { createSupabaseBrowserClient } from "@/shared/lib/supabase/client";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  defaultHref: string;
  items: NavItem[];
}

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface PortalBreadcrumbContextValue {
  setTrail: (trail: BreadcrumbSegment[] | null) => void;
}

const PortalBreadcrumbContext =
  React.createContext<PortalBreadcrumbContextValue | null>(null);

export function usePortalBreadcrumb(trail: BreadcrumbSegment[] | null) {
  const ctx = React.useContext(PortalBreadcrumbContext);
  React.useEffect(() => {
    if (!ctx) return;
    ctx.setTrail(trail);
    return () => ctx.setTrail(null);
  }, [ctx, trail]);
}

function getInitials(email: string): string {
  const local = email.split("@")[0] ?? "HC";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || "HC";
}

function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href !== "/admin" && href !== "/org") {
    return pathname.startsWith(`${href}/`);
  }
  return false;
}

export function PortalShell({
  portalTitle,
  portalBadge,
  userEmail,
  navItems,
  navGroups,
  headerSlot,
  children,
}: {
  portalTitle: string;
  portalBadge: string;
  userEmail: string;
  navItems?: NavItem[];
  navGroups?: NavGroup[];
  headerSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [openForPathname, setOpenForPathname] = React.useState<string | null>(
    null
  );
  const mobileOpen = openForPathname === pathname;
  const setMobileOpen = React.useCallback(
    (next: boolean) => setOpenForPathname(next ? pathname : null),
    [pathname]
  );
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [customTrail, setCustomTrail] = React.useState<
    BreadcrumbSegment[] | null
  >(null);
  const breadcrumbCtxValue = React.useMemo(
    () => ({ setTrail: setCustomTrail }),
    []
  );

  const groups: NavGroup[] = React.useMemo(() => {
    if (navGroups && navGroups.length > 0) return navGroups;
    const flat = navItems ?? [];
    if (flat.length === 0) return [];
    return [
      {
        id: "default",
        label: portalTitle,
        icon: flat[0].icon,
        defaultHref: flat[0].href,
        items: flat,
      },
    ];
  }, [navGroups, navItems, portalTitle]);

  const allItems = React.useMemo(
    () => groups.flatMap((g) => g.items),
    [groups]
  );

  const activeItem = React.useMemo(
    () => allItems.find((item) => isNavItemActive(pathname, item.href)),
    [allItems, pathname]
  );

  const activeGroupId = React.useMemo(() => {
    const matched = groups.find((g) =>
      g.items.some((item) => isNavItemActive(pathname, item.href))
    );
    return matched?.id ?? groups[0]?.id ?? "default";
  }, [groups, pathname]);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenForPathname(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

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

  const renderNavGroups = (onItemClick?: () => void) => (
    <nav
      className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-5"
      aria-label="Điều hướng workspace"
    >
      {groups.map((group) => (
        <div key={group.id} className="space-y-1">
          {groups.length > 1 ? (
            <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {group.label}
            </p>
          ) : null}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onItemClick}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150",
                    active
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "text-muted-foreground font-medium hover:bg-secondary hover:text-foreground"
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary"
                    />
                  ) : null}
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors duration-150",
                      active
                        ? "text-accent-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const accountFooter = (
    <div className="shrink-0 border-t border-border p-3 space-y-2 bg-surface">
      <div className="flex items-center gap-2.5 rounded-lg bg-surface-secondary border border-border-subtle px-2.5 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
          {getInitials(userEmail)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">
            {userEmail}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {portalBadge}
          </p>
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

  return (
    <PortalBreadcrumbContext.Provider value={breadcrumbCtxValue}>
      <div className="h-[100dvh] w-full overflow-hidden bg-background text-foreground flex min-w-0 min-h-0">
      {/* Primary Rail (Desktop >= 1024px) */}
      <aside
        aria-label="Primary workspace rail"
        className="hidden lg:flex w-[68px] shrink-0 h-[100dvh] overflow-hidden flex-col items-center justify-between bg-rail text-rail-foreground border-r border-border py-3"
      >
        <div className="flex flex-col items-center gap-4 w-full">
          <Link
            href="/"
            title="HomeCare Platform"
            aria-label="Về trang chủ HomeCare"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 transition-transform duration-150 hover:scale-[1.03]"
          >
            <Image
              src="/homecare-logo.svg"
              alt="HomeCare Logo"
              width={28}
              height={28}
              className="h-7 w-7 rounded-md object-contain"
              priority
            />
          </Link>

          <div className="h-px w-8 bg-white/10" aria-hidden="true" />

          <div className="flex flex-col items-center gap-1.5 w-full px-2">
            {groups.map((group) => {
              const GroupIcon = group.icon;
              const isActive = group.id === activeGroupId;
              return (
                <Link
                  key={group.id}
                  href={group.defaultHref}
                  title={group.label}
                  aria-label={group.label}
                  onClick={() => {
                    if (sidebarCollapsed) setSidebarCollapsed(false);
                  }}
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150",
                    isActive
                      ? "bg-rail-active text-white shadow-xs"
                      : "text-rail-muted hover:bg-white/10 hover:text-rail-foreground"
                  )}
                >
                  <GroupIcon className="h-[18px] w-[18px]" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 w-full px-2">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            title={sidebarCollapsed ? "Mở thanh điều hướng" : "Thu gọn thanh điều hướng"}
            aria-label={sidebarCollapsed ? "Mở thanh điều hướng" : "Thu gọn thanh điều hướng"}
            aria-expanded={!sidebarCollapsed}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-rail-muted hover:bg-white/10 hover:text-rail-foreground transition-colors duration-150 cursor-pointer"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>

          <div
            title={userEmail}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-xs font-semibold text-rail-foreground ring-1 ring-white/15 select-none"
          >
            {getInitials(userEmail)}
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-rail-muted hover:bg-destructive/20 hover:text-red-300 transition-colors duration-150 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Secondary Sidebar (Desktop >= 1024px) */}
      <aside
        aria-label="Secondary navigation sidebar"
        className={cn(
          "hidden lg:flex shrink-0 h-[100dvh] overflow-hidden flex-col bg-surface transition-[width] duration-200 ease-out",
          sidebarCollapsed
            ? "w-0 border-r-0"
            : "w-[244px] border-r border-border"
        )}
      >
        <div className="h-14 shrink-0 border-b border-border px-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              {portalTitle}
            </p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">
              {portalBadge}
            </p>
          </div>
        </div>

        {renderNavGroups()}

        {accountFooter}
      </aside>

      {/* Mobile & Tablet Drawer (< 1024px) */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng"
        >
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex h-[100dvh] w-72 max-w-[85vw] flex-col bg-surface border-r border-border shadow-xl overflow-hidden">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <Image
                  src="/homecare-logo.svg"
                  alt="HomeCare Logo"
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 rounded-md object-contain"
                />
                <span className="truncate text-sm font-semibold text-foreground">
                  {portalTitle}
                </span>
              </div>
              <button
                type="button"
                aria-label="Đóng menu"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {renderNavGroups(() => setMobileOpen(false))}

            <div className="px-3 pb-2 shrink-0 flex items-center justify-between gap-2 border-t border-border-subtle pt-2.5">
              <span className="text-xs font-medium text-muted-foreground">
                Giao diện
              </span>
              <ThemeToggle />
            </div>

            {accountFooter}
          </aside>
        </div>
      ) : null}

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        <header className="h-14 shrink-0 border-b border-border bg-surface/95 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              aria-label="Mở menu điều hướng"
              className="rounded-md p-2 -ml-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden cursor-pointer shrink-0"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <nav
              aria-label="Đường dẫn trang"
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground min-w-0"
            >
              <span className="truncate font-medium text-foreground/80">
                {portalTitle}
              </span>
              {customTrail && customTrail.length > 0 ? (
                customTrail.map((segment, idx) => {
                  const isLast = idx === customTrail.length - 1;
                  return (
                    <React.Fragment key={`${segment.label}-${idx}`}>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                      {segment.href && !isLast ? (
                        <Link
                          href={segment.href}
                          className="truncate font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {segment.label}
                        </Link>
                      ) : (
                        <span className="truncate font-medium text-foreground">
                          {segment.label}
                        </span>
                      )}
                    </React.Fragment>
                  );
                })
              ) : activeItem ? (
                <>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                  <span className="truncate font-medium text-foreground">
                    {activeItem.label}
                  </span>
                </>
              ) : null}
            </nav>
            <span className="sm:hidden truncate text-sm font-semibold text-foreground">
              {customTrail?.[customTrail.length - 1]?.label ??
                activeItem?.label ??
                portalTitle}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {headerSlot}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <div className="sm:hidden">
              <ThemeToggle compact />
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto bg-background">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
    </PortalBreadcrumbContext.Provider>
  );
}
