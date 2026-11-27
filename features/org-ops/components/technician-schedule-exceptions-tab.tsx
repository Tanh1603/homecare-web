"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  orgOpsHttpApi,
  ScheduleConflictError,
  type LocalTimeInterval,
  type ScheduleConflictItem,
  type ScheduleExceptionItem,
  type ScheduleExceptionType,
} from "../api/org-ops.http";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { formatDateTime } from "@/shared/lib/utils";

const TIME_INPUT_CLASS =
  "appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none";

function todayLocalDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const EXCEPTION_LABELS: Record<ScheduleExceptionType, string> = {
  UNAVAILABLE: "Nghỉ phép / Không làm việc",
  CUSTOM_HOURS: "Đổi ca riêng ngày này",
  EXTRA_HOURS: "Làm thêm vào ngày nghỉ",
};

export function TechnicianScheduleExceptionsTab({
  organizationId,
  technicianId,
  exceptions,
  onChanged,
}: {
  organizationId: string;
  technicianId: string;
  exceptions: ScheduleExceptionItem[];
  onChanged: () => Promise<void> | void;
}) {
  const [fromDate, setFromDate] = React.useState(todayLocalDate);
  const [toDate, setToDate] = React.useState(todayLocalDate);
  const [exceptionType, setExceptionType] =
    React.useState<ScheduleExceptionType>("UNAVAILABLE");
  const [fullDayLeave, setFullDayLeave] = React.useState(true);
  const [reason, setReason] = React.useState("");
  const [intervals, setIntervals] = React.useState<LocalTimeInterval[]>([
    { startTime: "08:00:00", endTime: "12:00:00" },
  ]);
  const [saving, setSaving] = React.useState(false);
  const [conflicts, setConflicts] = React.useState<ScheduleConflictItem[]>([]);

  const needsIntervals =
    exceptionType !== "UNAVAILABLE" || !fullDayLeave;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConflicts([]);
    const effectiveTo =
      exceptionType === "UNAVAILABLE" ? toDate || fromDate : fromDate;
    if (effectiveTo < fromDate) {
      toast.error("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.");
      return;
    }
    const payloadIntervals = needsIntervals ? intervals : [];
    for (const iv of payloadIntervals) {
      if (!iv.startTime || !iv.endTime || iv.endTime <= iv.startTime) {
        toast.error("Giờ kết thúc phải sau giờ bắt đầu.");
        return;
      }
    }

    setSaving(true);
    try {
      await orgOpsHttpApi.upsertTechnicianScheduleExceptions(
        organizationId,
        technicianId,
        {
          fromDate,
          toDate: effectiveTo,
          exceptionType,
          reason,
          intervals: payloadIntervals,
        }
      );
      toast.success("Đã lưu ngoại lệ lịch làm việc.");
      setReason("");
      await onChanged();
    } catch (err) {
      if (err instanceof ScheduleConflictError) {
        setConflicts(err.conflicts);
        toast.error(err.message);
      } else {
        toast.error(
          err instanceof Error ? err.message : "Không thể lưu ngày ngoại lệ"
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ex: ScheduleExceptionItem) {
    try {
      await orgOpsHttpApi.deleteTechnicianScheduleException(
        organizationId,
        technicianId,
        ex.id,
        ex.version
      );
      toast.success("Đã xóa ngoại lệ và khôi phục lịch theo lịch tuần.");
      await onChanged();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa ngoại lệ"
      );
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-lg border border-border bg-surface-secondary/40 p-3"
      >
        <p className="text-xs font-semibold text-foreground">
          Thêm ngoại lệ (chỉ ngày này hoặc nhiều ngày nghỉ liên tiếp)
        </p>

        {conflicts.length > 0 ? (
          <Alert variant="destructive">
            <AlertTitle className="text-xs font-semibold">
              Xung đột với {conflicts.length} booking đã phân bổ
            </AlertTitle>
            <AlertDescription className="mt-1 space-y-1 text-xs">
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
          <FormField label="Loại ngoại lệ" htmlFor="ex-type" required>
            <NativeSelect
              id="ex-type"
              value={exceptionType}
              onChange={(e) =>
                setExceptionType(e.target.value as ScheduleExceptionType)
              }
            >
              <NativeSelectOption value="UNAVAILABLE">
                {EXCEPTION_LABELS.UNAVAILABLE}
              </NativeSelectOption>
              <NativeSelectOption value="CUSTOM_HOURS">
                {EXCEPTION_LABELS.CUSTOM_HOURS}
              </NativeSelectOption>
              <NativeSelectOption value="EXTRA_HOURS">
                {EXCEPTION_LABELS.EXTRA_HOURS}
              </NativeSelectOption>
            </NativeSelect>
          </FormField>

          <FormField label="Lý do (tùy chọn)" htmlFor="ex-reason">
            <Input
              id="ex-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Nghỉ phép, Lễ 30/4..."
            />
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            label={exceptionType === "UNAVAILABLE" ? "Từ ngày" : "Ngày áp dụng"}
            htmlFor="ex-from"
            required
          >
            <Input
              id="ex-from"
              type="date"
              min={todayLocalDate()}
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                if (toDate < e.target.value) setToDate(e.target.value);
              }}
              required
            />
          </FormField>
          {exceptionType === "UNAVAILABLE" ? (
            <FormField label="Đến ngày (nghỉ nhiều ngày)" htmlFor="ex-to">
              <Input
                id="ex-to"
                type="date"
                min={fromDate}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </FormField>
          ) : null}
        </div>

        {exceptionType === "UNAVAILABLE" ? (
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={fullDayLeave}
              onChange={(e) => setFullDayLeave(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span>Nghỉ cả ngày (bỏ chọn để nghỉ một khoảng giờ cụ thể)</span>
          </label>
        ) : null}

        {needsIntervals ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                Khung giờ áp dụng
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() =>
                  setIntervals((prev) => [
                    ...prev,
                    { startTime: "13:00:00", endTime: "17:00:00" },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm khung giờ
              </Button>
            </div>
            {intervals.map((iv, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  type="time"
                  step="1"
                  value={iv.startTime}
                  onChange={(e) =>
                    setIntervals((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, startTime: e.target.value } : item
                      )
                    )
                  }
                  className={`h-8 text-xs ${TIME_INPUT_CLASS}`}
                  required
                />
                <span className="text-xs text-muted-foreground">→</span>
                <Input
                  type="time"
                  step="1"
                  value={iv.endTime}
                  onChange={(e) =>
                    setIntervals((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, endTime: e.target.value } : item
                      )
                    )
                  }
                  className={`h-8 text-xs ${TIME_INPUT_CLASS}`}
                  required
                />
                {intervals.length > 1 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setIntervals((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu ngoại lệ"}
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground">
          Ngoại lệ đã đăng ký ({exceptions.length})
        </h4>
        {exceptions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Chưa có ngày nghỉ hay điều chỉnh riêng nào.
          </p>
        ) : (
          <div className="space-y-2">
            {exceptions.map((ex) => (
              <div
                key={ex.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-foreground">
                      {ex.localDate}
                    </span>
                    <Badge
                      variant={
                        ex.exceptionType === "UNAVAILABLE"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {EXCEPTION_LABELS[ex.exceptionType]}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {ex.startTime && ex.endTime
                      ? `${ex.startTime} → ${ex.endTime}`
                      : "Cả ngày"}
                    {ex.reason ? ` · ${ex.reason}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(ex)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
