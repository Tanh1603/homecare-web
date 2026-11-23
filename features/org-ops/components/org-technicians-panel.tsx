"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Calendar, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { OrgTechnicianItem } from "../api/org-ops.adapter";
import { orgOpsHttpApi, type ScheduleWindowItem } from "../api/org-ops.http";
import {
  AccountProvisioningStep,
  type ProvisionedAccountInfo,
} from "@/features/organizations/components/account-provisioning-step";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ContextInspector } from "@/shared/ui/context-inspector";
import { FormDrawer, FormField, FormSection } from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { RowActionsMenu } from "@/shared/ui/row-actions-menu";
import { StatusBadge } from "@/shared/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { formatDateTime } from "@/shared/lib/utils";

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
  const [saving, setSaving] = React.useState(false);

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
  const [loadingSchedules, setLoadingSchedules] = React.useState(false);
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");

  const currentSnapshot = JSON.stringify({
    provisionedId: provisioned?.userId ?? null,
    fullName,
    specialtiesText,
    experienceYears,
    status,
  });
  const isDirty = drawerOpen && currentSnapshot !== initialSnapshot;

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

  function openEdit(t: OrgTechnicianItem) {
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
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const specialties = specialtiesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (editTarget) {
        const updated = await orgOpsHttpApi.updateTechnician(
          organizationId,
          editTarget.id,
          {
            fullName: fullName.trim(),
            specialties: specialties.length > 0 ? specialties : ["Đa năng"],
            experienceYears: Math.max(0, Number(experienceYears) || 0),
            status,
          }
        );
        setTechs((prev) =>
          prev.map((t) =>
            t.id === editTarget.id
              ? {
                  ...t,
                  ...updated,
                  specialty:
                    updated.specialties?.join(", ") ||
                    specialties.join(", ") ||
                    t.specialty,
                }
              : t
          )
        );
        toast.success("Đã cập nhật kỹ thuật viên");
      } else {
        if (!provisioned) {
          toast.error("Vui lòng tạo & xác thực tài khoản ở Bước 1 trước");
          return;
        }
        const created = await orgOpsHttpApi.createTechnician(organizationId, {
          profileId: provisioned.userId,
          fullName: fullName.trim(),
          specialties: specialties.length > 0 ? specialties : ["Đa năng"],
          experienceYears: Math.max(0, Number(experienceYears) || 0),
          status,
        });
        setTechs((prev) => [
          {
            ...created,
            phone: created.profileId,
            specialty:
              created.specialties?.join(", ") || specialties.join(", "),
            rating: 0,
          },
          ...prev,
        ]);
        toast.success("Đã thêm kỹ thuật viên");
      }
      setDrawerOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể lưu kỹ thuật viên"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: OrgTechnicianItem) {
    try {
      await orgOpsHttpApi.deleteTechnician(organizationId, t.id);
      setTechs((prev) => prev.filter((item) => item.id !== t.id));
      toast.success("Đã xóa kỹ thuật viên");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa kỹ thuật viên"
      );
    }
  }

  async function openSchedules(t: OrgTechnicianItem) {
    setScheduleTech(t);
    setLoadingSchedules(true);
    try {
      const items = await orgOpsHttpApi.listTechnicianSchedules(
        organizationId,
        t.id
      );
      setSchedules(items);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể tải lịch làm việc"
      );
      setSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  }

  async function handleAddSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleTech || !startTime || !endTime) return;
    setSaving(true);
    try {
      const created = await orgOpsHttpApi.createTechnicianSchedule(
        organizationId,
        scheduleTech.id,
        {
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          available: true,
        }
      );
      setSchedules((prev) => [...prev, created]);
      setStartTime("");
      setEndTime("");
      toast.success("Đã thêm khung giờ làm việc");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể thêm lịch làm việc"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSchedule(w: ScheduleWindowItem) {
    if (!scheduleTech) return;
    try {
      await orgOpsHttpApi.deleteTechnicianSchedule(
        organizationId,
        scheduleTech.id,
        w.id,
        w.version
      );
      setSchedules((prev) => prev.filter((item) => item.id !== w.id));
      toast.success("Đã xóa khung giờ");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa khung giờ"
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Thêm kỹ thuật viên
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Chuyên môn</TableHead>
              <TableHead>Kinh nghiệm</TableHead>
              <TableHead>Đánh giá</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {techs.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.fullName}</TableCell>
                <TableCell>{t.specialty}</TableCell>
                <TableCell>
                  {t.experienceYears !== undefined
                    ? `${t.experienceYears} năm`
                    : "—"}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 font-medium tabular-nums">
                    {t.rating.toFixed(1)}
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell className="w-[1%] whitespace-nowrap text-right">
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
                            onSelect: () => handleDelete(t),
                          },
                        ],
                      },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

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
                  <select
                    id="tech-status"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as "ACTIVE" | "INACTIVE")
                    }
                    className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm text-foreground"
                  >
                    <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
                    <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
                  </select>
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
        subtitle="Quản lý các khung giờ sẵn sàng nhận lịch hẹn của kỹ thuật viên."
        className="max-w-lg"
      >
        <form onSubmit={handleAddSchedule} className="space-y-3">
          <FormSection
            title="Thêm khung giờ mới"
            description="Chọn thời gian bắt đầu và kết thúc ca trực."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Bắt đầu" htmlFor="sched-start" required>
                <Input
                  id="sched-start"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Kết thúc" htmlFor="sched-end" required>
                <Input
                  id="sched-end"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </FormField>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={saving}>
                <Plus className="h-3.5 w-3.5" />
                Thêm khung giờ
              </Button>
            </div>
          </FormSection>
        </form>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground">
            Khung giờ đã đăng ký ({schedules.length})
          </h3>
          {loadingSchedules ? (
            <p className="text-xs text-muted-foreground">
              Đang tải lịch làm việc...
            </p>
          ) : schedules.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Chưa có khung giờ làm việc nào.
            </p>
          ) : (
            <div className="space-y-2">
              {schedules.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface-secondary/50 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {formatDateTime(w.startTime)} →{" "}
                      {formatDateTime(w.endTime)}
                    </p>
                    <p className="text-muted-foreground">
                      {w.available ? "Sẵn sàng" : "Đã khóa"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteSchedule(w)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ContextInspector>
    </div>
  );
}
