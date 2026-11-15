import { gatewayFetch } from "@/shared/api/gateway-client";
import { extractPageItems } from "@/shared/api/api-envelope";
import {
  normalizeMembership,
  normalizeOrganization,
  type Organization,
  type OrganizationMember,
  type OrganizationMembership,
  type OrganizationStatus,
} from "../contracts/organization";

export const organizationsServerApi = {
  async listAll(status?: OrganizationStatus): Promise<Organization[]> {
    try {
      const path = status
        ? `/admin/organizations?status=${encodeURIComponent(status)}`
        : "/admin/organizations";
      const data = await gatewayFetch<
        { items?: Record<string, unknown>[] } | Record<string, unknown>[]
      >(path);
      return extractPageItems(data).map(normalizeOrganization);
    } catch {
      return [];
    }
  },

  async listMyMemberships(): Promise<OrganizationMembership[]> {
    try {
      const data = await gatewayFetch<Record<string, unknown>[]>(
        "/organizations/my"
      );
      return extractPageItems(data).map(normalizeMembership);
    } catch {
      return [];
    }
  },

  async getDetail(id: string): Promise<Organization | null> {
    try {
      const data = await gatewayFetch<Record<string, unknown>>(
        `/organizations/${encodeURIComponent(id)}`
      );
      return normalizeOrganization(data);
    } catch {
      return null;
    }
  },

  async listCurrentMembers(
    organizationId: string
  ): Promise<OrganizationMember[]> {
    try {
      const data = await gatewayFetch<OrganizationMember[]>(
        "/organizations/current/members",
        { organizationId }
      );
      return extractPageItems(data);
    } catch {
      return [];
    }
  },
};
