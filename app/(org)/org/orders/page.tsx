import Link from "next/link";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { requireOrgContext } from "@/shared/auth/guards";
import { orgOpsApi } from "@/features/org-ops/api/org-ops.adapter";
import { OrgOrdersTable } from "@/features/org-ops/components/org-orders-table";
import { OrgProductsPanel } from "@/features/org-ops/components/org-products-panel";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState } from "@/shared/ui/empty-state";
import { ServerPagination } from "@/shared/ui/server-pagination";
import { cn } from "@/shared/lib/utils";

export default async function OrgOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const ctx = await requireOrgContext();
  if (ctx.activeOrganization.organizationStatus !== "APPROVED") {
    redirect("/org/status");
  }

  const sp = await searchParams;
  const tab = sp.tab === "products" ? "products" : "orders";
  const page = Math.max(1, Number(sp.page) || 1);
  const orgId = ctx.activeOrganization.organizationId;

  const ordersPage =
    tab === "orders" ? await orgOpsApi.listOrdersPage(orgId, page, 20) : null;
  const productsPage =
    tab === "products"
      ? await orgOpsApi.listProductsPage(orgId, page, 20)
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đơn hàng & Kho linh kiện"
        description="Quản lý đơn hàng vật tư, xác nhận giao hàng và tồn kho sản phẩm."
      />

      <div className="flex items-center gap-2">
        <Link
          href="/org/orders"
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "orders"
              ? "border-primary/30 bg-accent text-accent-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          Đơn hàng
        </Link>
        <Link
          href="/org/orders?tab=products"
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "products"
              ? "border-primary/30 bg-accent text-accent-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          Kho sản phẩm
        </Link>
      </div>

      {tab === "orders" && ordersPage ? (
        ordersPage.items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Chưa có đơn hàng linh kiện"
            description="Khi khách hàng đặt mua vật tư thuộc tổ chức, đơn hàng sẽ hiển thị tại đây."
          />
        ) : (
          <>
            <OrgOrdersTable
              organizationId={orgId}
              initialOrders={ordersPage.items}
            />
            <ServerPagination
              page={ordersPage.pagination.page}
              totalPages={ordersPage.pagination.totalPages}
              totalItems={ordersPage.pagination.totalItems}
              basePath="/org/orders"
            />
          </>
        )
      ) : null}

      {tab === "products" && productsPage ? (
        <>
          <OrgProductsPanel
            organizationId={orgId}
            initialProducts={productsPage.items}
          />
          <ServerPagination
            page={productsPage.pagination.page}
            totalPages={productsPage.pagination.totalPages}
            totalItems={productsPage.pagination.totalItems}
            basePath="/org/orders"
            searchParams={{ tab: "products" }}
          />
        </>
      ) : null}
    </div>
  );
}
