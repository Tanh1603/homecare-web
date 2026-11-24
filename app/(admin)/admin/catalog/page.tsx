import Link from "next/link";
import Image from "next/image";
import { FolderTree, Package } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.adapter";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ServerPagination } from "@/shared/ui/server-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { cn, formatVnd } from "@/shared/lib/utils";
import {
  formatProductType,
  formatServiceCategory,
} from "@/features/admin/lib/admin-labels";

const CATALOG_TYPE_LABELS: Record<string, string> = {
  SERVICE: "Dịch vụ",
  PRODUCT: "Sản phẩm",
  DEVICE: "Thiết bị",
};

export default async function AdminCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "products" ? "products" : "services";
  const page = Math.max(1, Number(sp.page) || 1);

  const pageData =
    tab === "services"
      ? await adminApi.listServicesCatalogPage(page, 20)
      : await adminApi.listProductsCatalogPage(page, 20);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dịch vụ & Sản phẩm"
        description="Giám sát toàn bộ dịch vụ và sản phẩm (bao gồm các mục đang tạm ngưng)."
      />

      <div className="flex items-center gap-2">
        <Link
          href="/admin/catalog?tab=services"
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "services"
              ? "border-primary/30 bg-accent text-accent-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          Dịch vụ
        </Link>
        <Link
          href="/admin/catalog?tab=products"
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "products"
              ? "border-primary/30 bg-accent text-accent-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          Sản phẩm
        </Link>
      </div>

      {pageData.items.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="Chưa có dữ liệu danh mục"
          description="Hiện chưa có dịch vụ hoặc sản phẩm nào trong danh mục."
        />
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại</TableHead>
                  <TableHead>Tên danh mục</TableHead>
                  <TableHead>Nhóm</TableHead>
                  <TableHead>Đơn vị cung cấp</TableHead>
                  {tab === "products" ? (
                    <>
                      <TableHead>Mã sản phẩm / Thương hiệu</TableHead>
                      <TableHead>Bảo hành / Đổi trả</TableHead>
                      <TableHead>Tồn kho</TableHead>
                    </>
                  ) : (
                    <TableHead>Thời lượng</TableHead>
                  )}
                  <TableHead>Giá tham chiếu</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {CATALOG_TYPE_LABELS[item.type] ?? item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="flex items-start gap-2.5">
                        {tab === "products" ? (
                          item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              width={36}
                              height={36}
                              unoptimized
                              className="h-9 w-9 shrink-0 rounded-md border border-border object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                              <Package className="h-4 w-4" />
                            </div>
                          )
                        ) : null}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          {item.description ? (
                            <p
                              className="truncate text-xs text-muted-foreground"
                              title={item.description}
                            >
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <p>
                        {item.type === "SERVICE"
                          ? formatServiceCategory(item.category)
                          : item.category}
                      </p>
                      {item.productType ? (
                        <p className="text-[11px]">
                          {formatProductType(item.productType)}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.providerName ?? "—"}
                    </TableCell>
                    {tab === "products" ? (
                      <>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="font-mono text-foreground">{item.sku ?? "—"}</span>
                          {item.brand ? ` · ${item.brand}` : ""}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span>Bảo hành {item.warrantyMonths ?? 0} tháng</span>
                          {" · "}
                          <span>Đổi trả {item.returnWindowDays ?? 0} ngày</span>
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {item.availableQty ?? "—"}
                          {item.reservedQty ? ` (giữ ${item.reservedQty})` : ""}
                        </TableCell>
                      </>
                    ) : (
                      <TableCell className="tabular-nums text-muted-foreground">
                        {item.durationMinutes ? `${item.durationMinutes} phút` : "—"}
                      </TableCell>
                    )}
                    <TableCell>
                      {item.basePrice ? formatVnd(item.basePrice) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <ServerPagination
            page={pageData.pagination.page}
            totalPages={pageData.pagination.totalPages}
            totalItems={pageData.pagination.totalItems}
            basePath="/admin/catalog"
            searchParams={{ tab }}
          />
        </>
      )}
    </div>
  );
}
