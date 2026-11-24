import { organizationsServerApi } from "@/features/organizations/api/organizations.server";
import type { OrganizationStatus } from "@/features/organizations/contracts/organization";
import { OrganizationsTable } from "@/features/admin/components/organizations-table";
import { PageHeader } from "@/shared/ui/page-header";
import { ServerPagination } from "@/shared/ui/server-pagination";

const VALID_STATUSES = new Set<OrganizationStatus>([
  "PENDING",
  "APPROVED",
  "SUSPENDED",
  "BANNED",
  "REJECTED",
]);

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    q?: string;
    sortBy?: string;
    sortDir?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const status =
    sp.status && VALID_STATUSES.has(sp.status as OrganizationStatus)
      ? (sp.status as OrganizationStatus)
      : undefined;
  const q = sp.q?.trim() || undefined;
  const sortBy = sp.sortBy?.trim() || "createdAt";
  const sortDir: "asc" | "desc" = sp.sortDir === "asc" ? "asc" : "desc";

  const { items: organizations, pagination } =
    await organizationsServerApi.listAllPage({
      page,
      size: 20,
      status,
      q,
      sortBy,
      sortDir,
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Tổ chức đối tác"
        description="Phê duyệt, quản lý trạng thái và xử lý kháng cáo tổ chức đối tác."
      />
      <OrganizationsTable
        initialData={organizations}
        initialStatus={status ?? "ALL"}
        initialQuery={q ?? ""}
        initialSortBy={sortBy}
        initialSortDir={sortDir}
      />
      <ServerPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        basePath="/admin/organizations"
        searchParams={{
          status,
          q,
          sortBy: sortBy !== "createdAt" ? sortBy : undefined,
          sortDir: sortDir !== "desc" ? sortDir : undefined,
        }}
      />
    </div>
  );
}
