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

export function ThemeToggle({
  compact = false,
  singleButton = false,
}: {
  compact?: boolean;
  singleButton?: boolean;
}) {
  const { theme, setTheme } = useTheme();

  if (singleButton) {
    const nextMode: ThemeMode =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    const current =
      THEME_OPTIONS.find((opt) => opt.mode === theme) ?? THEME_OPTIONS[0];
    const CurrentIcon = current.icon;
    return (
      <button
        type="button"
        onClick={() => setTheme(nextMode)}
        title={`Giao diện: ${current.label}`}
        aria-label={`Đổi chế độ giao diện (hiện tại: ${current.label})`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground cursor-pointer"
      >
        <CurrentIcon className="h-4 w-4" />
      </button>
    );
  }

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
