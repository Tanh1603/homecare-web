"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { OrgTechnicianItem } from "../api/org-ops.adapter";
import {
  orgOpsHttpApi,
  type ScheduleExceptionItem,
  type ScheduleWindowItem,
  type WeeklyScheduleOverview,
} from "../api/org-ops.http";
import { TechnicianWeeklyScheduleEditor } from "./technician-weekly-schedule-editor";
import { TechnicianScheduleExceptionsTab } from "./technician-schedule-exceptions-tab";
import {
  AccountProvisioningStep,
  type ProvisionedAccountInfo,
} from "@/features/organizations/components/account-provisioning-step";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ContextInspector } from "@/shared/ui/context-inspector";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { FormDrawer, FormField, FormSection } from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { RowActionsMenu } from "@/shared/ui/row-actions-menu";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { formatDateTime } from "@/shared/lib/utils";

function todayLocalDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function currentEpochMs(): number {
  return Date.now();
}

export function OrgTechniciansPanel({
  organizationId,
  initialTechnicians,
}: {
  organizationId: string;
  initialTechnicians: OrgTechnicianItem[];
}) {
  const router = useRouter();
  const [techs, setTechs] =
    React.useState<OrgTechnicianItem[]>(initialTechnicians);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<OrgTechnicianItem | null>(
    null
  );

  const [provisioned, setProvisioned] =
    React.useState<ProvisionedAccountInfo | null>(null);
  const [fullName, setFullName] = React.useState("");
  const [specialtiesText, setSpecialtiesText] = React.useState("Điện lạnh");
  const [experienceYears, setExperienceYears] = React.useState("2");
  const [status, setStatus] = React.useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [initialSnapshot, setInitialSnapshot] = React.useState("");

  const [scheduleTech, setScheduleTech] =
    React.useState<OrgTechnicianItem | null>(null);
  const [schedules, setSchedules] = React.useState<ScheduleWindowItem[]>([]);
  const [weeklyOverview, setWeeklyOverview] =
    React.useState<WeeklyScheduleOverview | null>(null);
  const [scheduleExceptions, setScheduleExceptions] = React.useState<
    ScheduleExceptionItem[]
  >([]);
  const [scheduleLoadedAt, setScheduleLoadedAt] = React.useState(0);
  const [scheduleDate, setScheduleDate] = React.useState(todayLocalDate);
  const [startTime, setStartTime] = React.useState("08:00:00");
  const [endTime, setEndTime] = React.useState("17:00:00");

  const currentSnapshot = JSON.stringify({
    provisionedId: provisioned?.userId ?? null,
    fullName,
    specialtiesText,
    experienceYears,
    status,
  });
  const isDirty = drawerOpen && currentSnapshot !== initialSnapshot;

  const saveTechMutation = useMutation({
    mutationFn: async (vars: {
      editTarget: OrgTechnicianItem | null;
      provisionedUserId?: string;
      fullName: string;
      specialties: string[];
      experienceYears: number;
      status: "ACTIVE" | "INACTIVE";
    }) => {
      if (vars.editTarget) {
        const updated = await orgOpsHttpApi.updateTechnician(
          organizationId,
          vars.editTarget.id,
          {
            fullName: vars.fullName,
            specialties: vars.specialties,
            experienceYears: vars.experienceYears,
            status: vars.status,
          }
        );
        return { mode: "update" as const, updated, specialties: vars.specialties };
      }
      const created = await orgOpsHttpApi.createTechnician(organizationId, {
        profileId: vars.provisionedUserId ?? "",
        fullName: vars.fullName,
        specialties: vars.specialties,
        experienceYears: vars.experienceYears,
        status: vars.status,
      });
      return { mode: "create" as const, created, specialties: vars.specialties };
    },
    onSuccess: (res, vars) => {
      if (res.mode === "update" && vars.editTarget) {
        setTechs((prev) =>
          prev.map((t) =>
            t.id === vars.editTarget?.id
              ? {
                  ...t,
                  ...res.updated,
                  specialty:
                    res.updated.specialties?.join(", ") ||
                    res.specialties.join(", ") ||
                    t.specialty,
                }
              : t
          )
        );
        toast.success("Đã cập nhật kỹ thuật viên");
      } else if (res.mode === "create") {
        setTechs((prev) => [
          {
            ...res.created,
            phone: res.created.profileId,
            specialty:
              res.created.specialties?.join(", ") || res.specialties.join(", "),
            rating: 0,
          },
          ...prev,
        ]);
        toast.success("Đã thêm kỹ thuật viên");
      }
      setDrawerOpen(false);
      router.refresh();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể lưu kỹ thuật viên"
      );
    },
  });

  const deleteTechMutation = useMutation({
    mutationFn: (t: OrgTechnicianItem) =>
      orgOpsHttpApi.deleteTechnician(organizationId, t.id),
    onSuccess: (_res, t) => {
      setTechs((prev) => prev.filter((item) => item.id !== t.id));
      toast.success("Đã xóa kỹ thuật viên");
      router.refresh();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa kỹ thuật viên"
      );
    },
  });

  const loadScheduleMutation = useMutation({
    mutationFn: async (techId: string) => {
      const [items, overview, exceptions] = await Promise.all([
        orgOpsHttpApi.listTechnicianSchedules(organizationId, techId),
        orgOpsHttpApi.getTechnicianWeeklySchedule(organizationId, techId),
        orgOpsHttpApi.listTechnicianScheduleExceptions(organizationId, techId),
      ]);
      return { items, overview, exceptions };
    },
    onSuccess: ({ items, overview, exceptions }) => {
      setSchedules(items);
      setWeeklyOverview(overview);
      setScheduleExceptions(exceptions);
      setScheduleLoadedAt(currentEpochMs());
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể tải lịch làm việc"
      );
      setSchedules([]);
    },
  });

  const addScheduleMutation = useMutation({
    mutationFn: (vars: { techId: string; startsAt: string; endsAt: string }) =>
      orgOpsHttpApi.createTechnicianSchedule(organizationId, vars.techId, {
        startsAt: vars.startsAt,
        endsAt: vars.endsAt,
      }),
    onSuccess: (created) => {
      setSchedules((prev) => [...prev, created]);
      toast.success("Đã thêm khung giờ làm việc");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể thêm lịch làm việc"
      );
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (vars: { techId: string; window: ScheduleWindowItem }) => {
      await orgOpsHttpApi.deleteTechnicianSchedule(
        organizationId,
        vars.techId,
        vars.window.id,
        vars.window.version
      );
      if (vars.window.source === "RECURRING") {
        return orgOpsHttpApi
          .listTechnicianScheduleExceptions(organizationId, vars.techId)
          .catch(() => null);
      }
      return null;
    },
    onSuccess: (refreshedExceptions, vars) => {
      setSchedules((prev) => prev.filter((item) => item.id !== vars.window.id));
      if (refreshedExceptions !== null) {
        setScheduleExceptions(refreshedExceptions);
      }
      toast.success("Đã xóa khung giờ");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa khung giờ"
      );
    },
  });

  const saving = saveTechMutation.isPending || addScheduleMutation.isPending;
  const loadingSchedules = loadScheduleMutation.isPending;

  function openCreate() {
    setEditTarget(null);
    setProvisioned(null);
    setFullName("");
    setSpecialtiesText("Điện lạnh");
    setExperienceYears("2");
    setStatus("ACTIVE");
    setInitialSnapshot(
      JSON.stringify({
        provisionedId: null,
        fullName: "",
        specialtiesText: "Điện lạnh",
        experienceYears: "2",
        status: "ACTIVE",
      })
    );
    setDrawerOpen(true);
  }

  const openEdit = React.useCallback((t: OrgTechnicianItem) => {
    const spec = t.specialties.join(", ") || "Điện lạnh";
    const exp = String(t.experienceYears ?? 0);
    const st = t.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
    setEditTarget(t);
    setProvisioned(null);
    setFullName(t.fullName);
    setSpecialtiesText(spec);
    setExperienceYears(exp);
    setStatus(st);
    setInitialSnapshot(
      JSON.stringify({
        provisionedId: null,
        fullName: t.fullName,
        specialtiesText: spec,
        experienceYears: exp,
        status: st,
      })
    );
    setDrawerOpen(true);
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const specialties = specialtiesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!editTarget && !provisioned) {
      toast.error("Vui lòng tạo & xác thực tài khoản ở Bước 1 trước");
      return;
    }
    saveTechMutation.mutate({
      editTarget,
      provisionedUserId: provisioned?.userId,
      fullName: fullName.trim(),
      specialties: specialties.length > 0 ? specialties : ["Đa năng"],
      experienceYears: Math.max(0, Number(experienceYears) || 0),
      status,
    });
  }

  async function refreshScheduleBundle(techId: string) {
    await loadScheduleMutation.mutateAsync(techId).catch(() => {});
  }

  const openSchedules = React.useCallback(
    (t: OrgTechnicianItem) => {
      setScheduleTech(t);
      loadScheduleMutation.mutate(t.id);
    },
    [loadScheduleMutation]
  );

  function handleAddSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleTech || !scheduleDate || !startTime || !endTime) return;
    const startsAt = new Date(`${scheduleDate}T${startTime}`);
    const endsAt = new Date(`${scheduleDate}T${endTime}`);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      toast.error("Ngày hoặc giờ không hợp lệ.");
      return;
    }
    if (endsAt <= startsAt) {
      toast.error("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }
    addScheduleMutation.mutate({
      techId: scheduleTech.id,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
  }

  function handleDeleteSchedule(w: ScheduleWindowItem) {
    if (!scheduleTech) return;
    deleteScheduleMutation.mutate({ techId: scheduleTech.id, window: w });
  }

  const columns = React.useMemo<DataTableColumn<OrgTechnicianItem>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Họ tên",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.fullName}</span>
        ),
      },
      {
        accessorKey: "specialty",
        header: "Chuyên môn",
      },
      {
        accessorKey: "experienceYears",
        header: "Kinh nghiệm",
        cell: ({ row }) => (
          <span>
            {row.original.experienceYears !== undefined
              ? `${row.original.experienceYears} năm`
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "rating",
        header: "Đánh giá",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 font-medium tabular-nums">
            {row.original.rating.toFixed(1)}
            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: () => <div className="text-right">Thao tác</div>,
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="text-right">
              <RowActionsMenu
                ariaLabel={`Thao tác cho kỹ thuật viên ${t.fullName}`}
                groups={[
                  {
                    id: "manage",
                    items: [
                      {
                        id: "schedules",
                        label: "Lịch làm việc",
                        icon: Calendar,
                        onSelect: () => openSchedules(t),
                      },
                      {
                        id: "edit-tech",
                        label: "Chỉnh sửa thông tin",
                        icon: Pencil,
                        onSelect: () => openEdit(t),
                      },
                    ],
                  },
                  {
                    id: "danger",
                    items: [
                      {
                        id: "delete-tech",
                        label: "Xóa kỹ thuật viên",
                        icon: Trash2,
                        destructive: true,
                        onSelect: () => deleteTechMutation.mutate(t),
                      },
                    ],
                  },
                ]}
              />
            </div>
          );
        },
      },
    ],
    [deleteTechMutation, openEdit, openSchedules]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/org/schedules">
            <Calendar className="h-4 w-4" />
            Lịch làm việc tập trung
          </Link>
        </Button>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Thêm kỹ thuật viên
        </Button>
      </div>

      <DataTable
        hideSearch
        serverSide
        data={techs}
        columns={columns}
        emptyMessage="Chưa có kỹ thuật viên nào."
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editTarget ? "Cập nhật kỹ thuật viên" : "Thêm kỹ thuật viên mới"}
        description={
          editTarget
            ? "Điều chỉnh hồ sơ chuyên môn và trạng thái nhận việc của kỹ thuật viên."
            : "Tạo tài khoản xác thực ở Bước 1, sau đó thiết lập hồ sơ kỹ thuật ở Bước 2."
        }
        isDirty={isDirty}
        saving={saving}
        submitLabel={editTarget ? "Lưu cập nhật" : "Tạo kỹ thuật viên"}
        submitDisabled={!editTarget && !provisioned}
        formId="tech-step2-form"
        size="lg"
      >
        {!editTarget ? (
          <AccountProvisioningStep
            organizationId={organizationId}
            provisioned={provisioned}
            onProvisioned={(acc) => {
              setProvisioned(acc);
              if (acc) setFullName(acc.fullName);
            }}
          />
        ) : null}

        {!editTarget && !provisioned ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
            Bước 2 (Họ tên, chuyên môn, số năm kinh nghiệm) sẽ mở khóa sau khi
            hoàn tất tạo tài khoản ở Bước 1.
          </div>
        ) : (
          <form id="tech-step2-form" onSubmit={handleSave} className="space-y-4">
            <FormSection
              title={
                editTarget
                  ? "Thông tin kỹ thuật viên"
                  : "2. Thông tin kỹ thuật viên"
              }
              description="Chuyên môn và kinh nghiệm phục vụ điều phối lịch hẹn."
            >
              <FormField label="Họ và tên" htmlFor="tech-name" required>
                <Input
                  id="tech-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </FormField>
              <FormField
                label="Chuyên môn"
                htmlFor="tech-spec"
                required
                hint="Phân cách nhiều chuyên môn bằng dấu phẩy (VD: Điện lạnh, Máy giặt)."
              >
                <Input
                  id="tech-spec"
                  value={specialtiesText}
                  onChange={(e) => setSpecialtiesText(e.target.value)}
                  required
                />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  label="Số năm kinh nghiệm"
                  htmlFor="tech-exp"
                  required
                >
                  <Input
                    id="tech-exp"
                    type="number"
                    min={0}
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    required
                  />
                </FormField>
                <FormField label="Trạng thái nhận việc" htmlFor="tech-status">
                  <NativeSelect
                    id="tech-status"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as "ACTIVE" | "INACTIVE")
                    }
                  >
                    <NativeSelectOption value="ACTIVE">Đang hoạt động (ACTIVE)</NativeSelectOption>
                    <NativeSelectOption value="INACTIVE">Tạm ngưng (INACTIVE)</NativeSelectOption>
                  </NativeSelect>
                </FormField>
              </div>
            </FormSection>
          </form>
        )}
      </FormDrawer>

      <ContextInspector
        open={Boolean(scheduleTech)}
        onClose={() => setScheduleTech(null)}
        title={`Lịch làm việc — ${scheduleTech?.fullName ?? ""}`}
        subtitle="Thiết lập lịch tuần định kỳ, ngày nghỉ / đổi ca ngoại lệ và xem khung giờ thực tế nhận Booking."
        className="max-w-2xl"
      >
        {scheduleTech ? (
          <Tabs defaultValue="weekly" className="w-full">
            <TabsList>
              <TabsTrigger value="weekly">Lịch tuần</TabsTrigger>
              <TabsTrigger value="exceptions">
                Ngày ngoại lệ ({scheduleExceptions.length})
              </TabsTrigger>
              <TabsTrigger value="windows">
                Khung giờ thực tế ({schedules.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="weekly">
              <TechnicianWeeklyScheduleEditor
                key={`${scheduleTech.id}-${weeklyOverview?.currentRule?.id ?? "none"}-${weeklyOverview?.currentRule?.version ?? 0}-${weeklyOverview?.upcomingRules?.length ?? 0}`}
                organizationId={organizationId}
                technicianId={scheduleTech.id}
                overview={weeklyOverview}
                onSaved={async () => {
                  await refreshScheduleBundle(scheduleTech.id);
                }}
              />
            </TabsContent>

            <TabsContent value="exceptions">
              <TechnicianScheduleExceptionsTab
                organizationId={organizationId}
                technicianId={scheduleTech.id}
                exceptions={scheduleExceptions}
                onChanged={async () => {
                  await refreshScheduleBundle(scheduleTech.id);
                }}
              />
            </TabsContent>

            <TabsContent value="windows" className="space-y-4">
              <form onSubmit={handleAddSchedule} className="space-y-3">
                <FormSection
                  title="Thêm khung giờ thủ công (1 ngày)"
                  description="Dùng cho khung giờ bổ sung thủ công. Khung giờ thủ công được bảo toàn khi đồng bộ lịch tuần."
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FormField label="Ngày làm việc" htmlFor="sched-date" required>
                      <Input
                        id="sched-date"
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        required
                      />
                    </FormField>
                    <FormField label="Giờ bắt đầu" htmlFor="sched-start" required>
                      <Input
                        id="sched-start"
                        type="time"
                        step="1"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        required
                      />
                    </FormField>
                    <FormField label="Giờ kết thúc" htmlFor="sched-end" required>
                      <Input
                        id="sched-end"
                        type="time"
                        step="1"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        required
                      />
                    </FormField>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={saving}>
                      <Plus className="h-3.5 w-3.5" />
                      Thêm khung giờ thủ công
                    </Button>
                  </div>
                </FormSection>
              </form>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground">
                  Khung giờ thực tế ({schedules.length})
                </h3>
                {loadingSchedules ? (
                  <div
                    className="space-y-2"
                    role="status"
                    aria-label="Đang tải lịch làm việc"
                    aria-busy="true"
                  >
                    {[0, 1].map((row) => (
                      <div
                        key={row}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                      >
                        <div className="space-y-2">
                          <Skeleton className="h-3.5 w-48 max-w-full" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    ))}
                  </div>
                ) : schedules.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Chưa có khung giờ làm việc nào. Hãy thiết lập ở tab{" "}
                    <strong>Lịch tuần</strong>.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {schedules.map((w) => {
                      const isBooked =
                        w.status === "BOOKED" || Boolean(w.allocatedBookingId);
                      const isExpired =
                        scheduleLoadedAt > 0 &&
                        new Date(w.endsAt).getTime() <= scheduleLoadedAt;
                      return (
                        <div
                          key={w.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-surface-secondary/50 px-3 py-2 text-xs"
                        >
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">
                              {formatDateTime(w.startsAt)} →{" "}
                              {formatDateTime(w.endsAt)}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge
                                variant={
                                  isBooked
                                    ? "warning"
                                    : isExpired
                                      ? "secondary"
                                      : w.status === "AVAILABLE"
                                        ? "success"
                                        : "destructive"
                                }
                              >
                                {isBooked
                                  ? "Đã phân công"
                                  : isExpired
                                    ? "Hết hạn"
                                    : w.status === "AVAILABLE"
                                      ? "Sẵn sàng"
                                      : "Đã khóa"}
                              </Badge>
                              <Badge variant="outline">
                                {w.source === "RECURRING"
                                  ? "Định kỳ"
                                  : "Thủ công"}
                              </Badge>
                            </div>
                          </div>
                          {!isBooked ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              title={
                                w.source === "RECURRING"
                                  ? "Xóa khung giờ (sẽ đánh dấu nghỉ khung giờ này để không tự sinh lại)"
                                  : "Xóa khung giờ thủ công"
                              }
                              onClick={() => handleDeleteSchedule(w)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </ContextInspector>
    </div>
  );
}
