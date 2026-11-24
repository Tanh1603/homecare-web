"use client";

import { createSupabaseBrowserClient } from "@/shared/lib/supabase/client";
import { cn } from "@/shared/lib/utils";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/ui/breadcrumb";
import { Button } from "@/shared/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/shared/ui/sidebar";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
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
  return (
    <SidebarProvider
      className="h-dvh min-h-0 overflow-hidden bg-background text-foreground"
      style={{ "--sidebar-width": "15.25rem" } as React.CSSProperties}
    >
      <PortalShellContent
        portalTitle={portalTitle}
        portalBadge={portalBadge}
        userEmail={userEmail}
        navItems={navItems}
        navGroups={navGroups}
        headerSlot={headerSlot}
      >
        {children}
      </PortalShellContent>
    </SidebarProvider>
  );
}

function PortalShellContent({
  portalTitle,
  portalBadge,
  userEmail,
  navItems,
  navGroups,
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
  const { setOpenMobile } = useSidebar();
  const [customTrail, setCustomTrail] = React.useState<
    BreadcrumbSegment[] | null
  >(null);
  const breadcrumbCtxValue = React.useMemo(
    () => ({ setTrail: setCustomTrail }),
    [],
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
    () => groups.flatMap((group) => group.items),
    [groups],
  );
  const activeItem = React.useMemo(
    () => allItems.find((item) => isNavItemActive(pathname, item.href)),
    [allItems, pathname],
  );

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

  return (
    <PortalBreadcrumbContext.Provider value={breadcrumbCtxValue}>
      <Sidebar collapsible="offcanvas" className="h-dvh border-sidebar-border">
        <SidebarHeader className="h-14 shrink-0 flex-row items-center gap-3 border-b border-sidebar-border px-4 py-2">
          <Link
            href="/"
            aria-label="Về trang chủ HomeCare"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary"
          >
            <Image
              src="/homecare-logo.svg"
              alt="HomeCare"
              width={26}
              height={26}
              className="size-7 object-contain"
              priority
            />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">
              {portalTitle}
            </p>
            <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {portalBadge}
            </p>
          </div>
        </SidebarHeader>

        <SidebarContent className="py-2">
          <nav aria-label="Điều hướng workspace">
            {groups.map((group) => (
              <SidebarGroup key={group.id} className="gap-1 px-3 py-2">
                {groups.length > 1 ? (
                  <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-wider">
                    {group.label}
                  </SidebarGroupLabel>
                ) : null}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isNavItemActive(pathname, item.href);
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            tooltip={item.label}
                            aria-current={active ? "page" : undefined}
                            onClick={() => setOpenMobile(false)}
                            className={cn(
                              "h-9 rounded-lg px-2.5 font-medium",
                              active && "font-semibold",
                            )}
                          >
                            <Link href={item.href}>
                              <Icon aria-hidden="true" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </nav>
        </SidebarContent>

        <SidebarFooter className="gap-2 border-t border-sidebar-border p-3">
          <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border-subtle bg-surface-secondary px-2.5 py-2">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-primary/12 text-xs font-semibold text-primary">
                {getInitials(userEmail)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{userEmail}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {portalBadge}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 rounded-lg px-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut data-icon="inline-start" />
            Đăng xuất
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <SidebarTrigger
              aria-label="Mở hoặc thu gọn thanh điều hướng"
              className="size-9 shrink-0"
            />
            <Breadcrumb className="hidden min-w-0 sm:block">
              <BreadcrumbList className="flex-nowrap text-xs">
                <BreadcrumbItem>
                  <BreadcrumbPage className="truncate font-medium text-foreground/80">
                    {portalTitle}
                  </BreadcrumbPage>
                </BreadcrumbItem>
                {customTrail?.length ? (
                  customTrail.map((segment, index) => {
                    const isLast = index === customTrail.length - 1;
                    return (
                      <React.Fragment key={`${segment.label}-${index}`}>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem className="min-w-0">
                          {segment.href && !isLast ? (
                            <BreadcrumbLink asChild>
                              <Link
                                href={segment.href}
                                className="truncate font-medium"
                              >
                                {segment.label}
                              </Link>
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage className="truncate font-medium">
                              {segment.label}
                            </BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    );
                  })
                ) : activeItem ? (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem className="min-w-0">
                      <BreadcrumbPage className="truncate font-medium">
                        {activeItem.label}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                ) : null}
              </BreadcrumbList>
            </Breadcrumb>
            <span className="truncate text-sm font-semibold sm:hidden">
              {customTrail?.[customTrail.length - 1]?.label ??
                activeItem?.label ??
                portalTitle}
            </span>
          </div>

          <ThemeToggle singleButton />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-background">
          <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </SidebarInset>
    </PortalBreadcrumbContext.Provider>
  );
}
