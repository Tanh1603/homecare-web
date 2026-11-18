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
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormField, FormSection } from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
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

  const [savedValues, setSavedValues] = React.useState({
    name: initialOrganization?.name ?? organizationName,
    phone: initialOrganization?.phone ?? "",
    city: initialOrganization?.city ?? "",
    address: initialOrganization?.address ?? "",
    description: initialOrganization?.description ?? "",
  });

  const [name, setName] = React.useState(savedValues.name);
  const [phone, setPhone] = React.useState(savedValues.phone);
  const [city, setCity] = React.useState(savedValues.city);
  const [address, setAddress] = React.useState(savedValues.address);
  const [description, setDescription] = React.useState(savedValues.description);
  const [saving, setSaving] = React.useState(false);

  const isDirty =
    name !== savedValues.name ||
    phone !== savedValues.phone ||
    city !== savedValues.city ||
    address !== savedValues.address ||
    description !== savedValues.description;

  function handleReset() {
    setName(savedValues.name);
    setPhone(savedValues.phone);
    setCity(savedValues.city);
    setAddress(savedValues.address);
    setDescription(savedValues.description);
  }

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
      const nextSaved = {
        name: updated.name,
        phone: updated.phone,
        city: updated.city,
        address: updated.address ?? "",
        description: updated.description ?? "",
      };
      setSavedValues(nextSaved);
      setName(nextSaved.name);
      setPhone(nextSaved.phone);
      setCity(nextSaved.city);
      setAddress(nextSaved.address);
      setDescription(nextSaved.description);
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
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{name || organizationName}</CardTitle>
          {isDirty ? (
            <Badge variant="warning" className="hc-animate-error-in">
              Chưa lưu thay đổi
            </Badge>
          ) : null}
        </div>
        <StatusBadge
          status={initialOrganization?.status ?? organizationStatus}
        />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Vai trò của bạn</p>
            <p className="mt-0.5 font-medium">
              {formatOrgRoleLabel(currentUserRole)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Loại hình pháp lý</p>
            <p className="mt-0.5 font-medium">
              {initialOrganization
                ? ORGANIZATION_TYPE_LABELS[initialOrganization.type] ??
                  initialOrganization.type
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mã số thuế</p>
            <p className="mt-0.5 font-medium">
              {initialOrganization?.taxCode ?? "—"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSection
            title="Thông tin liên hệ & Địa điểm"
            description="Thông tin hiển thị cho khách hàng khi đặt lịch dịch vụ hoặc mua linh kiện."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Tên tổ chức" htmlFor="org-name" required>
                <Input
                  id="org-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEdit || saving}
                  required
                />
              </FormField>
              <FormField label="Số điện thoại" htmlFor="org-phone" required>
                <Input
                  id="org-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!canEdit || saving}
                  required
                />
              </FormField>
              <FormField label="Tỉnh / Thành phố" htmlFor="org-city" required>
                <Input
                  id="org-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!canEdit || saving}
                  required
                />
              </FormField>
              <FormField label="Địa chỉ trụ sở" htmlFor="org-address" required>
                <Input
                  id="org-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={!canEdit || saving}
                  required
                />
              </FormField>
            </div>
            <FormField
              label="Mô tả tổ chức"
              htmlFor="org-description"
              hint="Giới thiệu thế mạnh dịch vụ, khu vực phục vụ và cam kết bảo hành."
            >
              <Textarea
                id="org-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEdit || saving}
                rows={3}
                placeholder="Giới thiệu dịch vụ, khu vực phục vụ..."
              />
            </FormField>
          </FormSection>

          {canEdit ? (
            <div className="flex items-center justify-end gap-2">
              {isDirty ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={handleReset}
                >
                  Khôi phục
                </Button>
              ) : null}
              <Button
                type="submit"
                loading={saving}
                disabled={saving || !isDirty}
              >
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
