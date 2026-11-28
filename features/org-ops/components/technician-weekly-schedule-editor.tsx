"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  orgOpsHttpApi,
  ScheduleConflictError,
  type LocalTimeInterval,
  type ScheduleConflictItem,
  type WeeklyDayInterval,
  type WeeklyDayOfWeek,
  type WeeklyScheduleOverview,
} from "../api/org-ops.http";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { formatDateTime } from "@/shared/lib/utils";

const TIME_INPUT_CLASS =
  "appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none";

const DAYS: { key: WeeklyDayOfWeek; label: string }[] = [
  { key: "MONDAY", label: "Thứ 2" },
  { key: "TUESDAY", label: "Thứ 3" },
  { key: "WEDNESDAY", label: "Thứ 4" },
  { key: "THURSDAY", label: "Thứ 5" },
  { key: "FRIDAY", label: "Thứ 6" },
  { key: "SATURDAY", label: "Thứ 7" },
  { key: "SUNDAY", label: "Chủ nhật" },
];

const SHORT_DAYS: { key: WeeklyDayOfWeek; short: string }[] = [
  { key: "MONDAY", short: "T2" },
  { key: "TUESDAY", short: "T3" },
  { key: "WEDNESDAY", short: "T4" },
  { key: "THURSDAY", short: "T5" },
  { key: "FRIDAY", short: "T6" },
  { key: "SATURDAY", short: "T7" },
  { key: "SUNDAY", short: "CN" },
];

const JS_DOW_TO_KEY: WeeklyDayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function parseIsoDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  return copy;
}

function startOfWeekMonday(d: Date): Date {
  const diff = (d.getDay() + 6) % 7;
  return addDays(d, -diff);
}

interface PreviewCell {
  iso: string;
  label: string;
  state: "WORKING" | "OFF" | "OUTSIDE";
}

function buildEffectivePreview(
  effectiveFrom: string,
  effectiveUntil: string,
  dayMap: Record<WeeklyDayOfWeek, LocalTimeInterval[]>
): { cells: PreviewCell[]; workingCount: number; capped: boolean } {
  const start = parseIsoDate(effectiveFrom);
  if (!start) return { cells: [], workingCount: 0, capped: false };
  const parsedEnd = effectiveUntil ? parseIsoDate(effectiveUntil) : null;
  const maxEnd = addDays(start, 27);
  const rawEnd = parsedEnd && parsedEnd >= start ? parsedEnd : addDays(start, 13);
  const capped = rawEnd > maxEnd;
  const displayEnd = capped ? maxEnd : rawEnd;

  const gridStart = startOfWeekMonday(start);
  const gridEndSunday = addDays(startOfWeekMonday(displayEnd), 6);

  const cells: PreviewCell[] = [];
  let workingCount = 0;
  for (let cur = gridStart; cur <= gridEndSunday; cur = addDays(cur, 1)) {
    const iso = formatIsoDate(cur);
    const inRange = cur >= start && (!parsedEnd || cur <= parsedEnd);
    const dowKey = JS_DOW_TO_KEY[cur.getDay()];
    const hasShift = (dayMap[dowKey]?.length ?? 0) > 0;
    const state: PreviewCell["state"] = !inRange
      ? "OUTSIDE"
      : hasShift
        ? "WORKING"
        : "OFF";
    if (state === "WORKING" && cur <= displayEnd) {
      workingCount += 1;
    }
    cells.push({
      iso,
      label: `${cur.getDate()}/${cur.getMonth() + 1}`,
      state,
    });
  }
  return { cells, workingCount, capped };
}

function todayLocalDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function emptyDayMap(): Record<WeeklyDayOfWeek, LocalTimeInterval[]> {
  return {
    MONDAY: [],
    TUESDAY: [],
    WEDNESDAY: [],
    THURSDAY: [],
    FRIDAY: [],
    SATURDAY: [],
    SUNDAY: [],
  };
}

function toDayMap(
  intervals: WeeklyDayInterval[] | undefined
): Record<WeeklyDayOfWeek, LocalTimeInterval[]> {
  const map = emptyDayMap();
  for (const iv of intervals ?? []) {
    map[iv.dayOfWeek].push({
      startTime: iv.startTime.length === 5 ? `${iv.startTime}:00` : iv.startTime,
      endTime: iv.endTime.length === 5 ? `${iv.endTime}:00` : iv.endTime,
    });
  }
  return map;
}

export function TechnicianWeeklyScheduleEditor({
  organizationId,
  technicianId,
  overview,
  onSaved,
}: {
  organizationId: string;
  technicianId: string;
  overview: WeeklyScheduleOverview | null;
  onSaved: (next: WeeklyScheduleOverview | null) => Promise<void> | void;
}) {
  const activeRule =
    overview?.upcomingRules?.[overview.upcomingRules.length - 1] ??
    overview?.currentRule ??
    null;

  const [effectiveFrom, setEffectiveFrom] = React.useState(todayLocalDate);
  const [effectiveUntil, setEffectiveUntil] = React.useState(
    activeRule?.effectiveUntil ?? ""
  );
  const [dayMap, setDayMap] = React.useState<
    Record<WeeklyDayOfWeek, LocalTimeInterval[]>
  >(() => toDayMap(activeRule?.intervals));
  const [conflicts, setConflicts] = React.useState<ScheduleConflictItem[]>([]);

  const saveMutation = useMutation({
    mutationFn: (intervals: WeeklyDayInterval[]) =>
      orgOpsHttpApi.upsertTechnicianWeeklySchedule(
        organizationId,
        technicianId,
        {
          timezone: activeRule?.timezone ?? "Asia/Ho_Chi_Minh",
          effectiveFrom,
          effectiveUntil: effectiveUntil || null,
          intervals,
        },
        activeRule?.version
      ),
    onSuccess: async (updated) => {
      toast.success(
        `Đã lưu lịch tuần và tự động đồng bộ ${updated.horizonDays} ngày tới.`
      );
      await onSaved(updated);
    },
    onError: (err) => {
      if (err instanceof ScheduleConflictError) {
        setConflicts(err.conflicts);
        toast.error(err.message);
      } else {
        toast.error(
          err instanceof Error ? err.message : "Không thể lưu lịch làm việc tuần"
        );
      }
    },
  });

  const endMutation = useMutation({
    mutationFn: () =>
      orgOpsHttpApi.endTechnicianWeeklySchedule(
        organizationId,
        technicianId,
        undefined,
        activeRule?.version
      ),
    onSuccess: async () => {
      toast.success("Đã kết thúc hiệu lực lịch tuần (giữ nguyên các booking đã đặt).");
      await onSaved(null);
    },
    onError: (err) => {
      if (err instanceof ScheduleConflictError) {
        setConflicts(err.conflicts);
        toast.error(err.message);
      } else {
        toast.error(
          err instanceof Error ? err.message : "Không thể kết thúc lịch tuần"
        );
      }
    },
  });

  const saving = saveMutation.isPending || endMutation.isPending;

  const preview = React.useMemo(
    () => buildEffectivePreview(effectiveFrom, effectiveUntil, dayMap),
    [effectiveFrom, effectiveUntil, dayMap]
  );

  function applyPreset(preset: "MON_FRI_SPLIT" | "MON_SAT_FULL") {
    const next = emptyDayMap();
    const workdays: WeeklyDayOfWeek[] =
      preset === "MON_FRI_SPLIT"
        ? ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
        : ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    for (const day of workdays) {
      next[day] =
        preset === "MON_FRI_SPLIT"
          ? [
              { startTime: "08:00:00", endTime: "12:00:00" },
              { startTime: "13:00:00", endTime: "17:00:00" },
            ]
          : [{ startTime: "08:00:00", endTime: "17:00:00" }];
    }
    setDayMap(next);
  }

  function toggleDay(day: WeeklyDayOfWeek) {
    setDayMap((prev) => ({
      ...prev,
      [day]:
        prev[day].length > 0
          ? []
          : [{ startTime: "08:00:00", endTime: "17:00:00" }],
    }));
  }

  function addInterval(day: WeeklyDayOfWeek) {
    setDayMap((prev) => ({
      ...prev,
      [day]: [...prev[day], { startTime: "13:00:00", endTime: "17:00:00" }],
    }));
  }

  function updateInterval(
    day: WeeklyDayOfWeek,
    idx: number,
    field: "startTime" | "endTime",
    value: string
  ) {
    setDayMap((prev) => ({
      ...prev,
      [day]: prev[day].map((iv, i) =>
        i === idx ? { ...iv, [field]: value } : iv
      ),
    }));
  }

  function removeInterval(day: WeeklyDayOfWeek, idx: number) {
    setDayMap((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== idx),
    }));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setConflicts([]);
    const intervals: WeeklyDayInterval[] = [];
    for (const { key, label } of DAYS) {
      const sorted = [...dayMap[key]].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      );
      for (let i = 0; i < sorted.length; i++) {
        const cur = sorted[i];
        if (!cur.startTime || !cur.endTime || cur.endTime <= cur.startTime) {
          toast.error(`${label}: Giờ kết thúc phải sau giờ bắt đầu.`);
          return;
        }
        if (i > 0 && cur.startTime < sorted[i - 1].endTime) {
          toast.error(`${label}: Các ca làm việc trong cùng ngày không được chồng lấn.`);
          return;
        }
        intervals.push({
          dayOfWeek: key,
          startTime: cur.startTime,
          endTime: cur.endTime,
        });
      }
    }

    saveMutation.mutate(intervals);
  }

  function handleEndSchedule() {
    setConflicts([]);
    endMutation.mutate();
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-secondary/50 px-3 py-2 text-xs">
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">
            Phạm vi: Từ ngày áp dụng trở đi (tự duy trì trước{" "}
            {overview?.horizonDays ?? 30} ngày)
          </p>
          <p className="text-muted-foreground">
            Không thay đổi booking đã phân bổ hay lịch thủ công. Muốn đổi riêng
            1 ngày, dùng tab <strong>Ngày ngoại lệ</strong>.
          </p>
        </div>
        <Badge variant="secondary">Asia/Ho_Chi_Minh</Badge>
      </div>

      {conflicts.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle className="text-xs font-semibold">
            Không thể cập nhật vì xung đột {conflicts.length} booking đã phân bổ
          </AlertTitle>
          <AlertDescription className="mt-1 space-y-1 text-xs">
            <p>
              Vui lòng đổi lịch, phân công lại KTV hoặc hủy các booking sau trước
              khi thay đổi lịch làm việc:
            </p>
            <ul className="list-disc pl-4 space-y-0.5">
              {conflicts.map((c) => (
                <li key={c.windowId}>
                  {formatDateTime(c.startsAt)} → {formatDateTime(c.endsAt)}
                  {c.bookingId ? ` (Booking #${c.bookingId.slice(0, 8)})` : ""}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Ngày bắt đầu áp dụng" htmlFor="weekly-eff-from" required>
          <Input
            id="weekly-eff-from"
            type="date"
            min={todayLocalDate()}
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            required
          />
        </FormField>
        <FormField
          label="Ngày kết thúc (tùy chọn)"
          htmlFor="weekly-eff-until"
          hint="Để trống nếu áp dụng lâu dài"
        >
          <Input
            id="weekly-eff-until"
            type="date"
            min={effectiveFrom}
            value={effectiveUntil}
            onChange={(e) => setEffectiveUntil(e.target.value)}
          />
        </FormField>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Mẫu nhanh:</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => applyPreset("MON_FRI_SPLIT")}
        >
          T2–T6 (08:00–12:00, 13:00–17:00)
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => applyPreset("MON_SAT_FULL")}
        >
          T2–T7 (08:00–17:00)
        </Button>
      </div>

      <div className="space-y-2">
        {DAYS.map(({ key, label }) => {
          const list = dayMap[key];
          const enabled = list.length > 0;
          return (
            <div
              key={key}
              className="rounded-lg border border-border bg-card px-3 py-2.5 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleDay(key)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span>{label}</span>
                </label>
                {enabled ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => addInterval(key)}
                    className="h-7 px-2 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm ca
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Nghỉ</span>
                )}
              </div>
              {enabled ? (
                <div className="space-y-1.5 pl-6">
                  {list.map((iv, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="time"
                        step="1"
                        aria-label={`${label} giờ bắt đầu ca ${idx + 1}`}
                        value={iv.startTime}
                        onChange={(e) =>
                          updateInterval(key, idx, "startTime", e.target.value)
                        }
                        className={`h-8 text-xs ${TIME_INPUT_CLASS}`}
                        required
                      />
                      <span className="text-xs text-muted-foreground">→</span>
                      <Input
                        type="time"
                        step="1"
                        aria-label={`${label} giờ kết thúc ca ${idx + 1}`}
                        value={iv.endTime}
                        onChange={(e) =>
                          updateInterval(key, idx, "endTime", e.target.value)
                        }
                        className={`h-8 text-xs ${TIME_INPUT_CLASS}`}
                        required
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Xóa ca ${idx + 1} ${label}`}
                        onClick={() => removeInterval(key, idx)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {preview.cells.length > 0 ? (
        <div className="rounded-lg border border-border bg-surface-secondary/35 p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-foreground">
              Xem trước lịch thực tế: {preview.workingCount} ngày làm việc
              {preview.capped ? " (hiển thị 4 tuần đầu)" : ""}
            </span>
            <span className="text-muted-foreground">
              Chỉ sinh trong khoảng hiệu lực &amp; đúng thứ đã chọn
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
            {SHORT_DAYS.map((d) => (
              <div
                key={d.key}
                className="font-medium text-muted-foreground pb-0.5"
              >
                {d.short}
              </div>
            ))}
            {preview.cells.map((cell) => (
              <div
                key={cell.iso}
                className={`rounded-md border px-1 py-1.5 leading-tight ${
                  cell.state === "WORKING"
                    ? "border-success/40 bg-success/15 text-success-foreground"
                    : cell.state === "OFF"
                      ? "border-warning/40 bg-warning/15 text-warning-foreground"
                      : "border-border/50 bg-muted/40 text-muted-foreground"
                }`}
              >
                <div className="font-semibold text-foreground">{cell.label}</div>
                <div className="text-[10px]">
                  {cell.state === "WORKING"
                    ? "Có ca"
                    : cell.state === "OFF"
                      ? "Nghỉ"
                      : "—"}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
              Có ca
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
              Ngày nghỉ
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              Ngoài hiệu lực
            </span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
        {activeRule ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={handleEndSchedule}
            className="text-destructive hover:text-destructive"
          >
            Kết thúc lịch tuần
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Đang đồng bộ..." : "Lưu & đồng bộ lịch tuần"}
        </Button>
      </div>
    </form>
  );
}
