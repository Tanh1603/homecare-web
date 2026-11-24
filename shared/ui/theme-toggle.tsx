"use client";

import * as React from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useTheme, type ThemeMode } from "./theme-provider";

const THEME_OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  icon: typeof Sun;
}> = [
  { mode: "light", label: "Sáng", icon: Sun },
  { mode: "dark", label: "Tối", icon: Moon },
  { mode: "system", label: "Hệ thống", icon: Monitor },
];

function ThemeIconStack() {
  return (
    <span className="relative flex size-4 items-center justify-center">
      <Sun className="size-4 rotate-0 scale-100 transition-all duration-200 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all duration-200 dark:rotate-0 dark:scale-100" />
    </span>
  );
}

export function ThemeToggle({
  singleButton = false,
}: {
  compact?: boolean;
  singleButton?: boolean;
}) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  if (singleButton) {
    const isDark = resolvedTheme === "dark";
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        title={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
        aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
        className="size-9 rounded-lg border-border/80 bg-surface text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <ThemeIconStack />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Chế độ giao diện"
          aria-label="Chế độ giao diện"
          className="size-9 rounded-lg border-border/80 bg-surface text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ThemeIconStack />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {THEME_OPTIONS.map(({ mode, label, icon: Icon }) => {
          const active = theme === mode;
          return (
            <DropdownMenuItem
              key={mode}
              onClick={() => setTheme(mode)}
              className={cn(
                "flex items-center justify-between gap-2 text-xs font-medium",
                active && "bg-accent text-accent-foreground"
              )}
            >
              <span className="flex items-center gap-2">
                <Icon className="size-3.5 shrink-0" />
                {label}
              </span>
              {active ? <Check className="size-3.5 shrink-0" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
