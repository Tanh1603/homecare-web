import { extractPageItems } from "@/shared/api/api-envelope";
import { gatewayHeaders, requestGateway } from "@/shared/api/http-client";
import {
  requestPresignedUpload,
  uploadFileViaPresignedUrl,
  type PresignedUploadResponse,
} from "@/shared/api/media-upload";
import {
  normalizeMembership,
  normalizeOrganization,
  type AddOrganizationMemberInput,
  type Organization,
  type OrganizationEvidenceRef,
  type OrganizationMember,
  type OrganizationMemberRole,
  type OrganizationMembership,
  type RegisterOrganizationInput,
  type ResubmitOrganizationInput,
  type ReviewOrganizationInput,
  type UpdateOrganizationInput,
} from "../contracts/organization";

export type PresignedEvidenceUpload = PresignedUploadResponse;

export const organizationsHttpAdapter = {
  async listAll(page = 1, size = 100): Promise<Organization[]> {
    const data = await requestGateway<
      { items?: Record<string, unknown>[] } | Record<string, unknown>[]
    >({
      url: `/admin/organizations?page=${page}&size=${size}`,
      method: "GET",
      headers: gatewayHeaders({ personal: true }),
    });
    return extractPageItems(data).map(normalizeOrganization);
  },

  async listMyMemberships(page = 1, size = 100): Promise<OrganizationMembership[]> {
    const data = await requestGateway<
      { items?: Record<string, unknown>[] } | Record<string, unknown>[]
    >({
      url: `/organizations/my?page=${page}&size=${size}`,
      method: "GET",
      headers: gatewayHeaders({ personal: true }),
    });
    return extractPageItems(data).map(normalizeMembership);
  },

  async register(input: RegisterOrganizationInput): Promise<Organization> {
    const payload = {
      ...input,
      taxCode: input.taxCode?.trim() || undefined,
      description: input.description?.trim() || undefined,
      identityEvidenceRefs: input.identityEvidenceRefs.trim(),
    };
    const data = await requestGateway<Record<string, unknown>>({
      url: "/organizations",
      method: "POST",
      data: payload,
    });
    return normalizeOrganization(data);
  },

  async resubmit(
    organizationId: string,
    input: ResubmitOrganizationInput,
    version?: number
  ): Promise<Organization> {
    const payload = {
      ...input,
      taxCode: input.taxCode?.trim() || undefined,
      description: input.description?.trim() || undefined,
      identityEvidenceRefs: input.identityEvidenceRefs.trim(),
    };
    const data = await requestGateway<Record<string, unknown>>({
      url: `/organizations/${encodeURIComponent(organizationId)}/resubmit`,
      method: "PUT",
      headers: gatewayHeaders({ version, personal: true }),
      data: payload,
    });
    return normalizeOrganization(data);
  },

  async upgradeLegalEntity(
    organizationId: string,
    input: {
      targetLegalEntityType: "COMPANY" | "HOUSEHOLD_BUSINESS" | "INDIVIDUAL";
      taxCode?: string;
      identityEvidenceRefs?: string;
    },
    version?: number
  ): Promise<Organization> {
    const data = await requestGateway<Record<string, unknown>>({
      url: `/organizations/${encodeURIComponent(organizationId)}/upgrade-legal-entity`,
      method: "POST",
      headers: gatewayHeaders({ version, personal: true }),
      data: {
        targetLegalEntityType: input.targetLegalEntityType,
        taxCode: input.taxCode?.trim() || undefined,
        identityEvidenceRefs: input.identityEvidenceRefs?.trim() || undefined,
      },
    });
    return normalizeOrganization(data);
  },

  async presignEvidenceUpload(input: {
    fileName: string;
    contentType: string;
    documentType?: string;
  }): Promise<PresignedEvidenceUpload> {
    return requestPresignedUpload(
      "/api/gateway/organizations/evidence/presign",
      input,
      "personal"
    );
  },

  async uploadEvidenceFile(
    file: File,
    documentType = "LEGAL_DOCUMENT"
  ): Promise<OrganizationEvidenceRef> {
    return uploadFileViaPresignedUrl({
      presignUrl: "/api/gateway/organizations/evidence/presign",
      file,
      documentType,
      scope: "personal",
    });
  },

  async review(
    organizationId: string,
    input: ReviewOrganizationInput
  ): Promise<Organization> {
    const action =
      input.status === "APPROVED"
        ? "approve"
        : input.status === "REJECTED"
          ? "reject"
          : "suspend";
    const data = await requestGateway<Record<string, unknown>>({
      url: `/admin/organizations/${organizationId}/${action}`,
      method: "POST",
      headers: gatewayHeaders({ personal: true }),
      data:
        action === "reject" || action === "suspend"
          ? {
              reason:
                input.reason?.trim() ||
                (action === "reject"
                  ? "Hồ sơ chưa đạt yêu cầu"
                  : "Tạm ngưng theo quyết định quản trị"),
            }
          : undefined,
    });
    return normalizeOrganization(data);
  },

  async reactivate(organizationId: string): Promise<Organization> {
    const data = await requestGateway<Record<string, unknown>>({
      url: `/admin/organizations/${encodeURIComponent(organizationId)}/reactivate`,
      method: "POST",
      headers: gatewayHeaders({ personal: true }),
    });
    return normalizeOrganization(data);
  },

  async approveUpgrade(organizationId: string): Promise<Organization> {
    const data = await requestGateway<Record<string, unknown>>({
      url: `/admin/organizations/${encodeURIComponent(organizationId)}/approve-upgrade`,
      method: "POST",
      headers: gatewayHeaders({ personal: true }),
    });
    return normalizeOrganization(data);
  },

  async addMember(
    organizationId: string,
    input: AddOrganizationMemberInput
  ): Promise<OrganizationMember> {
    return requestGateway<OrganizationMember>({
      url: "/organizations/current/members",
      method: "POST",
      headers: gatewayHeaders({ organizationId }),
      data: input,
    });
  },

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: OrganizationMemberRole
  ): Promise<OrganizationMember> {
    return requestGateway<OrganizationMember>({
      url: `/organizations/current/members/${encodeURIComponent(userId)}`,
      method: "PATCH",
      headers: gatewayHeaders({ organizationId }),
      data: { role },
    });
  },

  async removeMember(organizationId: string, userId: string): Promise<void> {
    await requestGateway<null>({
      url: `/organizations/current/members/${encodeURIComponent(userId)}`,
      method: "DELETE",
      headers: gatewayHeaders({ organizationId }),
    });
  },

  async updateCurrent(
    organizationId: string,
    input: UpdateOrganizationInput
  ): Promise<Organization> {
    const payload = {
      ...input,
      description: input.description?.trim() || undefined,
    };
    const data = await requestGateway<Record<string, unknown>>({
      url: "/organizations/current",
      method: "PATCH",
      headers: gatewayHeaders({ organizationId }),
      data: payload,
    });
    return normalizeOrganization(data);
  },

  async ban(
    organizationId: string,
    input: {
      reason: string;
      evidenceRefs?: string;
      safetyInterventionFlag?: boolean;
    }
  ): Promise<Organization> {
    const data = await requestGateway<Record<string, unknown>>({
      url: `/admin/organizations/${encodeURIComponent(organizationId)}/ban`,
      method: "POST",
      headers: gatewayHeaders({ personal: true }),
      data: input,
    });
    return normalizeOrganization(data);
  },

  async submitAppeal(
    organizationId: string,
    input: {
      enforcementId: string;
      appealReason: string;
      evidenceRefs?: string;
    }
  ): Promise<{ id: string; status: string; slaDueAt: string }> {
    return requestGateway<{ id: string; status: string; slaDueAt: string }>({
      url: `/organizations/${encodeURIComponent(organizationId)}/appeals`,
      method: "POST",
      headers: gatewayHeaders({ personal: true }),
      data: input,
    });
  },

  async resolveAppeal(
    organizationId: string,
    appealId: string,
    input: {
      approved: boolean;
      reviewNote?: string;
      targetStatus?: "APPROVED" | "SUSPENDED";
    }
  ): Promise<{ id: string; status: string }> {
    return requestGateway<{ id: string; status: string }>({
      url: `/admin/organizations/${encodeURIComponent(organizationId)}/appeals/${encodeURIComponent(appealId)}/resolve`,
      method: "POST",
      headers: gatewayHeaders({ personal: true }),
      data: input,
    });
  },

  async listGovernanceSettings(): Promise<
    { settingKey: string; settingValue: string; updatedBy?: string | null; updatedAt?: string }[]
  > {
    return requestGateway<
      { settingKey: string; settingValue: string; updatedBy?: string | null; updatedAt?: string }[]
    >({
      url: "/admin/governance/settings",
      method: "GET",
      headers: gatewayHeaders({ personal: true }),
    });
  },

  async updateGovernanceSetting(
    key: string,
    value: string
  ): Promise<{ settingKey: string; settingValue: string }> {
    return requestGateway<{ settingKey: string; settingValue: string }>({
      url: `/admin/governance/settings/${encodeURIComponent(key)}`,
      method: "PUT",
      headers: gatewayHeaders({ personal: true }),
      data: { value },
    });
  },
};
