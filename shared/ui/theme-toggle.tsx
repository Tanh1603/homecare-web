"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/shared/lib/utils";
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

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Chế độ giao diện"
      className="inline-flex items-center rounded-lg border border-border bg-surface-secondary p-0.5"
    >
      {THEME_OPTIONS.map(({ mode, label, icon: Icon }) => {
        const active = theme === mode;
        return (
          <button
            key={mode}
            type="button"
            title={`Giao diện: ${label}`}
            aria-label={`Giao diện ${label}`}
            aria-pressed={active}
            onClick={() => setTheme(mode)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors duration-150 cursor-pointer",
              active
                ? "bg-surface text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {!compact ? <span className="hidden sm:inline">{label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
