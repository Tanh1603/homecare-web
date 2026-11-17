"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import type { AdminUserItem } from "../api/admin.adapter";
import { adminHttpApi } from "../api/admin.http";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
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

export function AdminUsersTable({
  initialUsers,
}: {
  initialUsers: AdminUserItem[];
}) {
  const router = useRouter();
  const [users, setUsers] = React.useState<AdminUserItem[]>(initialUsers);
  const [confirmTarget, setConfirmTarget] = React.useState<{
    user: AdminUserItem;
    action: "SUSPEND" | "REACTIVATE";
  } | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function handleConfirm() {
    if (!confirmTarget) return;
    const { user, action } = confirmTarget;
    setBusyId(user.id);
    try {
      const updated =
        action === "SUSPEND"
          ? await adminHttpApi.suspendUser(user.id)
          : await adminHttpApi.reactivateUser(user.id);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                status:
                  updated?.status ??
                  (action === "SUSPEND" ? "SUSPENDED" : "ACTIVE"),
              }
            : u
        )
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
        err instanceof Error ? err.message : "Không thể cập nhật trạng thái user"
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
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
            {users.map((u) => {
              const isSuspended = u.status === "SUSPENDED";
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {isSuspended ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === u.id}
                        onClick={() =>
                          setConfirmTarget({ user: u, action: "REACTIVATE" })
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        Kích hoạt lại
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === u.id}
                        onClick={() =>
                          setConfirmTarget({ user: u, action: "SUSPEND" })
                        }
                      >
                        <PauseCircle className="h-3.5 w-3.5 text-warning" />
                        Tạm ngưng
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

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
