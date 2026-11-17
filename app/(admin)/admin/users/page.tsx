import { Users } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.adapter";
import { AdminUsersTable } from "@/features/admin/components/admin-users-table";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState } from "@/shared/ui/empty-state";
import { ServerPagination } from "@/shared/ui/server-pagination";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { items: users, pagination } = await adminApi.listUsersPage(page, 20);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý người dùng"
        description="Danh sách tài khoản, phân quyền global role và tạm ngưng/kích hoạt lại từ Supabase Auth."
      />
      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Chưa có người dùng"
          description="Không tìm thấy tài khoản nào hoặc chưa kết nối được tới Admin API / Supabase Auth."
        />
      ) : (
        <>
          <AdminUsersTable initialUsers={users} />
          <ServerPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            basePath="/admin/users"
          />
        </>
      )}
    </div>
  );
}
