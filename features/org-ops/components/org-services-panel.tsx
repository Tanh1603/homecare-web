"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { OrgServiceItem } from "../api/org-ops.adapter";
import { orgOpsHttpApi } from "../api/org-ops.http";
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
import { Textarea } from "@/shared/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { formatVnd } from "@/shared/lib/utils";

export function OrgServicesPanel({
  organizationId,
  initialServices,
}: {
  organizationId: string;
  initialServices: OrgServiceItem[];
}) {
  const router = useRouter();
  const [services, setServices] =
    React.useState<OrgServiceItem[]>(initialServices);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<OrgServiceItem | null>(
    null
  );
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("Điện lạnh");
  const [basePrice, setBasePrice] = React.useState("250000");
  const [duration, setDuration] = React.useState("60");
  const [description, setDescription] = React.useState("");
  const [active, setActive] = React.useState(true);

  function openCreate() {
    setEditTarget(null);
    setName("");
    setCategory("Điện lạnh");
    setBasePrice("250000");
    setDuration("60");
    setDescription("");
    setActive(true);
    setModalOpen(true);
  }

  function openEdit(s: OrgServiceItem) {
    setEditTarget(s);
    setName(s.name);
    setCategory(s.category);
    setBasePrice(String(s.basePrice));
    setDuration(String(s.estimatedDurationMinutes));
    setDescription(s.description ?? "");
    setActive(s.active);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category: category.trim(),
        description: description.trim() || undefined,
        basePrice: Math.max(0, Number(basePrice) || 0),
        estimatedDurationMinutes: Math.max(15, Number(duration) || 60),
        active,
      };
      if (editTarget) {
        const updated = await orgOpsHttpApi.updateService(
          organizationId,
          editTarget.id,
          payload
        );
        setServices((prev) =>
          prev.map((s) =>
            s.id === editTarget.id
              ? { ...updated, status: updated.active ? "ACTIVE" : "INACTIVE" }
              : s
          )
        );
        toast.success("Đã cập nhật dịch vụ");
      } else {
        const created = await orgOpsHttpApi.createService(
          organizationId,
          payload
        );
        setServices((prev) => [
          { ...created, status: created.active ? "ACTIVE" : "INACTIVE" },
          ...prev,
        ]);
        toast.success("Đã tạo dịch vụ mới");
      }
      setModalOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể lưu dịch vụ"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: OrgServiceItem) {
    try {
      await orgOpsHttpApi.deleteService(organizationId, s.id);
      setServices((prev) => prev.filter((item) => item.id !== s.id));
      toast.success("Đã xóa dịch vụ");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa dịch vụ"
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Thêm dịch vụ
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên dịch vụ</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Thời lượng dự kiến</TableHead>
              <TableHead>Giá niêm yết</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {s.category}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.estimatedDurationMinutes
                    ? `${s.estimatedDurationMinutes} phút`
                    : "—"}
                </TableCell>
                <TableCell>
                  {s.basePrice ? formatVnd(s.basePrice) : "Liên hệ"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={s.active ? "ACTIVE" : "INACTIVE"} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(s)}
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
              {editTarget ? "Cập nhật dịch vụ" : "Thêm dịch vụ mới"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="svc-name">Tên dịch vụ</Label>
              <Input
                id="svc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="svc-cat">Danh mục</Label>
                <Input
                  id="svc-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="svc-price">Giá niêm yết (VNĐ)</Label>
                <Input
                  id="svc-price"
                  type="number"
                  min={0}
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="svc-dur">Thời lượng (phút)</Label>
                <Input
                  id="svc-dur"
                  type="number"
                  min={15}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="svc-active">Trạng thái</Label>
                <select
                  id="svc-active"
                  value={active ? "ACTIVE" : "INACTIVE"}
                  onChange={(e) => setActive(e.target.value === "ACTIVE")}
                  className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm"
                >
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Tạm ngưng</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="svc-desc">Mô tả</Label>
              <Textarea
                id="svc-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
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
    </div>
  );
}
