"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
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
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { FormDrawer, FormField, FormSection } from "@/shared/ui/form-drawer";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { RowActionsMenu } from "@/shared/ui/row-actions-menu";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Badge } from "@/shared/ui/badge";
import { EmptyState } from "@/shared/ui/empty-state";
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

  const canManage =
    currentUserRole === "ORG_OWNER" ||
    currentUserRole === "ORG_ADMIN" ||
    currentUserRole === "OWNER" ||
    currentUserRole === "MANAGER";

  const addMemberMutation = useMutation({
    mutationFn: (vars: {
      userId: string;
      role: (typeof ORG_ROLES)[number];
      provisionedInfo: ProvisionedAccountInfo;
    }) => organizationsApi.addMember(organizationId, { userId: vars.userId, role: vars.role }),
    onSuccess: (created, vars) => {
      setMembers((prev) => [
        ...prev,
        {
          ...created,
          fullName: created.fullName || vars.provisionedInfo.fullName,
          email: created.email || vars.provisionedInfo.email,
        },
      ]);
      setProvisioned(null);
      setRole("ORG_STAFF");
      setDrawerOpen(false);
      toast.success("Đã thêm thành viên vào tổ chức");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể thêm thành viên"
      );
    },
  });

  const roleMutation = useMutation({
    mutationFn: (vars: {
      member: OrganizationMember;
      nextRole: (typeof ORG_ROLES)[number];
    }) =>
      organizationsApi.updateMemberRole(
        organizationId,
        vars.member.userId,
        vars.nextRole
      ),
    onSuccess: (updated, vars) => {
      setMembers((prev) =>
        prev.map((m) => (m.userId === vars.member.userId ? updated : m))
      );
      toast.success("Đã cập nhật vai trò thành viên");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể đổi vai trò"
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: (member: OrganizationMember) =>
      organizationsApi.removeMember(organizationId, member.userId),
    onSuccess: (_res, member) => {
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
      toast.success("Đã xóa thành viên khỏi tổ chức");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa thành viên"
      );
    },
  });

  const submitting = addMemberMutation.isPending;
  const busyUserId = roleMutation.isPending
    ? roleMutation.variables?.member.userId ?? null
    : removeMutation.isPending
      ? removeMutation.variables?.userId ?? null
      : null;

  function openAddDrawer() {
    setProvisioned(null);
    setRole("ORG_STAFF");
    setDrawerOpen(true);
  }

  function handleAddMember(e: React.FormEvent) {
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
    addMemberMutation.mutate({
      ...parsed.data,
      provisionedInfo: provisioned,
    });
  }

  const columns = React.useMemo<DataTableColumn<OrganizationMember>[]>(() => {
    const base: DataTableColumn<OrganizationMember>[] = [
      {
        accessorKey: "fullName",
        header: "Thành viên",
        cell: ({ row }) => {
          const m = row.original;
          const isSelf = m.userId === currentUserId;
          const displayName =
            m.fullName?.trim() || m.email?.trim() || "Thành viên";
          return (
            <div className="text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-foreground">
                  {displayName}
                </span>
                {isSelf ? <Badge variant="secondary">Bạn</Badge> : null}
              </div>
              {m.email && m.fullName ? (
                <p className="text-[11px] text-muted-foreground">{m.email}</p>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "role",
        header: "Vai trò",
        cell: ({ row }) => {
          const m = row.original;
          const isSelf = m.userId === currentUserId;
          const busy = busyUserId === m.userId;
          const displayName =
            m.fullName?.trim() || m.email?.trim() || "Thành viên";
          if (!canManage || isSelf) {
            return (
              <Badge variant="outline">{formatOrgRoleLabel(m.role)}</Badge>
            );
          }
          return (
            <div className="w-44">
              <NativeSelect
                size="sm"
                aria-label={`Vai trò của ${displayName}`}
                value={m.role}
                disabled={busy}
                onChange={(e) => {
                  const nextRole = e.target.value as (typeof ORG_ROLES)[number];
                  if (m.role !== nextRole) {
                    roleMutation.mutate({ member: m, nextRole });
                  }
                }}
                className="text-xs font-medium"
              >
                {ORG_ROLES.map((r) => (
                  <NativeSelectOption key={r} value={r}>
                    {formatOrgRoleLabel(r)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          );
        },
      },
      {
        accessorKey: "joinedAt",
        header: "Ngày tham gia",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.joinedAt)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ];

    if (canManage) {
      base.push({
        id: "actions",
        header: () => <div className="text-right">Thao tác</div>,
        cell: ({ row }) => {
          const m = row.original;
          const isSelf = m.userId === currentUserId;
          const busy = busyUserId === m.userId;
          const displayName =
            m.fullName?.trim() || m.email?.trim() || "Thành viên";
          return (
            <div className="text-right">
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
                          onSelect: () => removeMutation.mutate(m),
                        },
                      ],
                    },
                  ]}
                />
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          );
        },
      });
    }

    return base;
  }, [busyUserId, canManage, currentUserId, removeMutation, roleMutation]);

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
          <DataTable
            hideSearch
            serverSide
            data={members}
            columns={columns}
          />
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
                <NativeSelect
                  id="member-role"
                  value={role}
                  disabled={!provisioned}
                  onChange={(e) =>
                    setRole(e.target.value as (typeof ORG_ROLES)[number])
                  }
                >
                  {ORG_ROLES.map((r) => (
                    <NativeSelectOption key={r} value={r}>
                      {formatOrgRoleLabel(r)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
            </FormSection>
          </form>
        </FormDrawer>
      ) : null}
    </Card>
  );
}
