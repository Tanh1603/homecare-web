"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Check,
  Package,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { OrgProductItem } from "../api/org-ops.adapter";
import { orgOpsHttpApi } from "../api/org-ops.http";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
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

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  SMALL_PART: "Linh kiện nhỏ (SMALL_PART)",
  MAJOR_PART: "Linh kiện chính (MAJOR_PART)",
  SUPPLY: "Vật tư tiêu hao (SUPPLY)",
  TOOL: "Dụng cụ (TOOL)",
  LARGE_APPLIANCE: "Thiết bị lớn (LARGE_APPLIANCE)",
};

interface ProductFormValues {
  sku: string;
  name: string;
  category: string;
  brand: string;
  productType: string;
  unitPrice: string;
  warrantyMonths: string;
  returnWindowDays: string;
  imageUrl: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
}

const DEFAULT_FORM: ProductFormValues = {
  sku: "",
  name: "",
  category: "Linh kiện",
  brand: "",
  productType: "SMALL_PART",
  unitPrice: "100000",
  warrantyMonths: "6",
  returnWindowDays: "7",
  imageUrl: "",
  description: "",
  status: "ACTIVE",
};

function toFormValues(p: OrgProductItem): ProductFormValues {
  return {
    sku: p.sku,
    name: p.name,
    category: p.category,
    brand: p.brand ?? "",
    productType: p.productType || "SMALL_PART",
    unitPrice: String(p.unitPrice),
    warrantyMonths: String(p.warrantyMonths ?? 0),
    returnWindowDays: String(p.returnWindowDays ?? 7),
    imageUrl: p.imageUrl ?? "",
    description: p.description ?? "",
    status: p.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  };
}

export function OrgProductsPanel({
  organizationId,
  initialProducts,
}: {
  organizationId: string;
  initialProducts: OrgProductItem[];
}) {
  const router = useRouter();
  const [products, setProducts] =
    React.useState<OrgProductItem[]>(initialProducts);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<OrgProductItem | null>(
    null
  );
  const [form, setForm] = React.useState<ProductFormValues>(DEFAULT_FORM);
  const [initialForm, setInitialForm] =
    React.useState<ProductFormValues>(DEFAULT_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  // Quick inline stock edit state (Pattern C)
  const [stockEditId, setStockEditId] = React.useState<string | null>(null);
  const [stockQty, setStockQty] = React.useState("0");
  const [savingStockId, setSavingStockId] = React.useState<string | null>(null);

  const isDirty = React.useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm]
  );

  function updateField<K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K]
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
    setForm(DEFAULT_FORM);
    setInitialForm(DEFAULT_FORM);
    setErrors({});
    setConfirmDiscard(false);
    setEditorOpen(true);
  }

  function openEdit(p: OrgProductItem) {
    const vals = toFormValues(p);
    setEditTarget(p);
    setForm(vals);
    setInitialForm(vals);
    setErrors({});
    setConfirmDiscard(false);
    setEditorOpen(true);
  }

  function requestCloseEditor() {
    if (saving) return;
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    setConfirmDiscard(false);
    setEditorOpen(false);
  }

  function validateForm(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!form.sku.trim()) nextErrors.sku = "Vui lòng nhập mã SKU";
    if (!form.name.trim()) nextErrors.name = "Vui lòng nhập tên sản phẩm";
    if (!form.category.trim()) nextErrors.category = "Vui lòng nhập danh mục";
    const price = Number(form.unitPrice);
    if (!Number.isFinite(price) || price < 1000) {
      nextErrors.unitPrice = "Đơn giá tối thiểu 1.000 VNĐ";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(formRef.current);
      return false;
    }
    return true;
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        category: form.category.trim(),
        brand: form.brand.trim() || undefined,
        productType: form.productType,
        unitPrice: Number(form.unitPrice) || 1000,
        warrantyMonths: Math.max(0, Number(form.warrantyMonths) || 0),
        returnWindowDays: Math.max(0, Number(form.returnWindowDays) || 0),
        imageUrl: form.imageUrl.trim() || undefined,
        description: form.description.trim() || undefined,
        status: form.status,
      };
      if (editTarget) {
        const updated = await orgOpsHttpApi.updateProduct(
          organizationId,
          editTarget.id,
          payload
        );
        setProducts((prev) =>
          prev.map((p) => (p.id === editTarget.id ? updated : p))
        );
        toast.success("Đã cập nhật sản phẩm");
      } else {
        const created = await orgOpsHttpApi.createProduct(
          organizationId,
          payload
        );
        setProducts((prev) => [created, ...prev]);
        toast.success("Đã thêm sản phẩm mới");
      }
      setConfirmDiscard(false);
      setEditorOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể lưu sản phẩm"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleInlineStockSave(product: OrgProductItem) {
    setSavingStockId(product.id);
    try {
      const updated = await orgOpsHttpApi.updateInventory(
        organizationId,
        product.id,
        Math.max(0, Number(stockQty) || 0)
      );
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? updated : p))
      );
      toast.success(`Đã cập nhật tồn kho ${product.sku}`);
      setStockEditId(null);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật tồn kho"
      );
    } finally {
      setSavingStockId(null);
    }
  }

  async function handleDelete(p: OrgProductItem) {
    try {
      await orgOpsHttpApi.deleteProduct(organizationId, p.id);
      setProducts((prev) => prev.filter((item) => item.id !== p.id));
      toast.success("Đã xóa sản phẩm");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa sản phẩm"
      );
    }
  }

  if (editorOpen) {
    return (
      <Card className="hc-animate-section-in overflow-hidden">
        <form
          ref={formRef}
          onSubmit={handleSaveProduct}
          className="divide-y divide-border"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-secondary px-5 py-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={requestCloseEditor}
              >
                <ArrowLeft className="h-4 w-4" />
                Danh sách
              </Button>
              <div>
                <p className="text-xs text-muted-foreground">
                  Kho sản phẩm & linh kiện /{" "}
                  {editTarget ? editTarget.sku : "Tạo mới"}
                </p>
                <h2 className="text-base font-semibold text-foreground">
                  {editTarget
                    ? `Chỉnh sửa sản phẩm: ${editTarget.name}`
                    : "Thêm sản phẩm & linh kiện mới"}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={requestCloseEditor}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                loading={saving}
                disabled={saving}
              >
                {saving
                  ? "Đang lưu..."
                  : editTarget
                    ? "Lưu cập nhật"
                    : "Tạo sản phẩm"}
              </Button>
            </div>
          </div>

          {confirmDiscard ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 bg-warning/10 px-5 py-2.5 text-xs text-foreground"
            >
              <span className="inline-flex items-center gap-1.5 font-medium">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                Bạn có thay đổi chưa lưu. Bạn có chắc muốn quay lại danh sách?
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDiscard(false)}
                >
                  Tiếp tục chỉnh sửa
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setConfirmDiscard(false);
                    setEditorOpen(false);
                  }}
                >
                  Bỏ thay đổi
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-5 p-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
            <div className="space-y-5">
              <FormSection
                title="Thông tin cơ bản & Phân loại"
                description="Định danh SKU, nhóm danh mục và phân loại vật tư thương mại."
              >
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <FormField
                    label="Mã SKU"
                    htmlFor="prod-sku"
                    required
                    error={errors.sku}
                  >
                    <Input
                      id="prod-sku"
                      value={form.sku}
                      onChange={(e) => updateField("sku", e.target.value)}
                      placeholder="VD: CAP-DAIKIN-35UF"
                      required
                    />
                  </FormField>
                  <FormField
                    label="Tên sản phẩm"
                    htmlFor="prod-name"
                    required
                    error={errors.name}
                  >
                    <Input
                      id="prod-name"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="VD: Tụ điều hòa Daikin 35uF"
                      required
                    />
                  </FormField>
                  <FormField
                    label="Danh mục"
                    htmlFor="prod-cat"
                    required
                    error={errors.category}
                  >
                    <Input
                      id="prod-cat"
                      value={form.category}
                      onChange={(e) => updateField("category", e.target.value)}
                      required
                    />
                  </FormField>
                  <FormField label="Thương hiệu" htmlFor="prod-brand">
                    <Input
                      id="prod-brand"
                      value={form.brand}
                      onChange={(e) => updateField("brand", e.target.value)}
                      placeholder="VD: Daikin, Panasonic..."
                    />
                  </FormField>
                  <FormField label="Loại sản phẩm" htmlFor="prod-type">
                    <select
                      id="prod-type"
                      value={form.productType}
                      onChange={(e) =>
                        updateField("productType", e.target.value)
                      }
                      className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm text-foreground"
                    >
                      {Object.entries(PRODUCT_TYPE_LABELS).map(
                        ([val, label]) => (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </FormField>
                  <FormField label="Trạng thái kinh doanh" htmlFor="prod-status">
                    <select
                      id="prod-status"
                      value={form.status}
                      onChange={(e) =>
                        updateField(
                          "status",
                          e.target.value as "ACTIVE" | "INACTIVE"
                        )
                      }
                      className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm text-foreground"
                    >
                      <option value="ACTIVE">Đang kinh doanh (ACTIVE)</option>
                      <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
                    </select>
                  </FormField>
                </div>
              </FormSection>

              <FormSection
                title="Định giá & Chính sách hậu mãi"
                description="Giá bán niêm yết cùng thời hạn bảo hành và đổi trả áp dụng cho đơn hàng."
              >
                <div className="grid gap-3.5 sm:grid-cols-3">
                  <FormField
                    label="Đơn giá (VNĐ)"
                    htmlFor="prod-price"
                    required
                    error={errors.unitPrice}
                  >
                    <Input
                      id="prod-price"
                      type="number"
                      min={1000}
                      value={form.unitPrice}
                      onChange={(e) => updateField("unitPrice", e.target.value)}
                      required
                    />
                  </FormField>
                  <FormField
                    label="Bảo hành (tháng)"
                    htmlFor="prod-warranty"
                  >
                    <Input
                      id="prod-warranty"
                      type="number"
                      min={0}
                      value={form.warrantyMonths}
                      onChange={(e) =>
                        updateField("warrantyMonths", e.target.value)
                      }
                    />
                  </FormField>
                  <FormField
                    label="Đổi trả (ngày)"
                    htmlFor="prod-return-days"
                  >
                    <Input
                      id="prod-return-days"
                      type="number"
                      min={0}
                      value={form.returnWindowDays}
                      onChange={(e) =>
                        updateField("returnWindowDays", e.target.value)
                      }
                    />
                  </FormField>
                </div>
              </FormSection>

              <FormSection
                title="Mô tả & Thông số kỹ thuật"
                description="Thông tin chi tiết về model tương thích và quy cách kỹ thuật."
                collapsible
                defaultOpen
              >
                <FormField label="Mô tả chi tiết" htmlFor="prod-description">
                  <Textarea
                    id="prod-description"
                    rows={4}
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Thông số kỹ thuật, model tương thích, lưu ý lắp đặt..."
                  />
                </FormField>
              </FormSection>
            </div>

            <div className="space-y-5">
              <FormSection
                title="Hình ảnh sản phẩm"
                description="Đường dẫn ảnh minh họa hiển thị trên danh mục sản phẩm."
              >
                <FormField
                  label="URL hình ảnh"
                  htmlFor="prod-image-url"
                  hint="Hỗ trợ đường dẫn HTTPS ảnh sản phẩm."
                >
                  <Input
                    id="prod-image-url"
                    type="url"
                    placeholder="https://..."
                    value={form.imageUrl}
                    onChange={(e) => updateField("imageUrl", e.target.value)}
                  />
                </FormField>
                <div className="flex h-44 w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
                  {form.imageUrl.trim() ? (
                    <Image
                      src={form.imageUrl}
                      alt={form.name || "Preview"}
                      width={176}
                      height={176}
                      unoptimized
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
                      <Package className="h-7 w-7 opacity-60" />
                      <span>Chưa có ảnh sản phẩm</span>
                    </div>
                  )}
                </div>
              </FormSection>

              {editTarget ? (
                <FormSection
                  title="Tồn kho hiện tại"
                  description="Bạn có thể sửa nhanh số lượng tồn ngay trên bảng danh sách."
                >
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md border border-border bg-card p-3">
                      <span className="text-xs text-muted-foreground">
                        Khả dụng
                      </span>
                      <p className="mt-0.5 text-base font-semibold tabular-nums">
                        {editTarget.availableQty}
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-card p-3">
                      <span className="text-xs text-muted-foreground">
                        Đang giữ chỗ
                      </span>
                      <p className="mt-0.5 text-base font-semibold tabular-nums">
                        {editTarget.reservedQty}
                      </p>
                    </div>
                  </div>
                </FormSection>
              ) : null}
            </div>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Kho sản phẩm & linh kiện</h2>
          <p className="text-xs text-muted-foreground">
            Quản lý danh mục sản phẩm và chỉnh sửa nhanh số lượng tồn kho trực
            tiếp trên dòng.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Thêm sản phẩm
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>Nhóm / Loại</TableHead>
              <TableHead>Bảo hành / Đổi trả</TableHead>
              <TableHead>Đơn giá</TableHead>
              <TableHead>Tồn kho (Sửa nhanh)</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const isEditingStock = stockEditId === p.id;
              const isSavingStock = savingStockId === p.id;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="max-w-xs">
                    <div className="flex items-start gap-2.5">
                      {p.imageUrl ? (
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          width={36}
                          height={36}
                          unoptimized
                          className="h-9 w-9 shrink-0 rounded-md border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                          <Package className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.brand ? `${p.brand} · ` : ""}
                          {p.description || "—"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <p>{p.category}</p>
                    {p.productType ? (
                      <p className="text-[11px]">{p.productType}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span>BH {p.warrantyMonths ?? 0} th</span>
                    {" · "}
                    <span>Đổi {p.returnWindowDays ?? 0} ng</span>
                  </TableCell>
                  <TableCell>{formatVnd(p.unitPrice)}</TableCell>
                  <TableCell>
                    {isEditingStock ? (
                      <div className="inline-flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          aria-label={`Số lượng tồn kho ${p.name}`}
                          value={stockQty}
                          onChange={(e) => setStockQty(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleInlineStockSave(p);
                            } else if (e.key === "Escape") {
                              setStockEditId(null);
                            }
                          }}
                          className="h-8 w-20 px-2 text-xs tabular-nums"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isSavingStock}
                          onClick={() => handleInlineStockSave(p)}
                          aria-label="Lưu tồn kho"
                          className="h-8 px-2"
                        >
                          <Check className="h-3.5 w-3.5 text-success" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={isSavingStock}
                          onClick={() => setStockEditId(null)}
                          aria-label="Hủy sửa tồn kho"
                          className="h-8 px-2"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2">
                        <span className="tabular-nums font-medium">
                          {p.availableQty}
                        </span>
                        {p.reservedQty > 0 ? (
                          <span className="text-xs text-muted-foreground">
                            (giữ: {p.reservedQty})
                          </span>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setStockEditId(p.id);
                            setStockQty(String(p.availableQty));
                          }}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Boxes className="h-3.5 w-3.5" />
                          Kho
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="w-[1%] whitespace-nowrap text-right">
                    <RowActionsMenu
                      ariaLabel={`Thao tác cho sản phẩm ${p.name}`}
                      groups={[
                        {
                          id: "edit",
                          items: [
                            {
                              id: "edit-product",
                              label: "Chỉnh sửa sản phẩm",
                              icon: Pencil,
                              onSelect: () => openEdit(p),
                            },
                            {
                              id: "edit-stock",
                              label: "Cập nhật tồn kho",
                              icon: Boxes,
                              onSelect: () => {
                                setStockEditId(p.id);
                                setStockQty(String(p.availableQty));
                              },
                            },
                          ],
                        },
                        {
                          id: "danger",
                          items: [
                            {
                              id: "delete-product",
                              label: "Xóa sản phẩm",
                              icon: Trash2,
                              destructive: true,
                              onSelect: () => handleDelete(p),
                            },
                          ],
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
