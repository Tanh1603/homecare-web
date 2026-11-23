"use client";

import * as React from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  addOrganizationMemberSchema,
  formatOrgRoleLabel,
  ORG_ROLES,
  type OrganizationMember,
  type OrganizationMemberRole,
} from "../contracts/organization";
import { organizationsApi } from "../api";
import {
  AccountProvisioningStep,
  type ProvisionedAccountInfo,
} from "./account-provisioning-step";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormDrawer, FormField, FormSection } from "@/shared/ui/form-drawer";
import { RowActionsMenu } from "@/shared/ui/row-actions-menu";
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
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [provisioned, setProvisioned] =
    React.useState<ProvisionedAccountInfo | null>(null);
  const [role, setRole] = React.useState<(typeof ORG_ROLES)[number]>("ORG_STAFF");
  const [submitting, setSubmitting] = React.useState(false);
  const [busyUserId, setBusyUserId] = React.useState<string | null>(null);

  const canManage =
    currentUserRole === "ORG_OWNER" ||
    currentUserRole === "ORG_ADMIN" ||
    currentUserRole === "OWNER" ||
    currentUserRole === "MANAGER";

  function openAddDrawer() {
    setProvisioned(null);
    setRole("ORG_STAFF");
    setDrawerOpen(true);
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!provisioned) {
      toast.error("Vui lòng tạo & xác thực tài khoản ở Bước 1 trước");
      return;
    }
    const parsed = addOrganizationMemberSchema.safeParse({
      userId: provisioned.userId,
      role,
    });
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
      setMembers((prev) => [
        ...prev,
        {
          ...created,
          fullName: created.fullName || provisioned.fullName,
          email: created.email || provisioned.email,
        },
      ]);
      setProvisioned(null);
      setRole("ORG_STAFF");
      setDrawerOpen(false);
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
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-base">
            Thành viên tổ chức ({members.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Quản lý danh sách nhân sự trực thuộc và phân quyền trong tổ chức.
          </p>
        </div>
        {canManage ? (
          <Button size="sm" onClick={openAddDrawer}>
            <Plus className="h-4 w-4" />
            Thêm thành viên
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
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
                  {canManage ? <TableHead className="text-right">Thao tác</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const isSelf = m.userId === currentUserId;
                  const busy = busyUserId === m.userId;
                  const displayName =
                    m.fullName?.trim() || m.email?.trim() || "Thành viên";
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
                      </TableCell>
                      <TableCell>
                        {canManage && !isSelf ? (
                          <select
                            aria-label={`Vai trò của ${displayName}`}
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
                        <TableCell className="w-[1%] whitespace-nowrap text-right">
                          {!isSelf ? (
                            <RowActionsMenu
                              ariaLabel={`Thao tác cho thành viên ${displayName}`}
                              disabled={busy}
                              groups={[
                                {
                                  id: "danger",
                                  items: [
                                    {
                                      id: "remove",
                                      label: "Xóa khỏi tổ chức",
                                      icon: Trash2,
                                      destructive: true,
                                      onSelect: () => handleRemove(m),
                                    },
                                  ],
                                },
                              ]}
                            />
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

      {canManage ? (
        <FormDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Thêm thành viên vào tổ chức"
          description="Tạo tài khoản xác thực ở Bước 1, sau đó phân quyền vai trò ở Bước 2."
          isDirty={Boolean(provisioned)}
          saving={submitting}
          submitLabel="Thêm vào tổ chức"
          submitDisabled={!provisioned}
          formId="member-step2-form"
          size="lg"
        >
          <AccountProvisioningStep
            organizationId={organizationId}
            provisioned={provisioned}
            onProvisioned={setProvisioned}
          />

          <form
            id="member-step2-form"
            onSubmit={handleAddMember}
            className="space-y-4"
          >
            <FormSection
              title="2. Gán vai trò trong tổ chức"
              description={
                provisioned
                  ? "Chọn vai trò vận hành và xác nhận thêm vào tổ chức."
                  : "Hoàn tất Bước 1 để mở khóa lựa chọn vai trò."
              }
            >
              <FormField label="Vai trò" htmlFor="member-role" required>
                <select
                  id="member-role"
                  value={role}
                  disabled={!provisioned}
                  onChange={(e) =>
                    setRole(e.target.value as (typeof ORG_ROLES)[number])
                  }
                  className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {ORG_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {formatOrgRoleLabel(r)}
                    </option>
                  ))}
                </select>
              </FormField>
            </FormSection>
          </form>
        </FormDrawer>
      ) : null}
    </Card>
  );
}
