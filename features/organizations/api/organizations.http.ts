import { unwrapApiResponse, type ApiResponse } from "@/shared/api/api-envelope";
import type {
  Organization,
  OrganizationMembership,
  RegisterOrganizationInput,
  ReviewOrganizationInput,
} from "../contracts/organization";

export const organizationsHttpAdapter = {
  async listAll(): Promise<Organization[]> {
    const res = await fetch("/api/gateway/admin/organizations", {
      cache: "no-store",
    });
    const json = (await res.json()) as ApiResponse<{ items: Organization[] } | Organization[]>;
    const data = unwrapApiResponse(json);
    return Array.isArray(data) ? data : data.items;
  },

  async listMyMemberships(): Promise<OrganizationMembership[]> {
    const res = await fetch("/api/gateway/organizations/me/memberships", {
      cache: "no-store",
    });
    const json = (await res.json()) as ApiResponse<OrganizationMembership[]>;
    return unwrapApiResponse(json);
  },

  async register(input: RegisterOrganizationInput): Promise<Organization> {
    const res = await fetch("/api/gateway/organizations/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as ApiResponse<Organization>;
    return unwrapApiResponse(json);
  },

  async review(
    organizationId: string,
    input: ReviewOrganizationInput
  ): Promise<Organization> {
    const res = await fetch(
      `/api/gateway/admin/organizations/${organizationId}/review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );
    const json = (await res.json()) as ApiResponse<Organization>;
    return unwrapApiResponse(json);
  },
};
