import { gatewayFetch } from "@/shared/api/gateway-client";
import {
  extractPageItems,
  extractPaginationMeta,
  type PageResponse,
} from "@/shared/api/api-envelope";
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
    const pageData = await this.listAllPage({ status, page: 1, size: 100 });
    return pageData.items;
  },

  async listAllPage(params?: {
    status?: OrganizationStatus;
    page?: number;
    size?: number;
  }): Promise<PageResponse<Organization>> {
    const page = params?.page ?? 1;
    const size = params?.size ?? 20;
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (params?.status) {
      query.set("status", params.status);
    }
    const data = await gatewayFetch<
      PageResponse<Record<string, unknown>> | Record<string, unknown>[]
    >(`/admin/organizations?${query.toString()}`, {
      organizationId: null,
      scope: "personal",
    });
    return {
      items: extractPageItems(data).map(normalizeOrganization),
      pagination: extractPaginationMeta(data, page, size),
    };
  },

  async listMyMemberships(): Promise<OrganizationMembership[]> {
    const data = await gatewayFetch<
      PageResponse<Record<string, unknown>> | Record<string, unknown>[]
    >("/organizations/my?page=1&size=100", {
      organizationId: null,
      scope: "personal",
    });
    return extractPageItems(data).map(normalizeMembership);
  },

  async getDetail(id: string): Promise<Organization | null> {
    const data = await gatewayFetch<Record<string, unknown>>(
      `/organizations/${encodeURIComponent(id)}`,
      { organizationId: null, scope: "personal" }
    );
    return normalizeOrganization(data);
  },

  async listCurrentMembers(
    organizationId: string
  ): Promise<OrganizationMember[]> {
    const data = await gatewayFetch<
      PageResponse<OrganizationMember> | OrganizationMember[]
    >("/organizations/current/members?page=1&size=100", { organizationId });
    return extractPageItems(data);
  },
};
