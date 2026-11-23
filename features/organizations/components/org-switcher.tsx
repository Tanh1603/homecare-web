"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";
import {
  formatOrgRoleLabel,
  type OrganizationMembership,
} from "../contracts/organization";
import { StatusBadge } from "@/shared/ui/status-badge";
import { cn } from "@/shared/lib/utils";

export function OrgSwitcher({
  memberships,
  activeOrganization,
}: {
  memberships: OrganizationMembership[];
  activeOrganization: OrganizationMembership;
}) {
  const router = useRouter();
  const [switching, setSwitching] = React.useState(false);

  async function handleSelect(organizationId: string) {
    if (organizationId === activeOrganization.organizationId || switching) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/org/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      if (!res.ok) {
        throw new Error("Không thể chuyển tổ chức");
      }
      toast.success("Đã chuyển tổ chức làm việc");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi chuyển tổ chức");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          disabled={switching}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary transition-colors cursor-pointer"
        >
          <Building2 className="h-4 w-4 text-primary" />
          <span className="max-w-[180px] truncate">
            {activeOrganization.organizationName}
          </span>
          <StatusBadge status={activeOrganization.organizationStatus} />
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[260px] rounded-xl border border-border bg-popover p-1.5 shadow-md"
        >
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Tổ chức của bạn ({memberships.length})
          </div>
          {memberships.map((m) => {
            const selected =
              m.organizationId === activeOrganization.organizationId;
            return (
              <DropdownMenu.Item
                key={m.organizationId}
                onSelect={() => handleSelect(m.organizationId)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm outline-none cursor-pointer",
                  selected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-secondary"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.organizationName}</p>
                  <p className="text-xs text-muted-foreground">
                    Vai trò: {formatOrgRoleLabel(m.memberRole)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={m.organizationStatus} />
                  {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                </div>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
