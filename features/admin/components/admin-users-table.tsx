"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, PauseCircle, Search } from "lucide-react";
import { toast } from "sonner";
import type { AdminUserItem } from "../api/admin.adapter";
import { adminHttpApi } from "../api/admin.http";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ContextInspector } from "@/shared/ui/context-inspector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
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
}: {
  initialUsers: AdminUserItem[];
}) {
  const router = useRouter();
  const [users, setUsers] = React.useState<AdminUserItem[]>(initialUsers);
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");
  const [inspectedUser, setInspectedUser] = React.useState<AdminUserItem | null>(null);
  const [confirmTarget, setConfirmTarget] = React.useState<{
    user: AdminUserItem;
    action: "SUSPEND" | "REACTIVATE";
  } | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const filteredUsers = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      );
    });
  }, [users, query, roleFilter, statusFilter]);

  async function handleConfirm() {
    if (!confirmTarget) return;
    const { user, action } = confirmTarget;
    setBusyId(user.id);
    try {
      const updated =
        action === "SUSPEND"
          ? await adminHttpApi.suspendUser(user.id)
          : await adminHttpApi.reactivateUser(user.id);
      const nextStatus =
        updated?.status ?? (action === "SUSPEND" ? "SUSPENDED" : "ACTIVE");
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
      );
      setInspectedUser((prev) =>
        prev && prev.id === user.id ? { ...prev, status: nextStatus } : prev
      );
      toast.success(
        action === "SUSPEND"
          ? `Đã tạm ngưng tài khoản ${user.email}`
          : `Đã kích hoạt lại tài khoản ${user.email}`
      );
      setConfirmTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật trạng thái người dùng"
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, email hoặc mã người dùng..."
            className="pl-9"
            aria-label="Tìm kiếm người dùng"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Lọc theo vai trò"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="h-9 rounded-lg border border-input bg-surface px-3 text-xs font-medium text-foreground"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="ORGANIZATION">Tổ chức đối tác</option>
            <option value="TECHNICIAN">Kỹ thuật viên</option>
            <option value="CUSTOMER">Khách hàng</option>
          </select>

          <select
            aria-label="Lọc theo trạng thái"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-9 rounded-lg border border-input bg-surface px-3 text-xs font-medium text-foreground"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="SUSPENDED">Tạm ngưng</option>
          </select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Không tìm thấy người dùng phù hợp với bộ lọc hiện tại.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => {
                const isSuspended = u.status === "SUSPENDED";
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        onClick={() => setInspectedUser(u)}
                        className="text-left font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer"
                      >
                        {u.fullName}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ROLE_LABELS[u.role] ?? u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>
                    <TableCell className="w-[1%] whitespace-nowrap text-right">
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
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

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
              <dt className="text-xs font-medium text-muted-foreground">
                Mã người dùng
              </dt>
              <dd className="font-mono text-xs text-foreground break-all rounded-md bg-surface-secondary px-2.5 py-2 border border-border-subtle">
                {inspectedUser.id}
              </dd>
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
          if (!open) setConfirmTarget(null);
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
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmTarget(null)}
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
                disabled={Boolean(busyId)}
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
