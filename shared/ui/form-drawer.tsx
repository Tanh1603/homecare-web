"use client";

import * as React from "react";
import { AlertCircle, AlertTriangle, ChevronDown, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";

const DRAWER_WIDTHS = {
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
} as const;

export function focusFirstInvalidField(container: HTMLElement | null) {
  if (!container) return;
  requestAnimationFrame(() => {
    const target = container.querySelector<HTMLElement>(
      '[aria-invalid="true"], [data-invalid="true"] input, [data-invalid="true"] select, [data-invalid="true"] textarea'
    );
    if (target) {
      target.scrollIntoView?.({ behavior: "smooth", block: "center" });
      target.focus();
    }
  });
}

export function FormDrawer({
  open,
  onClose,
  title,
  description,
  isDirty = false,
  saving = false,
  submitLabel = "Lưu thay đổi",
  cancelLabel = "Hủy",
  submitDisabled = false,
  formId,
  onSubmit,
  footer,
  size = "lg",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  isDirty?: boolean;
  saving?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  submitDisabled?: boolean;
  formId?: string;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  footer?: React.ReactNode;
  size?: keyof typeof DRAWER_WIDTHS;
  children: React.ReactNode;
}) {
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);
  const asideRef = React.useRef<HTMLElement | null>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  const requestClose = React.useCallback(() => {
    if (saving) return;
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    setConfirmDiscard(false);
    onClose();
  }, [isDirty, onClose, saving]);

  React.useEffect(() => {
    if (!open) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const timer = window.setTimeout(() => {
      const firstInput = asideRef.current?.querySelector<HTMLElement>(
        "input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
      );
      firstInput?.focus();
    }, 30);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, requestClose]);

  if (!open) return null;

  const defaultFooter = (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={saving}
        onClick={requestClose}
      >
        {cancelLabel}
      </Button>
      <Button
        type="submit"
        form={formId}
        loading={saving}
        disabled={saving || submitDisabled}
        onClick={() => setConfirmDiscard(false)}
      >
        {saving ? "Đang lưu..." : submitLabel}
      </Button>
    </div>
  );

  const bodyAndFooter = (
    <>
      {isDirty && confirmDiscard ? (
        <div
          role="alert"
          className="hc-animate-error-in flex flex-wrap items-center justify-between gap-2 border-b border-warning/30 bg-warning/10 px-5 py-2.5 text-xs text-foreground"
        >
          <span className="inline-flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng?
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDiscard(false)}
            >
              Tiếp tục sửa
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => {
                setConfirmDiscard(false);
                onClose();
              }}
            >
              Bỏ thay đổi
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
        {children}
      </div>

      {footer !== undefined ? (
        footer ? (
          <div className="shrink-0 border-t border-border bg-surface-secondary px-5 py-3.5">
            {footer}
          </div>
        ) : null
      ) : onSubmit || formId ? (
        <div className="shrink-0 border-t border-border bg-surface-secondary px-5 py-3.5">
          {defaultFooter}
        </div>
      ) : null}
    </>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-[1px] hc-animate-backdrop-in"
        onClick={requestClose}
      />
      <aside
        ref={asideRef}
        className={cn(
          "relative z-10 flex h-[100dvh] w-full flex-col bg-surface border-l border-border shadow-2xl overflow-hidden hc-animate-drawer-in",
          DRAWER_WIDTHS[size]
        )}
      >
        <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="truncate text-xs text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Đóng"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {onSubmit ? (
          <form
            onSubmit={(e) => {
              setConfirmDiscard(false);
              onSubmit(e);
            }}
            className="flex flex-1 min-h-0 flex-col overflow-hidden"
          >
            {bodyAndFooter}
          </form>
        ) : (
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
            {bodyAndFooter}
          </div>
        )}
      </aside>
    </div>
  );
}

export function FormSection({
  title,
  description,
  collapsible = false,
  defaultOpen = true,
  children,
  className,
}: {
  title: string;
  description?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section
      className={cn(
        "hc-animate-section-in space-y-3.5 rounded-lg border border-border bg-surface-secondary/60 p-4 transition-colors duration-150",
        className
      )}
    >
      {collapsible ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2 text-left cursor-pointer"
        >
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open ? "rotate-180" : "rotate-0"
            )}
          />
        </button>
      ) : (
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      )}
      {!collapsible || open ? (
        <div className="hc-animate-section-in space-y-3">{children}</div>
      ) : null}
    </section>
  );
}

export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-invalid={error ? "true" : undefined}
      className={cn("space-y-1.5", className)}
    >
      <Label htmlFor={htmlFor} className="inline-flex items-center gap-1">
        <span>{label}</span>
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p
          role="alert"
          className="hc-animate-error-in inline-flex items-center gap-1 text-xs text-destructive"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
