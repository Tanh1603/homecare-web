"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Calendar, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { OrgTechnicianItem } from "../api/org-ops.adapter";
import { orgOpsHttpApi, type ScheduleWindowItem } from "../api/org-ops.http";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
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
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<OrgTechnicianItem | null>(
    null
  );
  const [saving, setSaving] = React.useState(false);

  const [profileId, setProfileId] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [specialtiesText, setSpecialtiesText] = React.useState("Điện lạnh");
  const [experienceYears, setExperienceYears] = React.useState("2");
  const [status, setStatus] = React.useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const [scheduleTech, setScheduleTech] =
    React.useState<OrgTechnicianItem | null>(null);
  const [schedules, setSchedules] = React.useState<ScheduleWindowItem[]>([]);
  const [loadingSchedules, setLoadingSchedules] = React.useState(false);
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");

  function openCreate() {
    setEditTarget(null);
    setProfileId("");
    setFullName("");
    setSpecialtiesText("Điện lạnh");
    setExperienceYears("2");
    setStatus("ACTIVE");
    setModalOpen(true);
  }

  function openEdit(t: OrgTechnicianItem) {
    setEditTarget(t);
    setProfileId(t.profileId);
    setFullName(t.fullName);
    setSpecialtiesText(t.specialties.join(", ") || "Điện lạnh");
    setExperienceYears(String(t.experienceYears ?? 0));
    setStatus(t.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
    setModalOpen(true);
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
        const created = await orgOpsHttpApi.createTechnician(organizationId, {
          profileId: profileId.trim(),
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
      setModalOpen(false);
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
              <TableHead>Profile ID</TableHead>
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
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {t.phone}
                </TableCell>
                <TableCell>{t.specialty}</TableCell>
                <TableCell>
                  {t.experienceYears !== undefined
                    ? `${t.experienceYears} năm`
                    : "—"}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 font-medium">
                    {t.rating.toFixed(1)}
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openSchedules(t)}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Lịch
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(t)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(t)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Cập nhật kỹ thuật viên" : "Thêm kỹ thuật viên"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            {!editTarget ? (
              <div className="space-y-1">
                <Label htmlFor="tech-profile-id">Profile ID (Supabase UUID)</Label>
                <Input
                  id="tech-profile-id"
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                  required
                />
              </div>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="tech-name">Họ và tên</Label>
              <Input
                id="tech-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tech-spec">Chuyên môn (phân cách bằng dấu phẩy)</Label>
              <Input
                id="tech-spec"
                value={specialtiesText}
                onChange={(e) => setSpecialtiesText(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="tech-exp">Số năm kinh nghiệm</Label>
                <Input
                  id="tech-exp"
                  type="number"
                  min={0}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tech-status">Trạng thái</Label>
                <select
                  id="tech-status"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "ACTIVE" | "INACTIVE")
                  }
                  className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(scheduleTech)}
        onOpenChange={(open) => {
          if (!open) setScheduleTech(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lịch làm việc — {scheduleTech?.fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <form onSubmit={handleAddSchedule} className="grid gap-2 sm:grid-cols-3">
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
              <Button type="submit" size="sm" disabled={saving}>
                Thêm khung giờ
              </Button>
            </form>

            {loadingSchedules ? (
              <p className="text-xs text-muted-foreground">Đang tải lịch...</p>
            ) : schedules.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Chưa có khung giờ làm việc nào.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {schedules.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs"
                  >
                    <span>
                      {formatDateTime(w.startTime)} → {formatDateTime(w.endTime)}
                    </span>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
