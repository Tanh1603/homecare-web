"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import type { AdminUserItem } from "../api/admin.adapter";
import { adminHttpApi } from "../api/admin.http";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ContextInspector } from "@/shared/ui/context-inspector";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { RowActionsMenu } from "@/shared/ui/row-actions-menu";
import { StatusBadge } from "@/shared/ui/status-badge";
import { formatDate } from "@/shared/lib/utils";

type RoleFilter = "ALL" | "ORGANIZATION" | "TECHNICIAN" | "CUSTOMER";
type StatusFilter = "ALL" | "ACTIVE" | "SUSPENDED";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên",
  ORGANIZATION: "Tổ chức đối tác",
  TECHNICIAN: "Kỹ thuật viên",
  CUSTOMER: "Khách hàng",
};

export function AdminUsersTable({
  initialUsers,
  initialQuery = "",
  initialRole = "ALL",
  initialStatus = "ALL",
  initialSortBy = "createdAt",
  initialSortDir = "desc",
}: {
  initialUsers: AdminUserItem[];
  initialQuery?: string;
  initialRole?: RoleFilter;
  initialStatus?: StatusFilter;
  initialSortBy?: string;
  initialSortDir?: "asc" | "desc";
}) {
  const router = useRouter();
  const [statusOverrides, setStatusOverrides] = React.useState<
    Record<string, AdminUserItem["status"]>
  >({});
  const [prevInitialQuery, setPrevInitialQuery] = React.useState(initialQuery);
  const [query, setQuery] = React.useState(initialQuery);
  if (initialQuery !== prevInitialQuery) {
    setPrevInitialQuery(initialQuery);
    setQuery(initialQuery);
  }
  const [inspectedUser, setInspectedUser] = React.useState<AdminUserItem | null>(null);
  const [confirmTarget, setConfirmTarget] = React.useState<{
    user: AdminUserItem;
    action: "SUSPEND" | "REACTIVATE";
  } | null>(null);
  const [suspendReason, setSuspendReason] = React.useState("");

  function closeConfirmDialog() {
    setConfirmTarget(null);
    setSuspendReason("");
  }

  const users = React.useMemo(
    () =>
      initialUsers.map((u) =>
        statusOverrides[u.id] ? { ...u, status: statusOverrides[u.id] } : u
      ),
    [initialUsers, statusOverrides]
  );

  const navigateWithParams = React.useCallback(
    (next: {
      q?: string;
      role?: RoleFilter;
      status?: StatusFilter;
      sortBy?: string;
      sortDir?: "asc" | "desc";
    }) => {
      const params = new URLSearchParams();
      const targetQuery = (next.q ?? query).trim();
      const targetRole = next.role ?? initialRole;
      const targetStatus = next.status ?? initialStatus;
      const targetSortBy = next.sortBy ?? initialSortBy;
      const targetSortDir = next.sortDir ?? initialSortDir;

      if (targetQuery) params.set("q", targetQuery);
      if (targetRole !== "ALL") params.set("role", targetRole);
      if (targetStatus !== "ALL") params.set("status", targetStatus);
      if (targetSortBy !== "createdAt") params.set("sortBy", targetSortBy);
      if (targetSortDir !== "desc") params.set("sortDir", targetSortDir);
      params.set("page", "1");
      router.replace(`/admin/users?${params.toString()}`);
    },
    [initialRole, initialSortBy, initialSortDir, initialStatus, query, router]
  );

  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === initialQuery.trim()) return;
    const timer = window.setTimeout(() => {
      navigateWithParams({ q: trimmed });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [initialQuery, navigateWithParams, query]);

  const sortValue = `${initialSortBy}:${initialSortDir}`;

  const statusMutation = useMutation({
    mutationFn: ({
      user,
      action,
      reason,
    }: {
      user: AdminUserItem;
      action: "SUSPEND" | "REACTIVATE";
      reason?: string;
    }) =>
      action === "SUSPEND"
        ? adminHttpApi.suspendUser(user.id, reason ?? "")
        : adminHttpApi.reactivateUser(user.id),
    onSuccess: (updated, { user, action }) => {
      const nextStatus =
        updated?.status ?? (action === "SUSPEND" ? "SUSPENDED" : "ACTIVE");
      setStatusOverrides((prev) => ({ ...prev, [user.id]: nextStatus }));
      setInspectedUser((prev) =>
        prev && prev.id === user.id ? { ...prev, status: nextStatus } : prev
      );
      toast.success(
        action === "SUSPEND"
          ? `Đã tạm ngưng tài khoản ${user.email}`
          : `Đã kích hoạt lại tài khoản ${user.email}`
      );
      closeConfirmDialog();
      router.refresh();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật trạng thái người dùng"
      );
    },
  });

  const busyId = statusMutation.isPending ? statusMutation.variables?.user.id ?? null : null;

  function handleConfirm() {
    if (!confirmTarget) return;
    const { user, action } = confirmTarget;
    if (action === "SUSPEND" && !suspendReason.trim()) {
      toast.error("Vui lòng nhập lý do tạm ngưng tài khoản.");
      return;
    }
    statusMutation.mutate({
      user,
      action,
      reason: suspendReason.trim(),
    });
  }

  const columns = React.useMemo<DataTableColumn<AdminUserItem>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Họ tên",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <button
              type="button"
              onClick={() => setInspectedUser(u)}
              className="text-left font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer"
            >
              {u.fullName}
            </button>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email}</span>
        ),
      },
      {
        accessorKey: "role",
        header: "Vai trò",
        cell: ({ row }) => (
          <Badge variant="outline">
            {ROLE_LABELS[row.original.role] ?? row.original.role}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Ngày tạo",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: () => <div className="text-right">Thao tác</div>,
        cell: ({ row }) => {
          const u = row.original;
          const isSuspended = u.status === "SUSPENDED";
          return (
            <div className="text-right">
              <RowActionsMenu
                ariaLabel={`Mở menu thao tác cho ${u.email}`}
                disabled={busyId === u.id}
                groups={[
                  {
                    id: "inspect",
                    items: [
                      {
                        id: "view",
                        label: "Xem chi tiết tài khoản",
                        icon: Eye,
                        onSelect: () => setInspectedUser(u),
                      },
                    ],
                  },
                  {
                    id: "account-status",
                    items: [
                      {
                        id: "reactivate",
                        label: "Kích hoạt lại tài khoản",
                        icon: CheckCircle2,
                        hidden: !isSuspended,
                        onSelect: () =>
                          setConfirmTarget({
                            user: u,
                            action: "REACTIVATE",
                          }),
                      },
                      {
                        id: "suspend",
                        label: "Tạm ngưng tài khoản",
                        icon: PauseCircle,
                        destructive: true,
                        hidden: isSuspended,
                        onSelect: () =>
                          setConfirmTarget({
                            user: u,
                            action: "SUSPEND",
                          }),
                      },
                    ],
                  },
                ]}
              />
            </div>
          );
        },
      },
    ],
    [busyId]
  );

  return (
    <>
      <DataTable
        serverSide
        data={users}
        columns={columns}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Tìm theo tên hoặc email..."
        searchAriaLabel="Tìm kiếm người dùng"
        emptyMessage="Không tìm thấy người dùng phù hợp với bộ lọc hiện tại."
        toolbarSlot={
          <>
            <div className="w-40">
              <NativeSelect
                aria-label="Lọc theo vai trò"
                value={initialRole}
                onChange={(e) =>
                  navigateWithParams({ role: e.target.value as RoleFilter })
                }
                className="text-xs font-medium"
              >
                <NativeSelectOption value="ALL">Tất cả vai trò</NativeSelectOption>
                <NativeSelectOption value="ORGANIZATION">Tổ chức đối tác</NativeSelectOption>
                <NativeSelectOption value="TECHNICIAN">Kỹ thuật viên</NativeSelectOption>
                <NativeSelectOption value="CUSTOMER">Khách hàng</NativeSelectOption>
              </NativeSelect>
            </div>

            <div className="w-40">
              <NativeSelect
                aria-label="Lọc theo trạng thái"
                value={initialStatus}
                onChange={(e) =>
                  navigateWithParams({ status: e.target.value as StatusFilter })
                }
                className="text-xs font-medium"
              >
                <NativeSelectOption value="ALL">Tất cả trạng thái</NativeSelectOption>
                <NativeSelectOption value="ACTIVE">Hoạt động</NativeSelectOption>
                <NativeSelectOption value="SUSPENDED">Tạm ngưng</NativeSelectOption>
              </NativeSelect>
            </div>

            <div className="w-44">
              <NativeSelect
                aria-label="Sắp xếp người dùng"
                value={sortValue}
                onChange={(e) => {
                  const [nextSortBy, nextSortDir] = e.target.value.split(":");
                  navigateWithParams({
                    sortBy: nextSortBy,
                    sortDir: nextSortDir === "asc" ? "asc" : "desc",
                  });
                }}
                className="text-xs font-medium"
              >
                <NativeSelectOption value="createdAt:desc">Mới tạo nhất</NativeSelectOption>
                <NativeSelectOption value="createdAt:asc">Tạo cũ nhất</NativeSelectOption>
                <NativeSelectOption value="fullName:asc">Họ tên (A → Z)</NativeSelectOption>
                <NativeSelectOption value="email:asc">Email (A → Z)</NativeSelectOption>
              </NativeSelect>
            </div>
          </>
        }
      />

      <ContextInspector
        open={Boolean(inspectedUser)}
        onClose={() => setInspectedUser(null)}
        title={inspectedUser?.fullName ?? "Chi tiết người dùng"}
        subtitle={inspectedUser?.email}
        footer={
          inspectedUser ? (
            <div className="flex justify-end gap-2">
              {inspectedUser.status === "SUSPENDED" ? (
                <Button
                  size="sm"
                  onClick={() =>
                    setConfirmTarget({ user: inspectedUser, action: "REACTIVATE" })
                  }
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Kích hoạt lại tài khoản
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    setConfirmTarget({ user: inspectedUser, action: "SUSPEND" })
                  }
                >
                  <PauseCircle className="h-3.5 w-3.5" />
                  Tạm ngưng tài khoản
                </Button>
              )}
            </div>
          ) : null
        }
      >
        {inspectedUser ? (
          <dl className="space-y-4 text-sm">
            <div className="rounded-lg border border-border bg-surface-secondary p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Trạng thái</span>
                <StatusBadge status={inspectedUser.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Vai trò hệ thống</span>
                <Badge variant="outline">
                  {ROLE_LABELS[inspectedUser.role] ?? inspectedUser.role}
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">Email</dt>
              <dd className="text-foreground">{inspectedUser.email}</dd>
            </div>

            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">
                Ngày tạo tài khoản
              </dt>
              <dd className="text-foreground">
                {formatDate(inspectedUser.createdAt)}
              </dd>
            </div>
          </dl>
        ) : null}
      </ContextInspector>

      <Dialog
        open={Boolean(confirmTarget)}
        onOpenChange={(open) => {
          if (!open) closeConfirmDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmTarget?.action === "SUSPEND"
                ? "Xác nhận tạm ngưng tài khoản"
                : "Xác nhận kích hoạt lại tài khoản"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {confirmTarget?.action === "SUSPEND"
                ? `Tài khoản "${confirmTarget?.user.email}" sẽ bị thu hồi phiên và không thể đăng nhập.`
                : `Tài khoản "${confirmTarget?.user.email}" sẽ được phép đăng nhập trở lại.`}
            </p>
            {confirmTarget?.action === "SUSPEND" ? (
              <div className="space-y-1.5">
                <Label htmlFor="user-suspend-reason">
                  Lý do tạm ngưng (bắt buộc)
                </Label>
                <Input
                  id="user-suspend-reason"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="VD: Vi phạm điều khoản sử dụng hoặc gian lận"
                  disabled={Boolean(busyId)}
                />
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeConfirmDialog}
                disabled={Boolean(busyId)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant={
                  confirmTarget?.action === "SUSPEND"
                    ? "destructive"
                    : "default"
                }
                disabled={
                  Boolean(busyId) ||
                  (confirmTarget?.action === "SUSPEND" && !suspendReason.trim())
                }
                onClick={handleConfirm}
              >
                {busyId ? "Đang xử lý..." : "Xác nhận"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
