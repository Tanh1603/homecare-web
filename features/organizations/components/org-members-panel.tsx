"use client";

import * as React from "react";
import { Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import {
  addOrganizationMemberSchema,
  formatOrgRoleLabel,
  ORG_ROLES,
  type OrganizationMember,
  type OrganizationMemberRole,
} from "../contracts/organization";
import { organizationsApi } from "../api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Badge } from "@/shared/ui/badge";
import { EmptyState } from "@/shared/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { formatDate } from "@/shared/lib/utils";

export function OrgMembersPanel({
  organizationId,
  currentUserId,
  currentUserRole,
  initialMembers,
}: {
  organizationId: string;
  currentUserId: string;
  currentUserRole: OrganizationMemberRole;
  initialMembers: OrganizationMember[];
}) {
  const [members, setMembers] =
    React.useState<OrganizationMember[]>(initialMembers);
  const [userId, setUserId] = React.useState("");
  const [role, setRole] = React.useState<(typeof ORG_ROLES)[number]>("ORG_STAFF");
  const [submitting, setSubmitting] = React.useState(false);
  const [busyUserId, setBusyUserId] = React.useState<string | null>(null);

  const canManage =
    currentUserRole === "ORG_OWNER" ||
    currentUserRole === "ORG_ADMIN" ||
    currentUserRole === "OWNER" ||
    currentUserRole === "MANAGER";

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    const parsed = addOrganizationMemberSchema.safeParse({ userId, role });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
      return;
    }

    setSubmitting(true);
    try {
      const created = await organizationsApi.addMember(
        organizationId,
        parsed.data
      );
      setMembers((prev) => [...prev, created]);
      setUserId("");
      setRole("ORG_STAFF");
      toast.success("Đã thêm thành viên vào tổ chức");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể thêm thành viên"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(
    member: OrganizationMember,
    nextRole: (typeof ORG_ROLES)[number]
  ) {
    if (member.role === nextRole) return;
    setBusyUserId(member.userId);
    try {
      const updated = await organizationsApi.updateMemberRole(
        organizationId,
        member.userId,
        nextRole
      );
      setMembers((prev) =>
        prev.map((m) => (m.userId === member.userId ? updated : m))
      );
      toast.success("Đã cập nhật vai trò thành viên");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể đổi vai trò"
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleRemove(member: OrganizationMember) {
    setBusyUserId(member.userId);
    try {
      await organizationsApi.removeMember(organizationId, member.userId);
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
      toast.success("Đã xóa thành viên khỏi tổ chức");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa thành viên"
      );
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">
          Thành viên tổ chức ({members.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Quản lý danh sách nhân sự trực thuộc và phân quyền trong
          organization_members.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {canManage ? (
          <form
            onSubmit={handleAddMember}
            className="grid gap-3 rounded-lg border border-border bg-secondary/40 p-4 sm:grid-cols-[1fr_200px_auto] sm:items-end"
          >
            <div className="space-y-1.5">
              <Label htmlFor="member-user-id">Supabase User ID</Label>
              <Input
                id="member-user-id"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="UUID người dùng (VD: 8e4a...)"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-role">Vai trò</Label>
              <select
                id="member-role"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as (typeof ORG_ROLES)[number])
                }
                className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ORG_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {formatOrgRoleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={submitting}>
              <UserPlus className="h-4 w-4" />
              {submitting ? "Đang thêm..." : "Thêm thành viên"}
            </Button>
          </form>
        ) : null}

        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Chưa tải được danh sách thành viên"
            description="Kiểm tra kết nối API Gateway hoặc thêm thành viên mới vào tổ chức."
          />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thành viên</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Ngày tham gia</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  {canManage ? <TableHead>Thao tác</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const isSelf = m.userId === currentUserId;
                  const busy = busyUserId === m.userId;
                  const displayName = m.fullName?.trim() || m.email?.trim() || m.userId;
                  return (
                    <TableRow key={m.id || m.userId}>
                      <TableCell className="text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-foreground">
                            {displayName}
                          </span>
                          {isSelf ? (
                            <Badge variant="secondary">Bạn</Badge>
                          ) : null}
                        </div>
                        {m.email && m.fullName ? (
                          <p className="text-[11px] text-muted-foreground">
                            {m.email}
                          </p>
                        ) : null}
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {m.userId}
                        </p>
                      </TableCell>
                      <TableCell>
                        {canManage && !isSelf ? (
                          <select
                            aria-label={`Vai trò của ${m.userId}`}
                            value={m.role}
                            disabled={busy}
                            onChange={(e) =>
                              handleRoleChange(
                                m,
                                e.target.value as (typeof ORG_ROLES)[number]
                              )
                            }
                            className="h-8 rounded-md border border-input bg-card px-2 text-xs font-medium text-foreground"
                          >
                            {ORG_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {formatOrgRoleLabel(r)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant="outline">
                            {formatOrgRoleLabel(m.role)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(m.joinedAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={m.status} />
                      </TableCell>
                      {canManage ? (
                        <TableCell>
                          {!isSelf ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() => handleRemove(m)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Xóa
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
