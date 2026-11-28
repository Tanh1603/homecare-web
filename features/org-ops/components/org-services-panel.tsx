"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import type {
  OrgServiceCoverageArea,
  OrgServiceItem,
} from "../api/org-ops.adapter";
import { orgOpsHttpApi } from "../api/org-ops.http";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import {
  FormDrawer,
  FormField,
  FormSection,
} from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { ProvinceSelect } from "@/shared/ui/province-select";
import { RowActionsMenu } from "@/shared/ui/row-actions-menu";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Textarea } from "@/shared/ui/textarea";
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

const coverageAreaDraftSchema = z.object({
  locationCode: z.string(),
  level: z.enum(["PROVINCE", "WARD"]),
});

const serviceFormSchema = z
  .object({
    name: z.string().trim().min(1, "Vui lòng nhập tên dịch vụ"),
    category: z.string().trim().min(1, "Vui lòng nhập danh mục"),
    basePrice: z.string().refine((val) => {
      const n = Number(val);
      return Number.isFinite(n) && n >= 0;
    }, "Giá niêm yết không hợp lệ"),
    priceType: z.enum(["FIXED", "QUOTE_REQUIRED"]),
    inspectionFee: z.string().refine((val) => {
      const n = Number(val || 0);
      return Number.isFinite(n) && n >= 0;
    }, "Phí khảo sát phải >= 0 VNĐ"),
    inspectionFeePolicy: z.enum(["NO_FEE", "CREDIT_FULL", "NON_CREDITABLE"]),
    workmanshipDurationDays: z.string(),
    coverageAreas: z.array(coverageAreaDraftSchema),
    duration: z.string().refine((val) => {
      const n = Number(val);
      return Number.isFinite(n) && n >= 15;
    }, "Thời lượng tối thiểu 15 phút"),
    description: z.string(),
    active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const catMeta = getServiceCategoryMeta(data.category);
    if (!catMeta) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["category"],
        message: "Vui lòng chọn danh mục dịch vụ hợp lệ",
      });
    } else {
      const wDaysRaw = data.workmanshipDurationDays.trim();
      const wDays = wDaysRaw === "" ? Number.NaN : Number(wDaysRaw);
      if (
        !Number.isInteger(wDays) ||
        wDays < catMeta.minDays ||
        wDays > catMeta.maxDays
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["workmanshipDurationDays"],
          message: `Bảo hành tay nghề cho ${catMeta.label} phải từ ${catMeta.minDays} đến ${catMeta.maxDays} ngày`,
        });
      }
    }
    if (data.active && data.coverageAreas.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["coverageAreas"],
        message:
          "Cần ít nhất 1 khu vực phục vụ (Tỉnh/Thành hoặc Phường/Xã) trước khi bật Đang hoạt động.",
      });
    }
  });

type ServiceFormValues = z.infer<typeof serviceFormSchema>;
type CoverageDraftItem = z.infer<typeof coverageAreaDraftSchema>;

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
  const [initialCoverageAreas, setInitialCoverageAreas] = React.useState<
    CoverageDraftItem[]
  >([]);
  const [coverageLevelDraft, setCoverageLevelDraft] = React.useState<
    "PROVINCE" | "WARD"
  >("PROVINCE");
  const [coverageLocationDraft, setCoverageLocationDraft] = React.useState("");

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: DEFAULT_SERVICE_FORM,
  });

  const watchedValues = useWatch({ control: form.control });
  const watchedCoverageAreas = useWatch({
    control: form.control,
    name: "coverageAreas",
  });
  const currentCategory = watchedValues.category ?? DEFAULT_SERVICE_FORM.category;
  const currentCoverageAreas =
    watchedCoverageAreas ?? DEFAULT_SERVICE_FORM.coverageAreas;
  const currentActive = watchedValues.active ?? false;
  const currentPriceType = watchedValues.priceType ?? "FIXED";
  const currentInspectionPolicy = watchedValues.inspectionFeePolicy ?? "NO_FEE";
  const selectedCategoryMeta = getServiceCategoryMeta(currentCategory);
  const errors = form.formState.errors;

  const saveMutation = useMutation({
    mutationFn: async ({
      values,
      target,
      prevAreas,
    }: {
      values: ServiceFormValues;
      target: OrgServiceItem | null;
      prevAreas: CoverageDraftItem[];
    }) => {
      const fee = Math.max(0, Number(values.inspectionFee) || 0);
      const areasPayload: OrgServiceCoverageArea[] = values.coverageAreas.map(
        (a) => ({
          locationCode: a.locationCode,
          level: a.level,
          active: true,
        })
      );
      const basePayload = {
        name: values.name.trim(),
        category: values.category.trim(),
        description: values.description.trim() || undefined,
        basePrice: Math.max(0, Number(values.basePrice) || 0),
        priceType: values.priceType,
        inspectionFee: fee,
        inspectionFeePolicy: values.inspectionFeePolicy,
        workmanshipDurationDays: Number(values.workmanshipDurationDays),
        estimatedDurationMinutes: Math.max(15, Number(values.duration) || 60),
      };
      if (fee > 500000) {
        toast.warning(
          "Phí khảo sát vượt ngưỡng cảnh báo mềm (500.000 VNĐ) và sẽ được gắn cờ hậu kiểm Admin."
        );
      }
      if (target) {
        let savedAreas = target.coverageAreas ?? [];
        const coverageChanged =
          JSON.stringify(values.coverageAreas) !== JSON.stringify(prevAreas);
        if (coverageChanged || areasPayload.length > 0) {
          savedAreas = await orgOpsHttpApi.replaceServiceCoverage(
            organizationId,
            target.id,
            areasPayload
          );
        }
        const updated = await orgOpsHttpApi.updateService(
          organizationId,
          target.id,
          { ...basePayload, active: values.active }
        );
        return {
          mode: "update" as const,
          item: {
            ...updated,
            coverageAreas: savedAreas,
            status: updated.active ? ("ACTIVE" as const) : ("INACTIVE" as const),
          },
        };
      }
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
      if (values.active) {
        saved = await orgOpsHttpApi.updateService(organizationId, saved.id, {
          ...basePayload,
          active: true,
        });
      }
      return {
        mode: "create" as const,
        item: {
          ...saved,
          coverageAreas: savedAreas,
          status: saved.active ? ("ACTIVE" as const) : ("INACTIVE" as const),
        },
      };
    },
    onSuccess: (result) => {
      if (result.mode === "update") {
        setServices((prev) =>
          prev.map((s) => (s.id === result.item.id ? result.item : s))
        );
        toast.success("Đã cập nhật dịch vụ");
      } else {
        setServices((prev) => [result.item, ...prev]);
        toast.success("Đã tạo dịch vụ mới");
      }
      setDrawerOpen(false);
      router.refresh();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể lưu dịch vụ");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (s: OrgServiceItem) =>
      orgOpsHttpApi.deleteService(organizationId, s.id),
    onSuccess: (_res, s) => {
      setServices((prev) => prev.filter((item) => item.id !== s.id));
      toast.success("Đã xóa dịch vụ");
      router.refresh();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể xóa dịch vụ");
    },
  });

  function handleCategoryChange(nextCategory: string) {
    const nextMeta = getServiceCategoryMeta(nextCategory);
    form.setValue("category", nextCategory, {
      shouldDirty: true,
      shouldValidate: false,
    });
    if (nextMeta) {
      const parsed = Number(form.getValues("workmanshipDurationDays"));
      let nextDays = form.getValues("workmanshipDurationDays");
      if (!Number.isFinite(parsed) || parsed < nextMeta.minDays) {
        nextDays = String(nextMeta.minDays);
      } else if (parsed > nextMeta.maxDays) {
        nextDays = String(nextMeta.maxDays);
      }
      form.setValue("workmanshipDurationDays", nextDays, {
        shouldDirty: true,
        shouldValidate: false,
      });
    }
    form.clearErrors(["category", "workmanshipDurationDays"]);
  }

  function handleAddCoverageArea() {
    const locationCode = coverageLocationDraft.trim();
    if (!locationCode) {
      toast.error("Vui lòng chọn hoặc nhập mã khu vực phục vụ.");
      return;
    }
    const existing = form.getValues("coverageAreas");
    const exists = existing.some(
      (a) =>
        a.level === coverageLevelDraft &&
        a.locationCode.toLowerCase() === locationCode.toLowerCase()
    );
    if (exists) {
      toast.error("Khu vực phục vụ này đã có trong danh sách.");
      return;
    }
    form.setValue(
      "coverageAreas",
      [...existing, { locationCode, level: coverageLevelDraft }],
      { shouldDirty: true, shouldValidate: true }
    );
    setCoverageLocationDraft("");
  }

  function handleRemoveCoverageArea(target: CoverageDraftItem) {
    const existing = form.getValues("coverageAreas");
    form.setValue(
      "coverageAreas",
      existing.filter(
        (a) =>
          !(
            a.level === target.level &&
            a.locationCode === target.locationCode
          )
      ),
      { shouldDirty: true, shouldValidate: true }
    );
  }

  const openCreate = React.useCallback(() => {
    setEditTarget(null);
    setInitialCoverageAreas([]);
    form.reset(DEFAULT_SERVICE_FORM);
    setCoverageLevelDraft("PROVINCE");
    setCoverageLocationDraft("");
    setDrawerOpen(true);
  }, [form]);

  const openEdit = React.useCallback(
    (s: OrgServiceItem) => {
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
      setInitialCoverageAreas(mappedAreas);
      form.reset(vals);
      setCoverageLevelDraft("PROVINCE");
      setCoverageLocationDraft("");
      setDrawerOpen(true);
    },
    [form]
  );

  const columns = React.useMemo<DataTableColumn<OrgServiceItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Tên dịch vụ",
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="max-w-xs">
              <p className="font-medium truncate">{s.name}</p>
              {s.description ? (
                <p
                  className="truncate text-xs text-muted-foreground"
                  title={s.description}
                >
                  {s.description}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: "Danh mục",
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
              <span>{getServiceCategoryLabel(s.category)}</span>
              {getServiceCategoryMeta(s.category)?.requiresQualification ? (
                <Badge variant="outline" className="text-[11px] font-normal">
                  Cần chứng chỉ
                </Badge>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "coverage",
        header: "Phạm vi phục vụ",
        cell: ({ row }) => {
          const count = (row.original.coverageAreas ?? []).filter(
            (c) => c.active !== false
          ).length;
          return (
            <span className="text-xs text-muted-foreground">
              {count > 0 ? `${count} khu vực` : "Chưa cấu hình"}
            </span>
          );
        },
      },
      {
        accessorKey: "estimatedDurationMinutes",
        header: "Thời lượng dự kiến",
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {row.original.estimatedDurationMinutes
              ? `${row.original.estimatedDurationMinutes} phút`
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "basePrice",
        header: "Giá niêm yết",
        cell: ({ row }) => (
          <span>
            {row.original.basePrice ? formatVnd(row.original.basePrice) : "Liên hệ"}
          </span>
        ),
      },
      {
        accessorKey: "active",
        header: "Trạng thái",
        cell: ({ row }) => (
          <StatusBadge status={row.original.active ? "ACTIVE" : "INACTIVE"} />
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Thao tác</div>,
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="text-right">
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
                        onSelect: () => deleteMutation.mutate(s),
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
    [deleteMutation, openEdit]
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Thêm dịch vụ
        </Button>
      </div>

      <DataTable
        hideSearch
        serverSide
        data={services}
        columns={columns}
        emptyMessage="Chưa có dịch vụ nào."
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editTarget ? "Cập nhật dịch vụ" : "Thêm dịch vụ mới"}
        description="Thiết lập thông tin danh mục, thời lượng và đơn giá niêm yết của dịch vụ."
        isDirty={form.formState.isDirty}
        saving={saveMutation.isPending}
        submitLabel={editTarget ? "Lưu cập nhật" : "Tạo dịch vụ"}
        onSubmit={form.handleSubmit((values) =>
          saveMutation.mutate({
            values,
            target: editTarget,
            prevAreas: initialCoverageAreas,
          })
        )}
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
            error={errors.name?.message}
          >
            <Input
              id="svc-name"
              placeholder="VD: Bảo dưỡng & vệ sinh điều hòa treo tường"
              {...form.register("name")}
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Danh mục"
              htmlFor="svc-cat"
              required
              error={errors.category?.message}
            >
              <NativeSelect
                id="svc-cat"
                value={currentCategory}
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
                value={currentActive ? "ACTIVE" : "INACTIVE"}
                onChange={(e) =>
                  form.setValue("active", e.target.value === "ACTIVE", {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
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
              rows={3}
              placeholder="Mô tả chi tiết phạm vi kiểm tra, vệ sinh, vật tư đi kèm..."
              {...form.register("description")}
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
                value={currentPriceType}
                onChange={(e) =>
                  form.setValue(
                    "priceType",
                    e.target.value as ServiceFormValues["priceType"],
                    { shouldDirty: true }
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
              error={errors.basePrice?.message}
            >
              <Input
                id="svc-price"
                type="number"
                min={0}
                {...form.register("basePrice")}
              />
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Phí khảo sát (VNĐ)"
              htmlFor="svc-inspection-fee"
              error={errors.inspectionFee?.message}
            >
              <Input
                id="svc-inspection-fee"
                type="number"
                min={0}
                {...form.register("inspectionFee")}
              />
            </FormField>
            <FormField
              label="Chính sách phí khảo sát"
              htmlFor="svc-inspection-policy"
            >
              <NativeSelect
                id="svc-inspection-policy"
                value={currentInspectionPolicy}
                onChange={(e) =>
                  form.setValue(
                    "inspectionFeePolicy",
                    e.target.value as ServiceFormValues["inspectionFeePolicy"],
                    { shouldDirty: true }
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
              error={errors.workmanshipDurationDays?.message}
            >
              <Input
                id="svc-warranty"
                type="number"
                min={selectedCategoryMeta?.minDays ?? 0}
                max={selectedCategoryMeta?.maxDays ?? 90}
                {...form.register("workmanshipDurationDays")}
              />
            </FormField>
            <FormField
              label="Thời lượng (phút)"
              htmlFor="svc-dur"
              required
              error={errors.duration?.message}
            >
              <Input
                id="svc-dur"
                type="number"
                min={15}
                {...form.register("duration")}
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
            error={errors.coverageAreas?.message}
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

          {currentCoverageAreas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {currentCoverageAreas.map((area) => (
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
