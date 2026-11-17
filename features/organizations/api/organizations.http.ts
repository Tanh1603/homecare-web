import {
  extractPageItems,
  unwrapApiResponse,
  type ApiResponse,
} from "@/shared/api/api-envelope";
import {
  normalizeMembership,
  normalizeOrganization,
  type AddOrganizationMemberInput,
  type Organization,
  type OrganizationMember,
  type OrganizationMemberRole,
  type OrganizationMembership,
  type RegisterOrganizationInput,
  type ReviewOrganizationInput,
  type UpdateOrganizationInput,
} from "../contracts/organization";

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
    };
    const res = await fetch("/api/gateway/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as ApiResponse<Record<string, unknown>>;
    return normalizeOrganization(unwrapApiResponse(json));
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
};
