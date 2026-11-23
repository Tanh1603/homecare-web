"use client";

import * as React from "react";
import Link from "next/link";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { Button, type ButtonProps } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";

export interface RowActionItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  href?: string;
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  hidden?: boolean;
}

export interface RowActionGroup {
  id: string;
  label?: string;
  items: RowActionItem[];
}

export interface RowPrimaryAction {
  label: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ButtonProps["variant"];
}

export function RowActionsMenu({
  ariaLabel,
  primaryAction,
  groups,
  disabled = false,
  className,
}: {
  ariaLabel: string;
  primaryAction?: RowPrimaryAction | null;
  groups: RowActionGroup[];
  disabled?: boolean;
  className?: string;
}) {
  const visibleGroups = React.useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.hidden),
        }))
        .filter((group) => group.items.length > 0),
    [groups]
  );

  const PrimaryIcon = primaryAction?.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center justify-end gap-1 whitespace-nowrap",
        className
      )}
    >
      {primaryAction ? (
        primaryAction.href ? (
          <Button
            size="sm"
            variant={primaryAction.variant ?? "outline"}
            disabled={disabled || primaryAction.disabled}
            asChild
            className="h-8 px-2.5 text-xs"
          >
            <Link href={primaryAction.href}>
              {PrimaryIcon ? <PrimaryIcon className="h-3.5 w-3.5" /> : null}
              {primaryAction.label}
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant={primaryAction.variant ?? "outline"}
            disabled={disabled || primaryAction.disabled}
            onClick={primaryAction.onClick}
            className="h-8 px-2.5 text-xs"
          >
            {PrimaryIcon ? <PrimaryIcon className="h-3.5 w-3.5" /> : null}
            {primaryAction.label}
          </Button>
        )
      ) : null}

      {visibleGroups.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={disabled}
              aria-label={ariaLabel}
              className="h-8 w-8 text-muted-foreground hover:bg-secondary hover:text-foreground data-[state=open]:bg-secondary data-[state=open]:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {visibleGroups.map((group, groupIndex) => (
              <React.Fragment key={group.id}>
                {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuGroup>
                  {group.label ? (
                    <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                  ) : null}
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    if (item.href) {
                      return (
                        <DropdownMenuItem
                          key={item.id}
                          asChild
                          disabled={item.disabled}
                          destructive={item.destructive}
                        >
                          <Link href={item.href}>
                            {Icon ? (
                              <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                            ) : null}
                            <span>{item.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    }
                    return (
                      <DropdownMenuItem
                        key={item.id}
                        disabled={item.disabled}
                        destructive={item.destructive}
                        onSelect={() => item.onSelect?.()}
                      >
                        {Icon ? (
                          <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                        ) : null}
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
