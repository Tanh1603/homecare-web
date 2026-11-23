"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/**
 * Optional contextual side inspector panel with independent scrolling.
 * Renders as a right drawer on desktop/tablet and a bottom/full sheet on mobile.
 */
export function ContextInspector({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[1px] hc-animate-backdrop-in"
        onClick={onClose}
      />
      <aside
        className={cn(
          "relative z-10 flex h-dvh w-full max-w-md flex-col bg-surface border-l border-border shadow-2xl overflow-hidden hc-animate-drawer-in",
          className
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-5">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {title}
            </h2>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng chi tiết"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-border bg-surface-secondary px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
