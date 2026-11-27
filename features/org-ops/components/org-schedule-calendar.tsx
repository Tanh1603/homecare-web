"use client";

import * as React from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import type { OrgTechnicianItem } from "../api/org-ops.adapter";
import {
  orgOpsHttpApi,
  type CalendarDayItem,
  type OrganizationCalendarResponse,
  type ScheduleAuditItem,
  type ScheduleExceptionItem,
  type TechnicianCalendarRow,
  type WeeklyScheduleOverview,
} from "../api/org-ops.http";
import { TechnicianWeeklyScheduleEditor } from "./technician-weekly-schedule-editor";
import { TechnicianScheduleExceptionsTab } from "./technician-schedule-exceptions-tab";
import { OrgScheduleRequestsPanel } from "./org-schedule-requests-panel";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ContextInspector } from "@/shared/ui/context-inspector";
import { Input } from "@/shared/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { formatDateTime } from "@/shared/lib/utils";

type CalendarViewMode = "day" | "week" | "month";

const DOW_LABELS: Record<string, string> = {
  MONDAY: "T2",
  TUESDAY: "T3",
  WEDNESDAY: "T4",
  THURSDAY: "T5",
  FRIDAY: "T6",
  SATURDAY: "T7",
  SUNDAY: "CN",
};

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayIso(): string {
  return formatIso(new Date());
}

function addDays(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
}

function startOfWeekMonday(d: Date): Date {
  const diff = (d.getDay() + 6) % 7;
  return addDays(d, -diff);
}

function computeRange(anchorIso: string, mode: CalendarViewMode): { from: string; to: string } {
  const d = parseIso(anchorIso);
  if (mode === "day") {
    return { from: formatIso(d), to: formatIso(d) };
  }
  if (mode === "month") {
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from: formatIso(first), to: formatIso(last) };
  }
  const mon = startOfWeekMonday(d);
  return { from: formatIso(mon), to: formatIso(addDays(mon, 6)) };
}

function formatShortDayHeader(iso: string): string {
  const d = parseIso(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

function dayCellTone(day: CalendarDayItem): string {
  if (day.dayStatus === "BOOKED") {
    return "border-info/40 bg-info/15 text-foreground hover:border-info";
  }
  if (day.dayStatus === "WORKING") {
    return "border-success/40 bg-success/15 text-foreground hover:border-success";
  }
  if (day.dayStatus === "OFF") {
    return "border-destructive/30 bg-destructive/10 text-destructive hover:border-destructive/60";
  }
  return "border-border/60 bg-muted/35 text-muted-foreground hover:border-border";
}

function dayCellSummary(day: CalendarDayItem): { primary: string; secondary?: string } {
  if (day.dayStatus === "BOOKED") {
    const first = day.slots[0];
    return {
      primary: `${day.bookingCount} booking`,
      secondary: first ? `${first.localStartTime}–${first.localEndTime}` : undefined,
    };
  }
  if (day.dayStatus === "WORKING") {
    const first = day.slots[0];
    if (!first) return { primary: "Có ca" };
    return {
      primary: `${first.localStartTime}`,
      secondary:
        day.slots.length > 1
          ? `${first.localEndTime} (+${day.slots.length - 1})`
          : first.localEndTime,
    };
  }
  if (day.dayStatus === "OFF") {
    return { primary: day.exceptionType === "UNAVAILABLE" ? "Nghỉ phép" : "Nghỉ" };
  }
  return { primary: "—" };
}

export function OrgScheduleCalendar({
  organizationId,
  canManage,
  initialTechnicians,
}: {
  organizationId: string;
  canManage: boolean;
  initialTechnicians: OrgTechnicianItem[];
}) {
  const [workspaceTab, setWorkspaceTab] = React.useState<"calendar" | "requests">("calendar");
  const [pendingRequestCount, setPendingRequestCount] = React.useState<number>(0);
  const [viewMode, setViewMode] = React.useState<CalendarViewMode>("week");
  const [anchorDate, setAnchorDate] = React.useState<string>(todayIso);
  const [customFrom, setCustomFrom] = React.useState<string>("");
  const [customTo, setCustomTo] = React.useState<string>("");
  const [keyword, setKeyword] = React.useState("");
  const [selectedTechId, setSelectedTechId] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const [calendar, setCalendar] = React.useState<OrganizationCalendarResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [reloadToken, setReloadToken] = React.useState(0);

  const [inspectorTech, setInspectorTech] = React.useState<TechnicianCalendarRow | null>(null);
  const [inspectorDay, setInspectorDay] = React.useState<CalendarDayItem | null>(null);
  const [inspectorTab, setInspectorTab] = React.useState<string>("detail");
  const [weeklyOverview, setWeeklyOverview] = React.useState<WeeklyScheduleOverview | null>(null);
  const [exceptions, setExceptions] = React.useState<ScheduleExceptionItem[]>([]);
  const [audits, setAudits] = React.useState<ScheduleAuditItem[]>([]);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [detailLoadedAt, setDetailLoadedAt] = React.useState(0);

  const activeRange = React.useMemo(() => {
    if (customFrom && customTo && customTo >= customFrom) {
      return { from: customFrom, to: customTo };
    }
    return computeRange(anchorDate, viewMode);
  }, [anchorDate, viewMode, customFrom, customTo]);

  const [debouncedKeyword, setDebouncedKeyword] = React.useState(keyword);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedKeyword(keyword), 250);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  const fetchCalendar = React.useCallback(async () => {
    setLoading(true);
    setReloadToken((n) => n + 1);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function loadPendingCount() {
      const pendingReqs = await orgOpsHttpApi
        .listOrganizationScheduleRequests(organizationId, "PENDING")
        .catch(() => null);
      if (!cancelled && pendingReqs !== null) {
        setPendingRequestCount(pendingReqs.length);
      }
    }
    void loadPendingCount();
    return () => {
      cancelled = true;
    };
  }, [organizationId, reloadToken]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await orgOpsHttpApi.getOrganizationCalendar(organizationId, {
          from: activeRange.from,
          to: activeRange.to,
          technicianId: selectedTechId || undefined,
          keyword: debouncedKeyword || undefined,
          status: statusFilter,
        });
        if (!cancelled) {
          setCalendar(data);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Không thể tải lịch làm việc tổ chức"
          );
          setCalendar(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    organizationId,
    activeRange.from,
    activeRange.to,
    selectedTechId,
    debouncedKeyword,
    statusFilter,
    reloadToken,
  ]);

  async function loadTechnicianDetail(techId: string) {
    setLoadingDetail(true);
    try {
      const [overview, exList, auditList] = await Promise.all([
        orgOpsHttpApi.getTechnicianWeeklySchedule(organizationId, techId),
        orgOpsHttpApi.listTechnicianScheduleExceptions(organizationId, techId),
        orgOpsHttpApi.listTechnicianScheduleAudits(organizationId, techId),
      ]);
      setWeeklyOverview(overview);
      setExceptions(exList);
      setAudits(auditList);
      setDetailLoadedAt(Date.now());
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể tải chi tiết lịch KTV"
      );
    } finally {
      setLoadingDetail(false);
    }
  }

  function openInspector(
    row: TechnicianCalendarRow,
    day: CalendarDayItem | null,
    tab: "detail" | "weekly" | "exceptions" | "audits" = "detail"
  ) {
    setInspectorTech(row);
    setInspectorDay(day);
    setInspectorTab(tab);
    void loadTechnicianDetail(row.technicianId);
  }

  function openQuickScheduleModal() {
    const targetRow =
      calendar?.technicians.find((t) => t.technicianId === selectedTechId) ??
      calendar?.technicians[0] ??
      null;
    if (targetRow) {
      openInspector(targetRow, targetRow.days[0] ?? null, "weekly");
      return;
    }
    const fallback = initialTechnicians[0];
    if (!fallback) {
      toast.error("Tổ chức chưa có kỹ thuật viên nào. Vui lòng thêm KTV trước.");
      return;
    }
    openInspector(
      {
        technicianId: fallback.id,
        profileId: fallback.profileId,
        fullName: fallback.fullName,
        status: fallback.status,
        isOnline: true,
        specialties: fallback.specialties,
        timezone: "Asia/Ho_Chi_Minh",
        days: [],
      },
      null,
      "weekly"
    );
  }

  function shiftRange(direction: -1 | 1) {
    setCustomFrom("");
    setCustomTo("");
    const cur = parseIso(anchorDate);
    if (viewMode === "day") {
      setAnchorDate(formatIso(addDays(cur, direction)));
    } else if (viewMode === "week") {
      setAnchorDate(formatIso(addDays(cur, direction * 7)));
    } else {
      const next = new Date(cur.getFullYear(), cur.getMonth() + direction, 1);
      setAnchorDate(formatIso(next));
    }
  }

  function jumpToToday() {
    setCustomFrom("");
    setCustomTo("");
    setAnchorDate(todayIso());
  }

  async function handleQuickUnavailable(techId: string, date: string) {
    try {
      await orgOpsHttpApi.upsertTechnicianScheduleExceptions(organizationId, techId, {
        fromDate: date,
        toDate: date,
        exceptionType: "UNAVAILABLE",
        reason: "Đánh dấu nghỉ từ Lịch làm việc",
      });
      toast.success(`Đã đánh dấu nghỉ ngày ${formatShortDayHeader(date)}`);
      await Promise.all([fetchCalendar(), loadTechnicianDetail(techId)]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật trạng thái nghỉ"
      );
    }
  }

  const headerDays = React.useMemo(() => {
    if (calendar?.technicians[0]?.days?.length) {
      return calendar.technicians[0].days;
    }
    const list: { date: string; dayOfWeek: string }[] = [];
    const jsDow = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const start = parseIso(activeRange.from);
    const end = parseIso(activeRange.to);
    for (let d = start; d <= end; d = addDays(d, 1)) {
      list.push({ date: formatIso(d), dayOfWeek: jsDow[d.getDay()] });
    }
    return list;
  }, [calendar, activeRange.from, activeRange.to]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <Button
          type="button"
          size="sm"
          variant={workspaceTab === "calendar" ? "default" : "ghost"}
          onClick={() => setWorkspaceTab("calendar")}
        >
          Lịch làm việc
        </Button>
        <Button
          type="button"
          size="sm"
          variant={workspaceTab === "requests" ? "default" : "ghost"}
          onClick={() => setWorkspaceTab("requests")}
        >
          Yêu cầu từ KTV
          {pendingRequestCount > 0 ? (
            <Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-[10px]">
              {pendingRequestCount}
            </Badge>
          ) : null}
        </Button>
      </div>

      {workspaceTab === "requests" ? (
        <OrgScheduleRequestsPanel
          organizationId={organizationId}
          canManage={canManage}
          onReviewed={async () => {
            await fetchCalendar();
          }}
          onPendingCountChange={setPendingRequestCount}
        />
      ) : (
        <>
      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Lịch làm việc kỹ thuật viên
              </h2>
              <p className="text-xs text-muted-foreground">
                Nguồn lịch thống nhất (Asia/Ho_Chi_Minh) · Hiển thị cả lịch dự kiến vượt{" "}
                {calendar?.horizonDays ?? 30} ngày
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void fetchCalendar()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            {canManage ? (
              <Button type="button" size="sm" onClick={openQuickScheduleModal}>
                <Plus className="h-4 w-4" />
                Xếp lịch
              </Button>
            ) : (
              <Badge variant="secondary">Chế độ chỉ xem (ORG_STAFF)</Badge>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-12">
          <div className="relative md:col-span-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm tên hoặc mã Technician..."
              className="pl-9"
            />
          </div>

          <div className="md:col-span-3">
            <NativeSelect
              aria-label="Lọc theo kỹ thuật viên"
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
            >
              <NativeSelectOption value="">Tất cả kỹ thuật viên</NativeSelectOption>
              {initialTechnicians.map((t) => (
                <NativeSelectOption key={t.id} value={t.id}>
                  {t.fullName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="md:col-span-2">
            <NativeSelect
              aria-label="Lọc theo trạng thái lịch"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <NativeSelectOption value="ALL">Tất cả trạng thái</NativeSelectOption>
              <NativeSelectOption value="HAS_SHIFT">Có ca làm việc</NativeSelectOption>
              <NativeSelectOption value="AVAILABLE">Còn trống</NativeSelectOption>
              <NativeSelectOption value="BOOKED">Có booking</NativeSelectOption>
              <NativeSelectOption value="OFF">Nghỉ</NativeSelectOption>
              <NativeSelectOption value="UNSCHEDULED">Chưa có ca</NativeSelectOption>
            </NativeSelect>
          </div>

          <div className="flex items-center gap-1.5 md:col-span-3">
            <Input
              type="date"
              aria-label="Từ ngày"
              value={customFrom || activeRange.from}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setCustomFrom("");
                  setCustomTo("");
                  return;
                }
                setCustomFrom(val);
                if (!customTo || val > customTo) {
                  setCustomTo(formatIso(addDays(parseIso(val), 6)));
                }
              }}
              className="text-xs"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <Input
              type="date"
              aria-label="Đến ngày"
              value={customTo || activeRange.to}
              min={customFrom || activeRange.from}
              onChange={(e) => {
                if (!customFrom) setCustomFrom(activeRange.from);
                setCustomTo(e.target.value);
              }}
              className="text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => shiftRange(-1)}
              aria-label="Khoảng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[130px] text-center text-sm font-semibold tabular-nums">
              {formatShortDayHeader(activeRange.from)}
              {activeRange.from !== activeRange.to
                ? ` – ${formatShortDayHeader(activeRange.to)}`
                : ""}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => shiftRange(1)}
              aria-label="Khoảng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={jumpToToday}>
              Hôm nay
            </Button>
          </div>

          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
            {(
              [
                { id: "day", label: "Ngày" },
                { id: "week", label: "Tuần" },
                { id: "month", label: "Tháng" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setCustomFrom("");
                  setCustomTo("");
                  setViewMode(opt.id);
                }}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === opt.id && !customFrom
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !calendar || calendar.technicians.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <SlidersHorizontal className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Không có kỹ thuật viên phù hợp bộ lọc
            </p>
            <p className="text-xs text-muted-foreground">
              Thử đổi khoảng ngày, từ khóa tìm kiếm hoặc trạng thái lịch.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="sticky left-0 z-10 min-w-[200px] bg-card px-4 py-2.5 text-left font-semibold text-foreground">
                    Kỹ thuật viên
                  </th>
                  {headerDays.map((d) => (
                    <th
                      key={d.date}
                      className="min-w-[84px] px-1.5 py-2.5 text-center font-semibold text-muted-foreground"
                    >
                      <div>{DOW_LABELS[d.dayOfWeek] ?? d.dayOfWeek}</div>
                      <div className="text-[11px] font-normal tabular-nums">
                        {formatShortDayHeader(d.date)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {calendar.technicians.map((row) => (
                  <tr key={row.technicianId} className="hover:bg-muted/15">
                    <td className="sticky left-0 z-10 bg-card px-4 py-3 align-middle">
                      <button
                        type="button"
                        onClick={() => openInspector(row, row.days[0] ?? null, "weekly")}
                        className="text-left group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground group-hover:text-primary">
                            {row.fullName}
                          </span>
                          <span
                            title={
                              row.isOnline
                                ? "Đang bật Online (sẵn sàng nhận booking tức thời)"
                                : "Đang Offline (không nhận booking tức thời)"
                            }
                            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              row.isOnline
                                ? "bg-success/15 text-success"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                row.isOnline ? "bg-success" : "bg-muted-foreground"
                              }`}
                            />
                            {row.isOnline ? "Online" : "Offline"}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {row.specialties.join(", ") || "Đa năng"}
                        </div>
                      </button>
                    </td>
                    {row.days.map((day) => {
                      const summary = dayCellSummary(day);
                      return (
                        <td key={day.date} className="p-1.5 align-middle">
                          <button
                            type="button"
                            onClick={() => openInspector(row, day, "detail")}
                            className={`w-full min-h-[54px] rounded-lg border px-1.5 py-1.5 text-center transition-colors ${dayCellTone(day)}`}
                          >
                            <div className="font-semibold leading-tight tabular-nums">
                              {summary.primary}
                            </div>
                            {summary.secondary ? (
                              <div className="mt-0.5 text-[10px] opacity-80 tabular-nums">
                                {summary.secondary}
                              </div>
                            ) : null}
                            {day.projected ? (
                              <div className="mt-0.5 text-[9px] uppercase tracking-wide opacity-70">
                                Dự kiến
                              </div>
                            ) : null}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 border-t border-border bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
            Có ca (còn trống)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-info/70" />
            Có booking
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
            Nghỉ phép / Nghỉ tuần
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            Không có ca
          </span>
        </div>
      </Card>

      <ContextInspector
        open={Boolean(inspectorTech)}
        onClose={() => {
          setInspectorTech(null);
          setInspectorDay(null);
        }}
        title={
          inspectorTech
            ? `Lịch làm việc — ${inspectorTech.fullName}`
            : "Chi tiết lịch làm việc"
        }
        subtitle={
          inspectorDay
            ? `Ngày ${formatShortDayHeader(inspectorDay.date)} (${DOW_LABELS[inspectorDay.dayOfWeek] ?? inspectorDay.dayOfWeek})`
            : inspectorTech?.timezone ?? "Asia/Ho_Chi_Minh"
        }
      >
        {inspectorTech ? (
          <Tabs value={inspectorTab} onValueChange={setInspectorTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="detail">Chi tiết ngày</TabsTrigger>
              <TabsTrigger value="weekly" disabled={!canManage}>
                Lịch tuần
              </TabsTrigger>
              <TabsTrigger value="exceptions" disabled={!canManage}>
                Ngoại lệ
              </TabsTrigger>
              <TabsTrigger value="audits">Lịch sử</TabsTrigger>
            </TabsList>

            <TabsContent value="detail" className="space-y-3">
              {inspectorDay ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/25 p-3 text-xs">
                    <div>
                      <div className="font-semibold text-foreground">
                        Trạng thái: {inspectorDay.dayStatus}
                        {inspectorDay.projected ? " (Dự kiến ngoài horizon)" : ""}
                      </div>
                      {inspectorDay.exceptionReason ? (
                        <div className="text-muted-foreground mt-0.5">
                          Lý do ngoại lệ: {inspectorDay.exceptionReason}
                        </div>
                      ) : null}
                    </div>
                    <Badge variant={inspectorTech.isOnline ? "success" : "secondary"}>
                      {inspectorTech.isOnline ? "KTV Online" : "KTV Offline"}
                    </Badge>
                  </div>

                  {inspectorDay.slots.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3">
                      Không có ca làm việc nào trong ngày này.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {inspectorDay.slots.map((slot, idx) => (
                        <div
                          key={slot.windowId ?? `${slot.startsAt}-${idx}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-semibold text-foreground tabular-nums">
                              <Clock className="h-3.5 w-3.5 text-primary" />
                              {slot.localStartTime} – {slot.localEndTime}
                            </div>
                            <div className="text-muted-foreground">
                              Nguồn: {slot.source}
                              {slot.allocatedBookingId
                                ? ` · Booking #${slot.allocatedBookingId.slice(0, 8)}`
                                : ""}
                            </div>
                          </div>
                          <Badge
                            variant={
                              slot.status === "BOOKED"
                                ? "default"
                                : slot.status === "AVAILABLE"
                                  ? "success"
                                  : "secondary"
                            }
                          >
                            {slot.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {canManage ? (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void handleQuickUnavailable(
                            inspectorTech.technicianId,
                            inspectorDay.date
                          )
                        }
                      >
                        Cho nghỉ ngày này
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setInspectorTab("exceptions")}
                      >
                        Đổi giờ / Thêm giờ ngày này
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Chọn một ô ngày trên bảng lịch để xem chi tiết ca và booking.
                </p>
              )}
            </TabsContent>

            <TabsContent value="weekly">
              {loadingDetail ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <TechnicianWeeklyScheduleEditor
                  key={`${inspectorTech.technicianId}-${detailLoadedAt}`}
                  organizationId={organizationId}
                  technicianId={inspectorTech.technicianId}
                  overview={weeklyOverview}
                  onSaved={async () => {
                    await Promise.all([
                      fetchCalendar(),
                      loadTechnicianDetail(inspectorTech.technicianId),
                    ]);
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="exceptions">
              {loadingDetail ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <TechnicianScheduleExceptionsTab
                  organizationId={organizationId}
                  technicianId={inspectorTech.technicianId}
                  exceptions={exceptions}
                  onChanged={async () => {
                    await Promise.all([
                      fetchCalendar(),
                      loadTechnicianDetail(inspectorTech.technicianId),
                    ]);
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="audits" className="space-y-2">
              {loadingDetail ? (
                <Skeleton className="h-32 w-full" />
              ) : audits.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">
                  Chưa có lịch sử chỉnh sửa lịch làm việc cho kỹ thuật viên này.
                </p>
              ) : (
                audits.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg border border-border p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                        <History className="h-3.5 w-3.5 text-muted-foreground" />
                        {a.action}
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {formatDateTime(a.createdAt)}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Người thực hiện: {a.actorId.slice(0, 12)}
                      {a.affectedFrom
                        ? ` · Hiệu lực: ${a.affectedFrom}${a.affectedTo ? ` → ${a.affectedTo}` : ""}`
                        : ""}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </ContextInspector>
        </>
      )}
    </div>
  );
}
