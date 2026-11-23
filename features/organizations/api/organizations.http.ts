import {
  extractPageItems,
  unwrapApiResponse,
  type ApiResponse,
} from "@/shared/api/api-envelope";
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
    const res = await fetch(
      `/api/gateway/admin/organizations?page=${page}&size=${size}`,
      {
        cache: "no-store",
        headers: { "x-homecare-scope": "personal" },
      }
    );
    const json = (await res.json()) as ApiResponse<
      { items?: Record<string, unknown>[] } | Record<string, unknown>[]
    >;
    const items = extractPageItems(unwrapApiResponse(json));
    return items.map(normalizeOrganization);
  },

  async listMyMemberships(page = 1, size = 100): Promise<OrganizationMembership[]> {
    const res = await fetch(
      `/api/gateway/organizations/my?page=${page}&size=${size}`,
      {
        cache: "no-store",
        headers: { "x-homecare-scope": "personal" },
      }
    );
    const json = (await res.json()) as ApiResponse<
      { items?: Record<string, unknown>[] } | Record<string, unknown>[]
    >;
    const items = extractPageItems(unwrapApiResponse(json));
    return items.map(normalizeMembership);
  },

  async register(input: RegisterOrganizationInput): Promise<Organization> {
    const payload = {
      ...input,
      taxCode: input.taxCode?.trim() || undefined,
      description: input.description?.trim() || undefined,
      identityEvidenceRefs: input.identityEvidenceRefs.trim(),
    };
    const res = await fetch("/api/gateway/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as ApiResponse<Record<string, unknown>>;
    return normalizeOrganization(unwrapApiResponse(json));
  },

  async resubmit(
    organizationId: string,
    input: ResubmitOrganizationInput,
    version?: number
  ): Promise<Organization> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-homecare-scope": "personal",
    };
    if (typeof version === "number") {
      headers["If-Match"] = `W/"${version}"`;
    }
    const payload = {
      ...input,
      taxCode: input.taxCode?.trim() || undefined,
      description: input.description?.trim() || undefined,
      identityEvidenceRefs: input.identityEvidenceRefs.trim(),
    };
    const res = await fetch(
      `/api/gateway/organizations/${encodeURIComponent(organizationId)}/resubmit`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      }
    );
    const json = (await res.json()) as ApiResponse<Record<string, unknown>>;
    return normalizeOrganization(unwrapApiResponse(json));
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
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-homecare-scope": "personal",
    };
    if (typeof version === "number") {
      headers["If-Match"] = `W/"${version}"`;
    }
    const res = await fetch(
      `/api/gateway/organizations/${encodeURIComponent(organizationId)}/upgrade-legal-entity`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          targetLegalEntityType: input.targetLegalEntityType,
          taxCode: input.taxCode?.trim() || undefined,
          identityEvidenceRefs: input.identityEvidenceRefs?.trim() || undefined,
        }),
      }
    );
    const json = (await res.json()) as ApiResponse<Record<string, unknown>>;
    return normalizeOrganization(unwrapApiResponse(json));
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
    const res = await fetch(
      `/api/gateway/admin/organizations/${organizationId}/${action}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-homecare-scope": "personal",
        },
        body:
          action === "reject"
            ? JSON.stringify({
                reason: input.reason?.trim() || "Hồ sơ chưa đạt yêu cầu",
              })
            : undefined,
      }
    );
    const json = (await res.json()) as ApiResponse<Record<string, unknown>>;
    return normalizeOrganization(unwrapApiResponse(json));
  },

  async reactivate(organizationId: string): Promise<Organization> {
    const res = await fetch(
      `/api/gateway/admin/organizations/${encodeURIComponent(organizationId)}/reactivate`,
      {
        method: "POST",
        headers: { "x-homecare-scope": "personal" },
      }
    );
    const json = (await res.json()) as ApiResponse<Record<string, unknown>>;
    return normalizeOrganization(unwrapApiResponse(json));
  },

  async approveUpgrade(organizationId: string): Promise<Organization> {
    const res = await fetch(
      `/api/gateway/admin/organizations/${encodeURIComponent(organizationId)}/approve-upgrade`,
      {
        method: "POST",
        headers: { "x-homecare-scope": "personal" },
      }
    );
    const json = (await res.json()) as ApiResponse<Record<string, unknown>>;
    return normalizeOrganization(unwrapApiResponse(json));
  },

  async addMember(
    organizationId: string,
    input: AddOrganizationMemberInput
  ): Promise<OrganizationMember> {
    const res = await fetch("/api/gateway/organizations/current/members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Organization-Id": organizationId,
      },
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as ApiResponse<OrganizationMember>;
    return unwrapApiResponse(json);
  },

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: OrganizationMemberRole
  ): Promise<OrganizationMember> {
    const res = await fetch(
      `/api/gateway/organizations/current/members/${encodeURIComponent(userId)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
        body: JSON.stringify({ role }),
      }
    );
    const json = (await res.json()) as ApiResponse<OrganizationMember>;
    return unwrapApiResponse(json);
  },

  async removeMember(organizationId: string, userId: string): Promise<void> {
    const res = await fetch(
      `/api/gateway/organizations/current/members/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers: {
          "X-Organization-Id": organizationId,
        },
      }
    );
    const json = (await res.json()) as ApiResponse<null>;
    unwrapApiResponse(json);
  },

  async updateCurrent(
    organizationId: string,
    input: UpdateOrganizationInput
  ): Promise<Organization> {
    const payload = {
      ...input,
      description: input.description?.trim() || undefined,
    };
    const res = await fetch("/api/gateway/organizations/current", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Organization-Id": organizationId,
      },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as ApiResponse<Record<string, unknown>>;
    return normalizeOrganization(unwrapApiResponse(json));
  },

  async ban(
    organizationId: string,
    input: {
      reason: string;
      evidenceRefs?: string;
      safetyInterventionFlag?: boolean;
    }
  ): Promise<Organization> {
    const res = await fetch(
      `/api/gateway/admin/organizations/${encodeURIComponent(organizationId)}/ban`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-homecare-scope": "personal",
        },
        body: JSON.stringify(input),
      }
    );
    const json = (await res.json()) as ApiResponse<Record<string, unknown>>;
    return normalizeOrganization(unwrapApiResponse(json));
  },

  async submitAppeal(
    organizationId: string,
    input: {
      enforcementId: string;
      appealReason: string;
      evidenceRefs?: string;
    }
  ): Promise<{ id: string; status: string; slaDueAt: string }> {
    const res = await fetch(
      `/api/gateway/organizations/${encodeURIComponent(organizationId)}/appeals`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-homecare-scope": "personal",
        },
        body: JSON.stringify(input),
      }
    );
    const json = (await res.json()) as ApiResponse<{
      id: string;
      status: string;
      slaDueAt: string;
    }>;
    return unwrapApiResponse(json);
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
    const res = await fetch(
      `/api/gateway/admin/organizations/${encodeURIComponent(organizationId)}/appeals/${encodeURIComponent(appealId)}/resolve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-homecare-scope": "personal",
        },
        body: JSON.stringify(input),
      }
    );
    const json = (await res.json()) as ApiResponse<{
      id: string;
      status: string;
    }>;
    return unwrapApiResponse(json);
  },

  async listGovernanceSettings(): Promise<
    { settingKey: string; settingValue: string; updatedBy?: string | null; updatedAt?: string }[]
  > {
    const res = await fetch("/api/gateway/admin/governance/settings", {
      cache: "no-store",
      headers: { "x-homecare-scope": "personal" },
    });
    const json = (await res.json()) as ApiResponse<
      { settingKey: string; settingValue: string; updatedBy?: string | null; updatedAt?: string }[]
    >;
    return unwrapApiResponse(json);
  },

  async updateGovernanceSetting(
    key: string,
    value: string
  ): Promise<{ settingKey: string; settingValue: string }> {
    const res = await fetch(
      `/api/gateway/admin/governance/settings/${encodeURIComponent(key)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-homecare-scope": "personal",
        },
        body: JSON.stringify({ value }),
      }
    );
    const json = (await res.json()) as ApiResponse<{
      settingKey: string;
      settingValue: string;
    }>;
    return unwrapApiResponse(json);
  },
};
