import { adminApi } from "@/features/admin/api/admin.adapter";
import { AdminUsersTable } from "@/features/admin/components/admin-users-table";
import { getServerAuthContext } from "@/shared/auth/guards";
import { PageHeader } from "@/shared/ui/page-header";
import { ServerPagination } from "@/shared/ui/server-pagination";

type RoleFilter = "ALL" | "ORGANIZATION" | "TECHNICIAN" | "CUSTOMER";
type StatusFilter = "ALL" | "ACTIVE" | "SUSPENDED";

const VALID_ROLES = new Set<RoleFilter>([
  "ALL",
  "ORGANIZATION",
  "TECHNICIAN",
  "CUSTOMER",
]);
const VALID_STATUSES = new Set<StatusFilter>(["ALL", "ACTIVE", "SUSPENDED"]);

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortDir?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim() || undefined;
  const role: RoleFilter =
    sp.role && VALID_ROLES.has(sp.role as RoleFilter)
      ? (sp.role as RoleFilter)
      : "ALL";
  const status: StatusFilter =
    sp.status && VALID_STATUSES.has(sp.status as StatusFilter)
      ? (sp.status as StatusFilter)
      : "ALL";
  const sortBy = sp.sortBy?.trim() || "createdAt";
  const sortDir: "asc" | "desc" = sp.sortDir === "asc" ? "asc" : "desc";

  const ctx = await getServerAuthContext();
  const { items: users, pagination } = await adminApi.listUsersPage(page, 20, {
    q,
    role: role !== "ALL" ? role : undefined,
    status: status !== "ALL" ? status : undefined,
    sortBy,
    sortDir,
    excludeSelf: true,
    excludeUserId: ctx?.userId,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý người dùng"
        description="Danh sách tài khoản, phân quyền vai trò hệ thống và tạm ngưng hoặc kích hoạt lại tài khoản."
      />
      <AdminUsersTable
        initialUsers={users}
        initialQuery={q ?? ""}
        initialRole={role}
        initialStatus={status}
        initialSortBy={sortBy}
        initialSortDir={sortDir}
      />
      <ServerPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        basePath="/admin/users"
        searchParams={{
          q,
          role: role !== "ALL" ? role : undefined,
          status: status !== "ALL" ? status : undefined,
          sortBy: sortBy !== "createdAt" ? sortBy : undefined,
          sortDir: sortDir !== "desc" ? sortDir : undefined,
        }}
      />
    </div>
  );
}
