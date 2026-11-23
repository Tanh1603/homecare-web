"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  MapPin,
  Package,
  Search,
  Star,
  Wrench,
  Building2,
} from "lucide-react";
import type {
  OrgProductItem,
  OrgServiceItem,
  OrgTechnicianItem,
} from "@/features/org-ops/api/org-ops.adapter";
import type { WorkspaceCoverageEntry } from "@/features/admin/api/organization-workspace.server";
import {
  formatCoverageLevel,
  formatPriceType,
  formatProductType,
  formatServiceCategory,
  formatShortCode,
} from "@/features/admin/lib/admin-labels";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ContextInspector } from "@/shared/ui/context-inspector";
import { EmptyState } from "@/shared/ui/empty-state";
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
import { cn, formatVnd } from "@/shared/lib/utils";

function WorkspaceSearchToolbar({
  basePath,
  initialQuery,
  placeholder,
  rightSlot,
}: {
  basePath: string;
  initialQuery: string;
  placeholder: string;
  rightSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(initialQuery);

  React.useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (value.trim()) {
      params.set("q", value.trim());
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <form
        onSubmit={handleSubmit}
        className="flex w-full items-center gap-2 sm:max-w-sm"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="h-9 pl-9 text-xs"
            aria-label={placeholder}
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-9 text-xs">
          Tìm
        </Button>
      </form>
      {rightSlot ? <div className="flex items-center gap-2">{rightSlot}</div> : null}
    </div>
  );
}

export function OrgWorkspaceTechniciansTable({
  organizationId,
  items,
  initialQuery = "",
}: {
  organizationId: string;
  items: OrgTechnicianItem[];
  initialQuery?: string;
}) {
  const [inspected, setInspected] = React.useState<OrgTechnicianItem | null>(
    null
  );

  return (
    <div className="space-y-4">
      <WorkspaceSearchToolbar
        basePath={`/admin/organizations/${organizationId}/technicians`}
        initialQuery={initialQuery}
        placeholder="Tìm theo tên hoặc chuyên môn kỹ thuật viên..."
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={
            initialQuery
              ? "Không tìm thấy kỹ thuật viên phù hợp"
              : "Tổ chức chưa có kỹ thuật viên"
          }
          description={
            initialQuery
              ? "Thử thay đổi từ khóa tìm kiếm hoặc xóa bộ lọc hiện tại."
              : "Khi tổ chức bổ sung nhân sự kỹ thuật, danh sách sẽ hiển thị tại đây."
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kỹ thuật viên</TableHead>
                <TableHead>Chuyên môn</TableHead>
                <TableHead>Kinh nghiệm</TableHead>
                <TableHead>Đánh giá</TableHead>
                <TableHead>Đang nhận việc</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-[1%] whitespace-nowrap text-right">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((tech) => (
                <TableRow key={tech.id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setInspected(tech)}
                      className="text-left font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      {tech.fullName}
                    </button>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      #{formatShortCode(tech.id)}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs text-foreground">
                    {tech.specialty}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {tech.experienceYears !== undefined
                      ? `${tech.experienceYears} năm`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs font-medium tabular-nums">
                      {tech.rating.toFixed(1)}
                      <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {tech.activeAllocations ?? 0} lịch
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={tech.status} />
                  </TableCell>
                  <TableCell className="w-[1%] whitespace-nowrap text-right">
                    <RowActionsMenu
                      ariaLabel={`Thao tác cho kỹ thuật viên ${tech.fullName}`}
                      groups={[
                        {
                          id: "view",
                          items: [
                            {
                              id: "inspect",
                              label: "Xem chi tiết",
                              icon: Eye,
                              onSelect: () => setInspected(tech),
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
      )}

      <ContextInspector
        open={Boolean(inspected)}
        onClose={() => setInspected(null)}
        title={inspected?.fullName ?? "Chi tiết kỹ thuật viên"}
        subtitle={
          inspected ? `Mã KTV: #${formatShortCode(inspected.id)}` : undefined
        }
      >
        {inspected ? (
          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-secondary p-3">
              <span className="text-xs text-muted-foreground">Trạng thái</span>
              <StatusBadge status={inspected.status} />
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Chuyên môn</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {inspected.specialties.length > 0 ? (
                  inspected.specialties.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <span className="text-foreground">{inspected.specialty}</span>
                )}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-muted-foreground">Kinh nghiệm</dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {inspected.experienceYears !== undefined
                    ? `${inspected.experienceYears} năm`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Đánh giá trung bình
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {inspected.rating.toFixed(1)} / 5.0
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Lịch đang phân bổ
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {inspected.activeAllocations ?? 0}
                </dd>
              </div>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Mã hồ sơ người dùng
              </dt>
              <dd className="mt-1 rounded-md border border-border-subtle bg-surface-secondary px-2.5 py-2 font-mono text-xs break-all">
                {inspected.profileId}
              </dd>
            </div>
          </dl>
        ) : null}
      </ContextInspector>
    </div>
  );
}

export function OrgWorkspaceServicesTable({
  organizationId,
  items,
  initialQuery = "",
}: {
  organizationId: string;
  items: OrgServiceItem[];
  initialQuery?: string;
}) {
  const [inspected, setInspected] = React.useState<OrgServiceItem | null>(null);

  return (
    <div className="space-y-4">
      <WorkspaceSearchToolbar
        basePath={`/admin/organizations/${organizationId}/services`}
        initialQuery={initialQuery}
        placeholder="Tìm tên dịch vụ cung cấp..."
        rightSlot={
          <Button variant="outline" size="sm" asChild className="h-9 text-xs">
            <Link href={`/admin/organizations/${organizationId}/coverage`}>
              <MapPin className="h-3.5 w-3.5" />
              Xem khu vực phủ sóng
            </Link>
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={
            initialQuery
              ? "Không tìm thấy dịch vụ phù hợp"
              : "Tổ chức chưa đăng ký dịch vụ cung cấp"
          }
          description={
            initialQuery
              ? "Thử từ khóa khác hoặc xóa bộ lọc tìm kiếm."
              : "Danh sách dịch vụ riêng của tổ chức này sẽ hiển thị tại đây (tách biệt với Danh mục chung)."
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dịch vụ</TableHead>
                <TableHead>Nhóm dịch vụ</TableHead>
                <TableHead>Hình thức giá</TableHead>
                <TableHead>Giá tham chiếu</TableHead>
                <TableHead>Thời lượng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-[1%] whitespace-nowrap text-right">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="max-w-xs">
                    <button
                      type="button"
                      onClick={() => setInspected(service)}
                      className="text-left font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      {service.name}
                    </button>
                    {service.description ? (
                      <p
                        className="truncate text-xs text-muted-foreground"
                        title={service.description}
                      >
                        {service.description}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatServiceCategory(service.category)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatPriceType(service.priceType)}
                    {service.inspectionFee ? (
                      <p className="text-[11px] tabular-nums">
                        Khảo sát: {formatVnd(service.inspectionFee)}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-medium tabular-nums text-xs">
                    {formatVnd(service.basePrice)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {service.estimatedDurationMinutes
                      ? `${service.estimatedDurationMinutes} phút`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={service.status} />
                  </TableCell>
                  <TableCell className="w-[1%] whitespace-nowrap text-right">
                    <RowActionsMenu
                      ariaLabel={`Thao tác cho dịch vụ ${service.name}`}
                      groups={[
                        {
                          id: "view",
                          items: [
                            {
                              id: "inspect",
                              label: "Xem chi tiết dịch vụ",
                              icon: Eye,
                              onSelect: () => setInspected(service),
                            },
                            {
                              id: "coverage",
                              label: "Xem khu vực phủ sóng",
                              icon: MapPin,
                              href: `/admin/organizations/${organizationId}/coverage`,
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
      )}

      <ContextInspector
        open={Boolean(inspected)}
        onClose={() => setInspected(null)}
        title={inspected?.name ?? "Chi tiết dịch vụ"}
        subtitle={
          inspected ? formatServiceCategory(inspected.category) : undefined
        }
      >
        {inspected ? (
          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-secondary p-3">
              <span className="text-xs text-muted-foreground">Trạng thái</span>
              <StatusBadge status={inspected.status} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-muted-foreground">Giá tham chiếu</dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {formatVnd(inspected.basePrice)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Hình thức giá</dt>
                <dd className="mt-0.5 font-medium">
                  {formatPriceType(inspected.priceType)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phí khảo sát</dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {inspected.inspectionFee
                    ? formatVnd(inspected.inspectionFee)
                    : "Miễn phí"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Thời lượng dự kiến
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {inspected.estimatedDurationMinutes} phút
                </dd>
              </div>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Mô tả chi tiết</dt>
              <dd className="mt-1 whitespace-pre-wrap text-foreground">
                {inspected.description || "Không có mô tả."}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Mã dịch vụ</dt>
              <dd className="mt-1 rounded-md border border-border-subtle bg-surface-secondary px-2.5 py-2 font-mono text-xs break-all">
                {inspected.id}
              </dd>
            </div>
          </dl>
        ) : null}
      </ContextInspector>
    </div>
  );
}

export function OrgWorkspaceProductsTable({
  organizationId,
  items,
  initialQuery = "",
}: {
  organizationId: string;
  items: OrgProductItem[];
  initialQuery?: string;
}) {
  const [inspected, setInspected] = React.useState<OrgProductItem | null>(null);

  return (
    <div className="space-y-4">
      <WorkspaceSearchToolbar
        basePath={`/admin/organizations/${organizationId}/products`}
        initialQuery={initialQuery}
        placeholder="Tìm tên sản phẩm, mã SKU hoặc thương hiệu..."
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title={
            initialQuery
              ? "Không tìm thấy sản phẩm phù hợp"
              : "Tổ chức chưa kinh doanh sản phẩm nào"
          }
          description={
            initialQuery
              ? "Thử thay đổi từ khóa tìm kiếm hoặc xóa bộ lọc hiện tại."
              : "Tổ chức chỉ cung cấp dịch vụ hoặc chưa đăng tải mặt hàng linh kiện/thiết bị."
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sản phẩm</TableHead>
                <TableHead>Phân loại</TableHead>
                <TableHead>Mã sản phẩm / Thương hiệu</TableHead>
                <TableHead>Tồn kho</TableHead>
                <TableHead>Đơn giá</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-[1%] whitespace-nowrap text-right">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="max-w-xs">
                    <div className="flex items-start gap-2.5">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
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
                        <button
                          type="button"
                          onClick={() => setInspected(product)}
                          className="text-left font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer truncate block max-w-full"
                        >
                          {product.name}
                        </button>
                        <p className="text-[11px] text-muted-foreground">
                          Bảo hành {product.warrantyMonths ?? 0} tháng · Đổi trả{" "}
                          {product.returnWindowDays ?? 0} ngày
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <p>{product.category}</p>
                    {product.productType ? (
                      <p className="text-[11px]">
                        {formatProductType(product.productType)}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span className="font-mono text-foreground">
                      {product.sku || "—"}
                    </span>
                    {product.brand ? ` · ${product.brand}` : ""}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    <span
                      className={cn(
                        "font-medium",
                        product.availableQty <= 0
                          ? "text-destructive"
                          : "text-foreground"
                      )}
                    >
                      {product.availableQty}
                    </span>
                    {product.reservedQty > 0 ? (
                      <span className="text-muted-foreground">
                        {" "}
                        (giữ {product.reservedQty})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs font-medium tabular-nums">
                    {formatVnd(product.unitPrice)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={product.status} />
                  </TableCell>
                  <TableCell className="w-[1%] whitespace-nowrap text-right">
                    <RowActionsMenu
                      ariaLabel={`Thao tác cho sản phẩm ${product.name}`}
                      groups={[
                        {
                          id: "view",
                          items: [
                            {
                              id: "inspect",
                              label: "Xem chi tiết sản phẩm",
                              icon: Eye,
                              onSelect: () => setInspected(product),
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
      )}

      <ContextInspector
        open={Boolean(inspected)}
        onClose={() => setInspected(null)}
        title={inspected?.name ?? "Chi tiết sản phẩm"}
        subtitle={inspected ? `SKU: ${inspected.sku}` : undefined}
      >
        {inspected ? (
          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-secondary p-3">
              <span className="text-xs text-muted-foreground">Trạng thái</span>
              <StatusBadge status={inspected.status} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-muted-foreground">Đơn giá</dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {formatVnd(inspected.unitPrice)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tồn kho</dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {inspected.availableQty} khả dụng · {inspected.reservedQty}{" "}
                  đang giữ
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Loại sản phẩm</dt>
                <dd className="mt-0.5 font-medium">
                  {formatProductType(inspected.productType)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Thương hiệu</dt>
                <dd className="mt-0.5 font-medium">{inspected.brand || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Bảo hành</dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {inspected.warrantyMonths ?? 0} tháng
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Thời hạn đổi trả
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {inspected.returnWindowDays ?? 0} ngày
                </dd>
              </div>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Mô tả</dt>
              <dd className="mt-1 whitespace-pre-wrap text-foreground">
                {inspected.description || "Không có mô tả."}
              </dd>
            </div>
          </dl>
        ) : null}
      </ContextInspector>
    </div>
  );
}

export function OrgWorkspaceCoveragePanel({
  organizationId,
  entries,
}: {
  organizationId: string;
  entries: WorkspaceCoverageEntry[];
}) {
  const [filter, setFilter] = React.useState<"ALL" | "MISSING" | "CONFIGURED">(
    "ALL"
  );

  const filtered = React.useMemo(() => {
    if (filter === "MISSING") {
      return entries.filter((e) => e.areas.length === 0);
    }
    if (filter === "CONFIGURED") {
      return entries.filter((e) => e.areas.length > 0);
    }
    return entries;
  }, [entries, filter]);

  const missingCount = entries.filter((e) => e.areas.length === 0).length;
  const configuredCount = entries.length - missingCount;

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title="Chưa có dữ liệu khu vực phủ sóng"
        description="Khu vực phủ sóng được gắn theo từng dịch vụ cung cấp của tổ chức. Hiện tổ chức chưa có dịch vụ nào."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "ALL" as const, label: "Tất cả dịch vụ", count: entries.length },
            {
              id: "CONFIGURED" as const,
              label: "Đã cấu hình",
              count: configuredCount,
            },
            {
              id: "MISSING" as const,
              label: "Chưa gán khu vực",
              count: missingCount,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                filter === tab.id
                  ? "border-primary/30 bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              <span className="tabular-nums opacity-75">({tab.count})</span>
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" asChild className="h-8 text-xs">
          <Link href={`/admin/organizations/${organizationId}/services`}>
            Xem dịch vụ cung cấp
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dịch vụ</TableHead>
              <TableHead>Trạng thái dịch vụ</TableHead>
              <TableHead>Khu vực đang phục vụ</TableHead>
              <TableHead className="text-right">Số khu vực</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Không có dịch vụ nào khớp bộ lọc hiện tại.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((entry) => (
                <TableRow key={entry.serviceId}>
                  <TableCell>
                    <p className="font-medium text-foreground">
                      {entry.serviceName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatServiceCategory(entry.serviceCategory)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={entry.serviceActive ? "ACTIVE" : "INACTIVE"}
                    />
                  </TableCell>
                  <TableCell>
                    {entry.areas.length === 0 ? (
                      <span className="text-xs text-warning">
                        Chưa cấu hình khu vực phủ sóng
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {entry.areas.map((area, idx) => (
                          <Badge
                            key={`${area.level}-${area.locationCode}-${idx}`}
                            variant={
                              area.active === false ? "secondary" : "outline"
                            }
                            className="font-mono text-[11px]"
                          >
                            {formatCoverageLevel(area.level)}:{" "}
                            {area.locationCode}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium tabular-nums">
                    {entry.areas.length}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
