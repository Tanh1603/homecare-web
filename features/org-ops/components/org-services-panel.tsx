"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type {
  OrgServiceCoverageArea,
  OrgServiceItem,
} from "../api/org-ops.adapter";
import { orgOpsHttpApi } from "../api/org-ops.http";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  FormDrawer,
  FormField,
  FormSection,
  focusFirstInvalidField,
} from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { ProvinceSelect } from "@/shared/ui/province-select";
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
  {
    code: "AC_CLEANING_MAINTENANCE",
    label: "Vệ sinh & Bảo dưỡng máy lạnh",
    minDays: 0,
    maxDays: 30,
    requiresQualification: false,
  },
  {
    code: "AC_REPAIR_INSTALL",
    label: "Sửa chữa & Lắp đặt máy lạnh",
    minDays: 7,
    maxDays: 90,
    requiresQualification: true,
  },
  {
    code: "ELECTRICAL_REPAIR",
    label: "Sửa chữa điện dân dụng",
    minDays: 7,
    maxDays: 90,
    requiresQualification: true,
  },
  {
    code: "PLUMBING",
    label: "Sửa chữa ống nước & Thiết bị vệ sinh",
    minDays: 7,
    maxDays: 90,
    requiresQualification: false,
  },
  {
    code: "APPLIANCE_REPAIR",
    label: "Sửa chữa thiết bị gia dụng",
    minDays: 7,
    maxDays: 90,
    requiresQualification: false,
  },
  {
    code: "WATER_HEATER_GAS",
    label: "Máy nước nóng & Thiết bị gas",
    minDays: 7,
    maxDays: 90,
    requiresQualification: true,
  },
] as const;

export function getServiceCategoryMeta(code: string) {
  return V01_SERVICE_CATEGORIES.find((c) => c.code === code);
}

export function getServiceCategoryLabel(code: string): string {
  return getServiceCategoryMeta(code)?.label ?? code;
}

interface CoverageDraftItem {
  locationCode: string;
  level: "PROVINCE" | "WARD";
}

interface ServiceFormValues {
  name: string;
  category: string;
  basePrice: string;
  priceType: "FIXED" | "QUOTE_REQUIRED";
  inspectionFee: string;
  inspectionFeePolicy: "NO_FEE" | "CREDIT_FULL" | "NON_CREDITABLE";
  workmanshipDurationDays: string;
  coverageAreas: CoverageDraftItem[];
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
  coverageAreas: [],
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
  const [coverageLevelDraft, setCoverageLevelDraft] = React.useState<
    "PROVINCE" | "WARD"
  >("PROVINCE");
  const [coverageLocationDraft, setCoverageLocationDraft] = React.useState("");

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

  function handleCategoryChange(nextCategory: string) {
    const nextMeta = getServiceCategoryMeta(nextCategory);
    setForm((prev) => {
      let nextDays = prev.workmanshipDurationDays;
      if (nextMeta) {
        const parsed = Number(prev.workmanshipDurationDays);
        if (!Number.isFinite(parsed) || parsed < nextMeta.minDays) {
          nextDays = String(nextMeta.minDays);
        } else if (parsed > nextMeta.maxDays) {
          nextDays = String(nextMeta.maxDays);
        }
      }
      return {
        ...prev,
        category: nextCategory,
        workmanshipDurationDays: nextDays,
      };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.category;
      delete next.workmanshipDurationDays;
      return next;
    });
  }

  const selectedCategoryMeta = getServiceCategoryMeta(form.category);

  function handleAddCoverageArea() {
    const locationCode = coverageLocationDraft.trim();
    if (!locationCode) {
      toast.error("Vui lòng chọn hoặc nhập mã khu vực phục vụ.");
      return;
    }
    const exists = form.coverageAreas.some(
      (a) =>
        a.level === coverageLevelDraft &&
        a.locationCode.toLowerCase() === locationCode.toLowerCase()
    );
    if (exists) {
      toast.error("Khu vực phục vụ này đã có trong danh sách.");
      return;
    }
    updateField("coverageAreas", [
      ...form.coverageAreas,
      { locationCode, level: coverageLevelDraft },
    ]);
    setCoverageLocationDraft("");
  }

  function handleRemoveCoverageArea(target: CoverageDraftItem) {
    updateField(
      "coverageAreas",
      form.coverageAreas.filter(
        (a) =>
          !(
            a.level === target.level &&
            a.locationCode === target.locationCode
          )
      )
    );
  }

  function openCreate() {
    setEditTarget(null);
    setForm(DEFAULT_SERVICE_FORM);
    setInitialForm(DEFAULT_SERVICE_FORM);
    setCoverageLevelDraft("PROVINCE");
    setCoverageLocationDraft("");
    setErrors({});
    setDrawerOpen(true);
  }

  function openEdit(s: OrgServiceItem) {
    const mappedAreas: CoverageDraftItem[] = (s.coverageAreas ?? [])
      .filter((c) => c.active !== false && c.locationCode?.trim())
      .map((c) => ({
        locationCode: c.locationCode.trim(),
        level: c.level === "WARD" ? "WARD" : "PROVINCE",
      }));
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
      coverageAreas: mappedAreas,
      duration: String(s.estimatedDurationMinutes),
      description: s.description ?? "",
      active: s.active,
    };
    setEditTarget(s);
    setForm(vals);
    setInitialForm(vals);
    setCoverageLevelDraft("PROVINCE");
    setCoverageLocationDraft("");
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
    const catMeta = getServiceCategoryMeta(form.category);
    if (!catMeta) {
      nextErrors.category = "Vui lòng chọn danh mục dịch vụ hợp lệ";
    }
    const wDaysRaw = form.workmanshipDurationDays.trim();
    const wDays = wDaysRaw === "" ? Number.NaN : Number(wDaysRaw);
    if (
      catMeta &&
      (!Number.isInteger(wDays) ||
        wDays < catMeta.minDays ||
        wDays > catMeta.maxDays)
    ) {
      nextErrors.workmanshipDurationDays = `Bảo hành tay nghề cho ${catMeta.label} phải từ ${catMeta.minDays} đến ${catMeta.maxDays} ngày`;
    }
    const dur = Number(form.duration);
    if (!Number.isFinite(dur) || dur < 15) {
      nextErrors.duration = "Thời lượng tối thiểu 15 phút";
    }
    if (form.active && form.coverageAreas.length === 0) {
      nextErrors.coverageAreas =
        "Cần ít nhất 1 khu vực phục vụ (Tỉnh/Thành hoặc Phường/Xã) trước khi bật Đang hoạt động.";
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
      const areasPayload: OrgServiceCoverageArea[] = form.coverageAreas.map(
        (a) => ({
          locationCode: a.locationCode,
          level: a.level,
          active: true,
        })
      );
      const basePayload = {
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim() || undefined,
        basePrice: Math.max(0, Number(form.basePrice) || 0),
        priceType: form.priceType,
        inspectionFee: fee,
        inspectionFeePolicy: form.inspectionFeePolicy,
        workmanshipDurationDays: Number(form.workmanshipDurationDays),
        estimatedDurationMinutes: Math.max(15, Number(form.duration) || 60),
      };
      if (fee > 500000) {
        toast.warning(
          "Phí khảo sát vượt ngưỡng cảnh báo mềm (500.000 VNĐ) và sẽ được gắn cờ hậu kiểm Admin."
        );
      }
      if (editTarget) {
        let savedAreas = editTarget.coverageAreas ?? [];
        const coverageChanged =
          JSON.stringify(form.coverageAreas) !==
          JSON.stringify(initialForm.coverageAreas);
        if (coverageChanged || areasPayload.length > 0) {
          savedAreas = await orgOpsHttpApi.replaceServiceCoverage(
            organizationId,
            editTarget.id,
            areasPayload
          );
        }
        const updated = await orgOpsHttpApi.updateService(
          organizationId,
          editTarget.id,
          { ...basePayload, active: form.active }
        );
        setServices((prev) =>
          prev.map((s) =>
            s.id === editTarget.id
              ? {
                  ...updated,
                  coverageAreas: savedAreas,
                  status: updated.active ? "ACTIVE" : "INACTIVE",
                }
              : s
          )
        );
        toast.success("Đã cập nhật dịch vụ");
      } else {
        let saved = await orgOpsHttpApi.createService(organizationId, {
          ...basePayload,
          active: false,
        });
        let savedAreas: OrgServiceCoverageArea[] = [];
        if (areasPayload.length > 0) {
          savedAreas = await orgOpsHttpApi.replaceServiceCoverage(
            organizationId,
            saved.id,
            areasPayload
          );
        }
        if (form.active) {
          saved = await orgOpsHttpApi.updateService(organizationId, saved.id, {
            ...basePayload,
            active: true,
          });
        }
        setServices((prev) => [
          {
            ...saved,
            coverageAreas: savedAreas,
            status: saved.active ? "ACTIVE" : "INACTIVE",
          },
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
              <TableHead>Phạm vi phục vụ</TableHead>
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
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>{getServiceCategoryLabel(s.category)}</span>
                    {getServiceCategoryMeta(s.category)?.requiresQualification ? (
                      <Badge variant="outline" className="text-[11px] font-normal">
                        Cần chứng chỉ
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {(s.coverageAreas ?? []).filter((c) => c.active !== false).length > 0
                    ? `${(s.coverageAreas ?? []).filter((c) => c.active !== false).length} khu vực`
                    : "Chưa cấu hình"}
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
              <NativeSelect
                id="svc-cat"
                value={form.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                required
              >
                {V01_SERVICE_CATEGORIES.map((cat) => (
                  <NativeSelectOption key={cat.code} value={cat.code}>
                    {cat.requiresQualification
                      ? `${cat.label} (Cần chứng chỉ)`
                      : cat.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Trạng thái hiển thị" htmlFor="svc-active">
              <NativeSelect
                id="svc-active"
                value={form.active ? "ACTIVE" : "INACTIVE"}
                onChange={(e) =>
                  updateField("active", e.target.value === "ACTIVE")
                }
              >
                <NativeSelectOption value="ACTIVE">Đang hoạt động</NativeSelectOption>
                <NativeSelectOption value="INACTIVE">Tạm ngưng</NativeSelectOption>
              </NativeSelect>
            </FormField>
          </div>
          {selectedCategoryMeta?.requiresQualification ? (
            <Alert>
              <AlertDescription>
                Danh mục <strong>{selectedCategoryMeta.label}</strong> thuộc nhóm
                rủi ro cao: cần nộp và được Admin xác minh tại{" "}
                <Link
                  href="/org/settings#qualifications"
                  className="font-medium underline underline-offset-2 hover:text-primary"
                >
                  Cài đặt tổ chức → Chứng chỉ chuyên môn
                </Link>{" "}
                trước khi bật trạng thái <strong>Đang hoạt động</strong>.
              </AlertDescription>
            </Alert>
          ) : null}
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
          title="Định giá & Bảo hành tay nghề"
          description="Cơ sở báo giá, phí khảo sát, thời gian bảo hành và phân bổ khung lịch."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Hình thức báo giá" htmlFor="svc-price-type">
              <NativeSelect
                id="svc-price-type"
                value={form.priceType}
                onChange={(e) =>
                  updateField(
                    "priceType",
                    e.target.value as ServiceFormValues["priceType"]
                  )
                }
              >
                <NativeSelectOption value="FIXED">Giá niêm yết cố định</NativeSelectOption>
                <NativeSelectOption value="QUOTE_REQUIRED">Khảo sát & báo giá</NativeSelectOption>
              </NativeSelect>
            </FormField>
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
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Phí khảo sát (VNĐ)"
              htmlFor="svc-inspection-fee"
              error={errors.inspectionFee}
            >
              <Input
                id="svc-inspection-fee"
                type="number"
                min={0}
                value={form.inspectionFee}
                onChange={(e) => updateField("inspectionFee", e.target.value)}
              />
            </FormField>
            <FormField
              label="Chính sách phí khảo sát"
              htmlFor="svc-inspection-policy"
            >
              <NativeSelect
                id="svc-inspection-policy"
                value={form.inspectionFeePolicy}
                onChange={(e) =>
                  updateField(
                    "inspectionFeePolicy",
                    e.target.value as ServiceFormValues["inspectionFeePolicy"]
                  )
                }
              >
                <NativeSelectOption value="NO_FEE">Miễn phí khảo sát</NativeSelectOption>
                <NativeSelectOption value="CREDIT_FULL">Khấu trừ 100% vào hóa đơn</NativeSelectOption>
                <NativeSelectOption value="NON_CREDITABLE">Không khấu trừ</NativeSelectOption>
              </NativeSelect>
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Bảo hành tay nghề (ngày)"
              htmlFor="svc-warranty"
              required
              hint={
                selectedCategoryMeta
                  ? `Trong khoảng ${selectedCategoryMeta.minDays} – ${selectedCategoryMeta.maxDays} ngày`
                  : undefined
              }
              error={errors.workmanshipDurationDays}
            >
              <Input
                id="svc-warranty"
                type="number"
                min={selectedCategoryMeta?.minDays ?? 0}
                max={selectedCategoryMeta?.maxDays ?? 90}
                value={form.workmanshipDurationDays}
                onChange={(e) =>
                  updateField("workmanshipDurationDays", e.target.value)
                }
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
        <FormSection
          title="Khu vực phục vụ"
          description="Cần ít nhất 1 khu vực (Tỉnh/Thành phố hoặc Phường/Xã) để kích hoạt dịch vụ."
        >
          <FormField
            label="Thêm khu vực phục vụ"
            htmlFor="svc-coverage-location"
            error={errors.coverageAreas}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="sm:w-44">
                <NativeSelect
                  id="svc-coverage-level"
                  aria-label="Cấp khu vực phục vụ"
                  value={coverageLevelDraft}
                  onChange={(e) => {
                    setCoverageLevelDraft(
                      e.target.value === "WARD" ? "WARD" : "PROVINCE"
                    );
                    setCoverageLocationDraft("");
                  }}
                >
                  <NativeSelectOption value="PROVINCE">
                    Tỉnh / Thành phố
                  </NativeSelectOption>
                  <NativeSelectOption value="WARD">Phường / Xã</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="flex-1">
                {coverageLevelDraft === "PROVINCE" ? (
                  <ProvinceSelect
                    id="svc-coverage-location"
                    value={coverageLocationDraft}
                    onChange={setCoverageLocationDraft}
                  />
                ) : (
                  <Input
                    id="svc-coverage-location"
                    value={coverageLocationDraft}
                    onChange={(e) => setCoverageLocationDraft(e.target.value)}
                    placeholder="VD: Phường Bến Nghé hoặc WARD_001"
                  />
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCoverageArea}
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm khu vực
              </Button>
            </div>
          </FormField>

          {form.coverageAreas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {form.coverageAreas.map((area) => (
                <Badge
                  key={`${area.level}:${area.locationCode}`}
                  variant="secondary"
                  className="gap-1.5 pr-1.5"
                >
                  <span>
                    {area.locationCode} ({area.level})
                  </span>
                  <button
                    type="button"
                    aria-label={`Xóa khu vực ${area.locationCode}`}
                    onClick={() => handleRemoveCoverageArea(area)}
                    className="rounded-sm p-0.5 text-muted-foreground hover:bg-background hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Chưa có khu vực phục vụ nào được chọn.
            </p>
          )}
        </FormSection>
      </FormDrawer>
    </div>
  );
}
