"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  formatOrgRoleLabel,
  LEGAL_ENTITY_TYPES,
  LEGAL_ENTITY_TYPE_LABELS,
  ORGANIZATION_TYPE_LABELS,
  updateOrganizationSchema,
  type LegalEntityType,
  type Organization,
  type OrganizationMemberRole,
} from "../contracts/organization";
import { organizationsApi } from "../api";
import { OrgEvidenceUploader } from "./org-evidence-uploader";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EvidenceDocumentsList } from "@/shared/ui/evidence-documents-list";
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
  const isOwner =
    currentUserRole === "ORG_OWNER" || currentUserRole === "OWNER";

  const [orgSnapshot, setOrgSnapshot] = React.useState<Organization | null>(
    initialOrganization
  );
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [targetLegalType, setTargetLegalType] = React.useState<LegalEntityType>(
    initialOrganization?.legalEntityType === "INDIVIDUAL"
      ? "HOUSEHOLD_BUSINESS"
      : "COMPANY"
  );
  const [upgradeTaxCode, setUpgradeTaxCode] = React.useState(
    initialOrganization?.taxCode ?? ""
  );
  const [upgradeEvidenceRefs, setUpgradeEvidenceRefs] = React.useState(
    initialOrganization?.identityEvidenceRefs ?? ""
  );
  const [upgrading, setUpgrading] = React.useState(false);

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

  async function handleUpgradeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner || !orgSnapshot) return;
    if (!upgradeEvidenceRefs.trim()) {
      toast.error("Vui lòng tải lên tài liệu chứng minh pháp lý mới.");
      return;
    }
    setUpgrading(true);
    try {
      const updated = await organizationsApi.upgradeLegalEntity(
        organizationId,
        {
          targetLegalEntityType: targetLegalType,
          taxCode: upgradeTaxCode,
          identityEvidenceRefs: upgradeEvidenceRefs,
        },
        orgSnapshot.version
      );
      setOrgSnapshot(updated);
      setUpgradeOpen(false);
      toast.success("Đã gửi yêu cầu nâng cấp loại hình pháp lý. Chờ Admin phê duyệt.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Không thể gửi yêu cầu nâng cấp pháp nhân"
      );
    } finally {
      setUpgrading(false);
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
        <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Vai trò của bạn</p>
            <p className="mt-0.5 font-medium">
              {formatOrgRoleLabel(currentUserRole)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lĩnh vực hoạt động</p>
            <p className="mt-0.5 font-medium">
              {initialOrganization
                ? ORGANIZATION_TYPE_LABELS[initialOrganization.type] ??
                  initialOrganization.type
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Loại hình pháp lý</p>
            <p className="mt-0.5 font-medium">
              {initialOrganization?.legalEntityType
                ? LEGAL_ENTITY_TYPE_LABELS[initialOrganization.legalEntityType] ??
                  initialOrganization.legalEntityType
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

        <div className="border-t border-border pt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Tài liệu chứng minh pháp lý
              </h3>
              <p className="text-xs text-muted-foreground">
                Tài liệu định danh và giấy phép đã nộp cho HomeCare Admin.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={orgSnapshot?.identityVerified ? "success" : "secondary"}
              >
                {orgSnapshot?.identityVerified
                  ? "Đã xác minh định danh"
                  : "Chưa xác minh"}
              </Badge>
              {isOwner &&
              orgSnapshot &&
              orgSnapshot.legalEntityType !== "COMPANY" &&
              !orgSnapshot.pendingLegalEntityUpgrade ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setUpgradeOpen((v) => !v)}
                >
                  {upgradeOpen
                    ? "Đóng biểu mẫu nâng cấp"
                    : "Yêu cầu nâng cấp pháp nhân"}
                </Button>
              ) : null}
            </div>
          </div>

          {orgSnapshot?.pendingLegalEntityUpgrade ? (
            <div className="rounded-lg border border-warning/30 bg-warning-bg/60 px-3.5 py-2.5 text-xs text-foreground">
              Đang có yêu cầu nâng cấp loại hình pháp lý sang{" "}
              <strong>
                {LEGAL_ENTITY_TYPE_LABELS[orgSnapshot.pendingLegalEntityUpgrade] ??
                  orgSnapshot.pendingLegalEntityUpgrade}
              </strong>{" "}
              chờ quản trị viên phê duyệt.
            </div>
          ) : null}

          <EvidenceDocumentsList value={orgSnapshot?.identityEvidenceRefs} />

          {upgradeOpen && isOwner && orgSnapshot ? (
            <form
              onSubmit={handleUpgradeSubmit}
              className="space-y-4 rounded-xl border border-border bg-surface-secondary/60 p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  label="Loại hình pháp lý muốn nâng cấp"
                  htmlFor="upgrade-legal-entity"
                  required
                >
                  <select
                    id="upgrade-legal-entity"
                    value={targetLegalType}
                    disabled={upgrading}
                    onChange={(e) =>
                      setTargetLegalType(e.target.value as LegalEntityType)
                    }
                    className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-foreground"
                  >
                    {LEGAL_ENTITY_TYPES.filter(
                      (t) => t !== orgSnapshot.legalEntityType
                    ).map((t) => (
                      <option key={t} value={t}>
                        {LEGAL_ENTITY_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Mã số thuế mới (nếu có)"
                  htmlFor="upgrade-tax-code"
                >
                  <Input
                    id="upgrade-tax-code"
                    value={upgradeTaxCode}
                    disabled={upgrading}
                    onChange={(e) => setUpgradeTaxCode(e.target.value)}
                    placeholder="VD: 0312345678"
                  />
                </FormField>
              </div>

              <FormField
                label="Tài liệu chứng minh pháp lý mới"
                htmlFor="upgrade-evidence"
                required
              >
                <OrgEvidenceUploader
                  legalEntityType={targetLegalType}
                  value={upgradeEvidenceRefs}
                  onChange={setUpgradeEvidenceRefs}
                  disabled={upgrading}
                />
              </FormField>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={upgrading}
                  onClick={() => setUpgradeOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" size="sm" loading={upgrading}>
                  {upgrading ? "Đang gửi..." : "Gửi yêu cầu nâng cấp"}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
