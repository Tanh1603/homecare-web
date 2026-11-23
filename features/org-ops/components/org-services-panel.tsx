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
  FormDrawer,
  FormField,
  FormSection,
  focusFirstInvalidField,
} from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { RowActionsMenu } from "@/shared/ui/row-actions-menu";
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

export const V01_SERVICE_CATEGORIES = [
  { code: "AC_CLEANING_MAINTENANCE", label: "Vệ sinh & Bảo dưỡng máy lạnh", minDays: 0, maxDays: 30 },
  { code: "AC_REPAIR_INSTALL", label: "Sửa chữa & Lắp đặt máy lạnh (Cần chứng chỉ)", minDays: 7, maxDays: 90 },
  { code: "ELECTRICAL_REPAIR", label: "Sửa chữa điện dân dụng (Cần chứng chỉ)", minDays: 7, maxDays: 90 },
  { code: "PLUMBING", label: "Sửa chữa ống nước & Thiết bị vệ sinh", minDays: 7, maxDays: 90 },
  { code: "APPLIANCE_REPAIR", label: "Sửa chữa thiết bị gia dụng", minDays: 7, maxDays: 90 },
  { code: "WATER_HEATER_GAS", label: "Máy nước nóng & Thiết bị gas (Cần chứng chỉ)", minDays: 7, maxDays: 90 },
] as const;

interface ServiceFormValues {
  name: string;
  category: string;
  basePrice: string;
  priceType: "FIXED" | "QUOTE_REQUIRED";
  inspectionFee: string;
  inspectionFeePolicy: "NO_FEE" | "CREDIT_FULL" | "NON_CREDITABLE";
  workmanshipDurationDays: string;
  coverageCodes: string;
  duration: string;
  description: string;
  active: boolean;
}

const DEFAULT_SERVICE_FORM: ServiceFormValues = {
  name: "",
  category: "AC_CLEANING_MAINTENANCE",
  basePrice: "250000",
  priceType: "FIXED",
  inspectionFee: "0",
  inspectionFeePolicy: "NO_FEE",
  workmanshipDurationDays: "14",
  coverageCodes: "",
  duration: "60",
  description: "",
  active: false,
};

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
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<OrgServiceItem | null>(
    null
  );
  const [form, setForm] = React.useState<ServiceFormValues>(
    DEFAULT_SERVICE_FORM
  );
  const [initialForm, setInitialForm] = React.useState<ServiceFormValues>(
    DEFAULT_SERVICE_FORM
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const isDirty = React.useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm]
  );

  function updateField<K extends keyof ServiceFormValues>(
    key: K,
    value: ServiceFormValues[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function openCreate() {
    setEditTarget(null);
    setForm(DEFAULT_SERVICE_FORM);
    setInitialForm(DEFAULT_SERVICE_FORM);
    setErrors({});
    setDrawerOpen(true);
  }

  function openEdit(s: OrgServiceItem) {
    const vals: ServiceFormValues = {
      name: s.name,
      category: s.category,
      basePrice: String(s.basePrice),
      priceType: s.priceType ?? "FIXED",
      inspectionFee: String(s.inspectionFee ?? 0),
      inspectionFeePolicy:
        (s as { inspectionFeePolicy?: ServiceFormValues["inspectionFeePolicy"] })
          .inspectionFeePolicy ?? "NO_FEE",
      workmanshipDurationDays: String(
        (s as { workmanshipDurationDays?: number }).workmanshipDurationDays ?? 14
      ),
      coverageCodes: (s.coverageAreas ?? [])
        .map((c) => `${c.locationCode}:${c.level}`)
        .join(", "),
      duration: String(s.estimatedDurationMinutes),
      description: s.description ?? "",
      active: s.active,
    };
    setEditTarget(s);
    setForm(vals);
    setInitialForm(vals);
    setErrors({});
    setDrawerOpen(true);
  }

  function validateForm(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Vui lòng nhập tên dịch vụ";
    if (!form.category.trim()) nextErrors.category = "Vui lòng nhập danh mục";
    const price = Number(form.basePrice);
    if (!Number.isFinite(price) || price < 0) {
      nextErrors.basePrice = "Giá niêm yết không hợp lệ";
    }
    const fee = Number(form.inspectionFee || 0);
    if (!Number.isFinite(fee) || fee < 0) {
      nextErrors.inspectionFee = "Phí khảo sát phải >= 0 VNĐ";
    }
    const catMeta = V01_SERVICE_CATEGORIES.find((c) => c.code === form.category);
    const wDays = Number(form.workmanshipDurationDays || 0);
    if (
      catMeta &&
      (!Number.isFinite(wDays) || wDays < catMeta.minDays || wDays > catMeta.maxDays)
    ) {
      nextErrors.workmanshipDurationDays = `Bảo hành tay nghề cho ${catMeta.code} phải trong [${catMeta.minDays}, ${catMeta.maxDays}] ngày`;
    }
    const dur = Number(form.duration);
    if (!Number.isFinite(dur) || dur < 15) {
      nextErrors.duration = "Thời lượng tối thiểu 15 phút";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validateForm()) {
      focusFirstInvalidField(e.currentTarget);
      return;
    }
    setSaving(true);
    try {
      const fee = Math.max(0, Number(form.inspectionFee) || 0);
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim() || undefined,
        basePrice: Math.max(0, Number(form.basePrice) || 0),
        priceType: form.priceType,
        inspectionFee: fee,
        inspectionFeePolicy: form.inspectionFeePolicy,
        workmanshipDurationDays: Number(form.workmanshipDurationDays) || 7,
        estimatedDurationMinutes: Math.max(15, Number(form.duration) || 60),
        active: form.active,
      };
      if (fee > 500000) {
        toast.warning(
          "Phí khảo sát vượt ngưỡng cảnh báo mềm (500.000 VNĐ) và sẽ được gắn cờ hậu kiểm Admin."
        );
      }
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
      setDrawerOpen(false);
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
                <TableCell className="max-w-xs">
                  <p className="font-medium truncate">{s.name}</p>
                  {s.description ? (
                    <p
                      className="truncate text-xs text-muted-foreground"
                      title={s.description}
                    >
                      {s.description}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.category}
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
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
                <TableCell className="w-[1%] whitespace-nowrap text-right">
                  <RowActionsMenu
                    ariaLabel={`Thao tác cho dịch vụ ${s.name}`}
                    groups={[
                      {
                        id: "edit",
                        items: [
                          {
                            id: "edit-service",
                            label: "Chỉnh sửa dịch vụ",
                            icon: Pencil,
                            onSelect: () => openEdit(s),
                          },
                        ],
                      },
                      {
                        id: "danger",
                        items: [
                          {
                            id: "delete-service",
                            label: "Xóa dịch vụ",
                            icon: Trash2,
                            destructive: true,
                            onSelect: () => handleDelete(s),
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
        title={editTarget ? "Cập nhật dịch vụ" : "Thêm dịch vụ mới"}
        description="Thiết lập thông tin danh mục, thời lượng và đơn giá niêm yết của dịch vụ."
        isDirty={isDirty}
        saving={saving}
        submitLabel={editTarget ? "Lưu cập nhật" : "Tạo dịch vụ"}
        onSubmit={handleSave}
        size="lg"
      >
        <FormSection
          title="Thông tin dịch vụ"
          description="Tên hiển thị trên danh mục đặt lịch và nhóm chuyên môn."
        >
          <FormField
            label="Tên dịch vụ"
            htmlFor="svc-name"
            required
            error={errors.name}
          >
            <Input
              id="svc-name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="VD: Bảo dưỡng & vệ sinh điều hòa treo tường"
              required
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Danh mục"
              htmlFor="svc-cat"
              required
              error={errors.category}
            >
              <Input
                id="svc-cat"
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                required
              />
            </FormField>
            <FormField label="Trạng thái hiển thị" htmlFor="svc-active">
              <select
                id="svc-active"
                value={form.active ? "ACTIVE" : "INACTIVE"}
                onChange={(e) =>
                  updateField("active", e.target.value === "ACTIVE")
                }
                className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm text-foreground"
              >
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Tạm ngưng</option>
              </select>
            </FormField>
          </div>
          <FormField
            label="Mô tả quy trình"
            htmlFor="svc-desc"
            hint="Các hạng mục công việc bao gồm trong gói dịch vụ."
          >
            <Textarea
              id="svc-desc"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={3}
              placeholder="Mô tả chi tiết phạm vi kiểm tra, vệ sinh, vật tư đi kèm..."
            />
          </FormField>
        </FormSection>

        <FormSection
          title="Định giá & Thời lượng dự kiến"
          description="Cơ sở báo giá ban đầu và phân bổ khung lịch cho kỹ thuật viên."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Giá niêm yết (VNĐ)"
              htmlFor="svc-price"
              required
              error={errors.basePrice}
            >
              <Input
                id="svc-price"
                type="number"
                min={0}
                value={form.basePrice}
                onChange={(e) => updateField("basePrice", e.target.value)}
                required
              />
            </FormField>
            <FormField
              label="Thời lượng (phút)"
              htmlFor="svc-dur"
              required
              error={errors.duration}
            >
              <Input
                id="svc-dur"
                type="number"
                min={15}
                value={form.duration}
                onChange={(e) => updateField("duration", e.target.value)}
                required
              />
            </FormField>
          </div>
        </FormSection>
      </FormDrawer>
    </div>
  );
}
