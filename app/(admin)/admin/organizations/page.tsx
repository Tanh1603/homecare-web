import { organizationsServerApi } from "@/features/organizations/api/organizations.server";
import { OrganizationsTable } from "@/features/admin/components/organizations-table";
import { PageHeader } from "@/shared/ui/page-header";
import { ServerPagination } from "@/shared/ui/server-pagination";

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { items: organizations, pagination } =
    await organizationsServerApi.listAllPage({ page, size: 20 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Tổ chức đối tác"
        description="Phê duyệt, quản lý trạng thái và xử lý kháng cáo tổ chức đối tác."
      />
      <OrganizationsTable initialData={organizations} />
      <ServerPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        basePath="/admin/organizations"
      />
    </div>
  );
}
