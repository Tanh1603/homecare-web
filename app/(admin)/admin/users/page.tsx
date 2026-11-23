import { Users } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.adapter";
import { AdminUsersTable } from "@/features/admin/components/admin-users-table";
import { getServerAuthContext } from "@/shared/auth/guards";
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
  const [ctx, { items: rawUsers, pagination }] = await Promise.all([
    getServerAuthContext(),
    adminApi.listUsersPage(page, 20),
  ]);
  const users = ctx?.userId
    ? rawUsers.filter((u) => u.id !== ctx.userId)
    : rawUsers;
  const hiddenCount = rawUsers.length - users.length;
  const totalItems = Math.max(0, pagination.totalItems - hiddenCount);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý người dùng"
        description="Danh sách tài khoản, phân quyền vai trò hệ thống và tạm ngưng hoặc kích hoạt lại tài khoản."
      />
      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Chưa có người dùng"
          description="Không tìm thấy tài khoản nào hoặc chưa kết nối được tới máy chủ quản trị."
        />
      ) : (
        <>
          <AdminUsersTable initialUsers={users} />
          <ServerPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={totalItems}
            basePath="/admin/users"
          />
        </>
      )}
    </div>
  );
}
