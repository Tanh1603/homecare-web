"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  formatOrgRoleLabel,
  ORGANIZATION_TYPE_LABELS,
  updateOrganizationSchema,
  type Organization,
  type OrganizationMemberRole,
} from "../contracts/organization";
import { organizationsApi } from "../api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { StatusBadge } from "@/shared/ui/status-badge";

export function OrgProfileForm({
  organizationId,
  organizationName,
  organizationStatus,
  currentUserRole,
  initialOrganization,
}: {
  organizationId: string;
  organizationName: string;
  organizationStatus: string;
  currentUserRole: OrganizationMemberRole;
  initialOrganization: Organization | null;
}) {
  const router = useRouter();
  const canEdit =
    currentUserRole === "ORG_OWNER" ||
    currentUserRole === "ORG_ADMIN" ||
    currentUserRole === "OWNER" ||
    currentUserRole === "MANAGER";

  const [name, setName] = React.useState(
    initialOrganization?.name ?? organizationName
  );
  const [phone, setPhone] = React.useState(initialOrganization?.phone ?? "");
  const [city, setCity] = React.useState(initialOrganization?.city ?? "");
  const [address, setAddress] = React.useState(
    initialOrganization?.address ?? ""
  );
  const [description, setDescription] = React.useState(
    initialOrganization?.description ?? ""
  );
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    const parsed = updateOrganizationSchema.safeParse({
      name,
      phone,
      city,
      address,
      description,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
      return;
    }

    setSaving(true);
    try {
      const updated = await organizationsApi.updateCurrent(
        organizationId,
        parsed.data
      );
      setName(updated.name);
      setPhone(updated.phone);
      setCity(updated.city);
      setAddress(updated.address ?? "");
      setDescription(updated.description ?? "");
      toast.success("Đã cập nhật hồ sơ tổ chức");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật hồ sơ tổ chức"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{name || organizationName}</CardTitle>
        <StatusBadge status={initialOrganization?.status ?? organizationStatus} />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Vai trò của bạn</p>
            <p className="mt-0.5 font-medium">
              {formatOrgRoleLabel(currentUserRole)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Loại hình (chỉ đọc)</p>
            <p className="mt-0.5 font-medium">
              {initialOrganization
                ? ORGANIZATION_TYPE_LABELS[initialOrganization.type] ??
                  initialOrganization.type
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mã số thuế (chỉ đọc)</p>
            <p className="mt-0.5 font-medium">
              {initialOrganization?.taxCode ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Organization ID</p>
            <code className="mt-0.5 inline-block rounded bg-muted px-1.5 py-0.5 text-xs">
              {organizationId}
            </code>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">Tên tổ chức</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit || saving}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-phone">Số điện thoại</Label>
              <Input
                id="org-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!canEdit || saving}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-city">Tỉnh / Thành phố</Label>
              <Input
                id="org-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!canEdit || saving}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-address">Địa chỉ trụ sở</Label>
              <Input
                id="org-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!canEdit || saving}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-description">Mô tả tổ chức</Label>
            <Textarea
              id="org-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit || saving}
              rows={3}
              placeholder="Giới thiệu dịch vụ, khu vực phục vụ..."
            />
          </div>

          {canEdit ? (
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Chỉ Chủ sở hữu hoặc Quản trị viên tổ chức mới có quyền chỉnh sửa
              hồ sơ.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
