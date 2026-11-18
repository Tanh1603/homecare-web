"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Boxes, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { OrgProductItem } from "../api/org-ops.adapter";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { formatVnd } from "@/shared/lib/utils";

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
  const [editTarget, setEditTarget] = React.useState<OrgProductItem | null>(
    null
  );
  const [createOpen, setCreateOpen] = React.useState(false);
  const [stockTarget, setStockTarget] = React.useState<OrgProductItem | null>(
    null
  );
  const [stockQty, setStockQty] = React.useState("0");
  const [saving, setSaving] = React.useState(false);

  const [sku, setSku] = React.useState("");
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("Linh kiện");
  const [brand, setBrand] = React.useState("");
  const [productType, setProductType] = React.useState("SMALL_PART");
  const [unitPrice, setUnitPrice] = React.useState("100000");
  const [warrantyMonths, setWarrantyMonths] = React.useState("6");
  const [returnWindowDays, setReturnWindowDays] = React.useState("7");
  const [imageUrl, setImageUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  function openCreate() {
    setEditTarget(null);
    setSku("");
    setName("");
    setCategory("Linh kiện");
    setBrand("");
    setProductType("SMALL_PART");
    setUnitPrice("100000");
    setWarrantyMonths("6");
    setReturnWindowDays("7");
    setImageUrl("");
    setDescription("");
    setStatus("ACTIVE");
    setCreateOpen(true);
  }

  function openEdit(p: OrgProductItem) {
    setEditTarget(p);
    setSku(p.sku);
    setName(p.name);
    setCategory(p.category);
    setBrand(p.brand ?? "");
    setProductType(p.productType || "SMALL_PART");
    setUnitPrice(String(p.unitPrice));
    setWarrantyMonths(String(p.warrantyMonths ?? 0));
    setReturnWindowDays(String(p.returnWindowDays ?? 7));
    setImageUrl(p.imageUrl ?? "");
    setDescription(p.description ?? "");
    setStatus(p.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
    setCreateOpen(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        sku: sku.trim(),
        name: name.trim(),
        category: category.trim(),
        brand: brand.trim() || undefined,
        productType,
        unitPrice: Number(unitPrice) || 1000,
        warrantyMonths: Number(warrantyMonths) || 0,
        returnWindowDays: Number(returnWindowDays) || 0,
        imageUrl: imageUrl.trim() || undefined,
        description: description.trim() || undefined,
        status,
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
      setCreateOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể lưu sản phẩm"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStock(e: React.FormEvent) {
    e.preventDefault();
    if (!stockTarget) return;
    setSaving(true);
    try {
      const updated = await orgOpsHttpApi.updateInventory(
        organizationId,
        stockTarget.id,
        Math.max(0, Number(stockQty) || 0)
      );
      setProducts((prev) =>
        prev.map((p) => (p.id === stockTarget.id ? updated : p))
      );
      toast.success("Đã cập nhật tồn kho");
      setStockTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật tồn kho"
      );
    } finally {
      setSaving(false);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Kho sản phẩm & linh kiện</h2>
          <p className="text-xs text-muted-foreground">
            Quản lý danh mục sản phẩm và số lượng tồn kho của tổ chức.
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
              <TableHead>Tồn kho</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
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
                      <p className="font-medium truncate">{p.name}</p>
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
                  {p.availableQty}{" "}
                  {p.reservedQty > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      (giữ: {p.reservedQty})
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <StatusBadge status={p.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setStockTarget(p);
                        setStockQty(String(p.availableQty));
                      }}
                    >
                      <Boxes className="h-3.5 w-3.5" />
                      Kho
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(p)}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProduct} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="prod-sku">SKU</Label>
                <Input
                  id="prod-sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-name">Tên sản phẩm</Label>
                <Input
                  id="prod-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-cat">Danh mục</Label>
                <Input
                  id="prod-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-brand">Thương hiệu</Label>
                <Input
                  id="prod-brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-price">Đơn giá (VNĐ)</Label>
                <Input
                  id="prod-price"
                  type="number"
                  min={1000}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-warranty">Bảo hành (tháng)</Label>
                <Input
                  id="prod-warranty"
                  type="number"
                  min={0}
                  value={warrantyMonths}
                  onChange={(e) => setWarrantyMonths(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-return-days">Đổi trả (ngày)</Label>
                <Input
                  id="prod-return-days"
                  type="number"
                  min={0}
                  value={returnWindowDays}
                  onChange={(e) => setReturnWindowDays(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-type">Loại sản phẩm</Label>
                <select
                  id="prod-type"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm"
                >
                  <option value="SMALL_PART">Linh kiện nhỏ (SMALL_PART)</option>
                  <option value="MAJOR_PART">Linh kiện chính (MAJOR_PART)</option>
                  <option value="SUPPLY">Vật tư tiêu hao (SUPPLY)</option>
                  <option value="TOOL">Dụng cụ (TOOL)</option>
                  <option value="LARGE_APPLIANCE">Thiết bị lớn (LARGE_APPLIANCE)</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="prod-image-url">URL hình ảnh</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="prod-image-url"
                  type="url"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                {imageUrl.trim() ? (
                  <Image
                    src={imageUrl}
                    alt="Preview"
                    width={36}
                    height={36}
                    unoptimized
                    className="h-9 w-9 shrink-0 rounded-md border border-border object-cover"
                  />
                ) : null}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="prod-description">Mô tả</Label>
              <textarea
                id="prod-description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Thông số kỹ thuật, model tương thích..."
                className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prod-status">Trạng thái</Label>
              <select
                id="prod-status"
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
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
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
        open={Boolean(stockTarget)}
        onOpenChange={(open) => {
          if (!open) setStockTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập nhật tồn kho — {stockTarget?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateStock} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="stock-qty">Số lượng khả dụng</Label>
              <Input
                id="stock-qty"
                type="number"
                min={0}
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStockTarget(null)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Đang lưu..." : "Cập nhật"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
