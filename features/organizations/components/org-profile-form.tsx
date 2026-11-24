"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  COMPANY_TAX_CODE_REGEX,
  formatOrgRoleLabel,
  HOUSEHOLD_PERSONAL_ID_REGEX,
  LEGAL_ENTITY_TYPE_LABELS,
  ORGANIZATION_TYPE_LABELS,
  TAX_CODE_FIELD_CONFIG,
  updateOrganizationSchema,
  type LegalEntityType,
  type Organization,
  type OrganizationMemberRole,
} from "../contracts/organization";
import { organizationsApi } from "../api";
import { OrgEvidenceUploader } from "./org-evidence-uploader";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EvidenceDocumentsList } from "@/shared/ui/evidence-documents-list";
import { FormField, FormSection } from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { ProvinceSelect } from "@/shared/ui/province-select";
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
    const trimmedTaxCode = upgradeTaxCode.trim();
    if (
      targetLegalType === "COMPANY" &&
      !COMPANY_TAX_CODE_REGEX.test(trimmedTaxCode)
    ) {
      toast.error("Doanh nghiệp bắt buộc mã số thuế gồm đúng 10 chữ số.");
      return;
    }
    if (
      targetLegalType === "HOUSEHOLD_BUSINESS" &&
      !HOUSEHOLD_PERSONAL_ID_REGEX.test(trimmedTaxCode)
    ) {
      toast.error(
        "Hộ kinh doanh bắt buộc số định danh cá nhân (CCCD) gồm đúng 12 chữ số."
      );
      return;
    }
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
          taxCode: trimmedTaxCode,
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
                <ProvinceSelect
                  id="org-city"
                  value={city}
                  onChange={setCity}
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
              orgSnapshot.status === "APPROVED" &&
              orgSnapshot.legalEntityType === "INDIVIDUAL" &&
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
            <Alert variant="warning">
              <AlertDescription className="text-xs">
                Đang có yêu cầu nâng cấp loại hình pháp lý sang{" "}
                <strong>
                  {LEGAL_ENTITY_TYPE_LABELS[
                    orgSnapshot.pendingLegalEntityUpgrade
                  ] ?? orgSnapshot.pendingLegalEntityUpgrade}
                </strong>{" "}
                chờ quản trị viên phê duyệt.
              </AlertDescription>
            </Alert>
          ) : null}

          <EvidenceDocumentsList
            value={orgSnapshot?.identityEvidenceRefs}
            organizationId={organizationId}
          />

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
                  <NativeSelect
                    id="upgrade-legal-entity"
                    value={targetLegalType}
                    disabled={upgrading}
                    onChange={(e) =>
                      setTargetLegalType(e.target.value as LegalEntityType)
                    }
                  >
                    {(["HOUSEHOLD_BUSINESS", "COMPANY"] as const).map((t) => (
                      <NativeSelectOption key={t} value={t}>
                        {LEGAL_ENTITY_TYPE_LABELS[t]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </FormField>

                <FormField
                  label={TAX_CODE_FIELD_CONFIG[targetLegalType].label}
                  htmlFor="upgrade-tax-code"
                  required={TAX_CODE_FIELD_CONFIG[targetLegalType].required}
                  hint={TAX_CODE_FIELD_CONFIG[targetLegalType].hint}
                >
                  <Input
                    id="upgrade-tax-code"
                    value={upgradeTaxCode}
                    disabled={upgrading}
                    onChange={(e) => setUpgradeTaxCode(e.target.value)}
                    placeholder={
                      TAX_CODE_FIELD_CONFIG[targetLegalType].placeholder
                    }
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
