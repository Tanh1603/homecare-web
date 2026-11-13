import { organizationsMockAdapter } from "@/features/organizations/api/organizations.mock";
import { OrganizationsTable } from "@/features/admin/components/organizations-table";
import { PageHeader } from "@/shared/ui/page-header";

export default async function AdminOrganizationsPage() {
  const organizations = await organizationsMockAdapter.listAll();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Tổ chức đối tác"
        description="Phê duyệt (APPROVED), từ chối (REJECTED) hoặc tạm ngưng (SUSPENDED) hồ sơ Organization."
      />
      <OrganizationsTable initialData={organizations} />
    </div>
  );
}
