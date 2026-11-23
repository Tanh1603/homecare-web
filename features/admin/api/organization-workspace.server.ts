import {
  extractPageItems,
  extractPaginationMeta,
  GatewayApiError,
  type PageResponse,
} from "@/shared/api/api-envelope";
import { gatewayFetch } from "@/shared/api/gateway-client";
import {
  normalizeOrganization,
  type Organization,
} from "@/features/organizations/contracts/organization";
import type {
  OrgProductItem,
  OrgServiceCoverageArea,
  OrgServiceItem,
  OrgTechnicianItem,
} from "@/features/org-ops/api/org-ops.adapter";

interface BackendTechnician {
  id: string;
  profileId: string;
  fullName: string;
  specialties?: string[];
  experienceYears?: number;
  ratingAvg?: number;
  activeAllocations?: number;
  status: string;
}

interface BackendServiceOffering {
  id: string;
  providerId: string;
  providerName: string;
  name: string;
  category: string;
  description?: string;
  basePrice: number;
  priceType?: "FIXED" | "QUOTE_REQUIRED";
  inspectionFee?: number | null;
  priceVersion?: number;
  coverageAreas?: OrgServiceCoverageArea[];
  estimatedDurationMinutes: number;
  active: boolean;
}

interface BackendProduct {
  id: string;
  merchantId: string;
  merchantName: string;
  sku: string;
  name: string;
  category: string;
  brand?: string;
  productType?: string;
  warrantyMonths?: number;
  returnWindowDays?: number;
  description?: string;
  imageUrl?: string | null;
  unitPrice: number;
  availableQty: number;
  reservedQty?: number;
  status: string;
}

export interface OrganizationDetailResult {
  organization: Organization | null;
  errorStatus: number | null;
  errorMessage: string | null;
}

export interface WorkspaceCoverageEntry {
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  serviceActive: boolean;
  areas: OrgServiceCoverageArea[];
}

export interface WorkspaceSummaryData {
  technicians: {
    total: number;
    active: number;
    error: string | null;
  };
  services: {
    total: number;
    active: number;
    withoutCoverage: number;
    items: OrgServiceItem[];
    error: string | null;
  };
  products: {
    total: number;
    active: number;
    outOfStock: number;
    error: string | null;
  };
  coverage: {
    uniqueProvinces: number;
    uniqueWards: number;
    totalBindings: number;
    error: string | null;
  };
}

export const organizationWorkspaceServerApi = {
  async getDetail(orgId: string): Promise<OrganizationDetailResult> {
    try {
      const data = await gatewayFetch<Record<string, unknown>>(
        `/organizations/${encodeURIComponent(orgId)}`,
        { organizationId: null, scope: "personal" }
      );
      return {
        organization: normalizeOrganization(data),
        errorStatus: null,
        errorMessage: null,
      };
    } catch (err) {
      if (err instanceof GatewayApiError) {
        return {
          organization: null,
          errorStatus: err.status,
          errorMessage: err.message,
        };
      }
      return {
        organization: null,
        errorStatus: 500,
        errorMessage: "Không thể tải thông tin tổ chức đối tác.",
      };
    }
  },

  async listTechniciansPage(
    orgId: string,
    params?: { page?: number; size?: number; q?: string }
  ): Promise<PageResponse<OrgTechnicianItem>> {
    const page = Math.max(1, params?.page ?? 1);
    const size = params?.size ?? 20;
    const query = new URLSearchParams({
      providerId: orgId,
      includeInactive: "true",
      page: String(page),
      size: String(size),
    });
    if (params?.q?.trim()) {
      query.set("q", params.q.trim());
    }
    const data = await gatewayFetch<
      PageResponse<BackendTechnician> | BackendTechnician[]
    >(`/technicians?${query.toString()}`, {
      organizationId: null,
      scope: "personal",
    });

    return {
      items: extractPageItems(data).map((t) => ({
        id: t.id,
        profileId: t.profileId,
        fullName: t.fullName,
        phone: t.profileId,
        specialties: t.specialties ?? [],
        specialty: t.specialties?.join(", ") || "Kỹ thuật đa năng",
        experienceYears: t.experienceYears,
        rating: t.ratingAvg ?? 0,
        activeAllocations: t.activeAllocations,
        status: t.status,
      })),
      pagination: extractPaginationMeta(data, page, size),
    };
  },

  async listServicesPage(
    orgId: string,
    params?: { page?: number; size?: number; q?: string }
  ): Promise<PageResponse<OrgServiceItem>> {
    const page = Math.max(1, params?.page ?? 1);
    const size = params?.size ?? 20;
    const query = new URLSearchParams({
      providerId: orgId,
      includeInactive: "true",
      page: String(page),
      size: String(size),
    });
    if (params?.q?.trim()) {
      query.set("q", params.q.trim());
    }
    const data = await gatewayFetch<
      PageResponse<BackendServiceOffering> | BackendServiceOffering[]
    >(`/services?${query.toString()}`, {
      organizationId: null,
      scope: "personal",
    });

    return {
      items: extractPageItems(data).map((s) => ({
        ...s,
        status: s.active ? "ACTIVE" : "INACTIVE",
      })),
      pagination: extractPaginationMeta(data, page, size),
    };
  },

  async listProductsPage(
    orgId: string,
    params?: { page?: number; size?: number; q?: string }
  ): Promise<PageResponse<OrgProductItem>> {
    const page = Math.max(1, params?.page ?? 1);
    const size = params?.size ?? 20;
    const query = new URLSearchParams({
      merchantId: orgId,
      includeInactive: "true",
      page: String(page),
      size: String(size),
    });
    if (params?.q?.trim()) {
      query.set("q", params.q.trim());
    }
    const data = await gatewayFetch<
      PageResponse<BackendProduct> | BackendProduct[]
    >(`/products?${query.toString()}`, {
      organizationId: null,
      scope: "personal",
    });

    return {
      items: extractPageItems(data).map((p) => ({
        ...p,
        reservedQty: p.reservedQty ?? 0,
      })),
      pagination: extractPaginationMeta(data, page, size),
    };
  },

  async getServiceCoverage(
    serviceId: string
  ): Promise<OrgServiceCoverageArea[]> {
    const data = await gatewayFetch<OrgServiceCoverageArea[]>(
      `/services/${encodeURIComponent(serviceId)}/coverage`,
      { organizationId: null, scope: "personal" }
    );
    return Array.isArray(data) ? data : [];
  },

  async listCoverageMatrix(orgId: string): Promise<{
    entries: WorkspaceCoverageEntry[];
    error: string | null;
  }> {
    try {
      const servicesPage = await this.listServicesPage(orgId, {
        page: 1,
        size: 100,
      });
      const services = servicesPage.items;
      const resolved = await Promise.all(
        services.map(async (service) => {
          if (service.coverageAreas && service.coverageAreas.length > 0) {
            return {
              serviceId: service.id,
              serviceName: service.name,
              serviceCategory: service.category,
              serviceActive: service.active,
              areas: service.coverageAreas,
            };
          }
          try {
            const areas = await this.getServiceCoverage(service.id);
            return {
              serviceId: service.id,
              serviceName: service.name,
              serviceCategory: service.category,
              serviceActive: service.active,
              areas,
            };
          } catch {
            return {
              serviceId: service.id,
              serviceName: service.name,
              serviceCategory: service.category,
              serviceActive: service.active,
              areas: [],
            };
          }
        })
      );
      return { entries: resolved, error: null };
    } catch (err) {
      return {
        entries: [],
        error:
          err instanceof Error
            ? err.message
            : "Không thể tải dữ liệu khu vực phủ sóng.",
      };
    }
  },

  async getWorkspaceSummary(orgId: string): Promise<WorkspaceSummaryData> {
    const [techRes, serviceRes, productRes] = await Promise.allSettled([
      this.listTechniciansPage(orgId, { page: 1, size: 100 }),
      this.listServicesPage(orgId, { page: 1, size: 100 }),
      this.listProductsPage(orgId, { page: 1, size: 100 }),
    ]);

    const techItems = techRes.status === "fulfilled" ? techRes.value.items : [];
    const techTotal =
      techRes.status === "fulfilled"
        ? techRes.value.pagination.totalItems
        : 0;
    const techActive = techItems.filter(
      (t) => t.status === "ACTIVE" || t.status === "AVAILABLE" || t.status === "BUSY"
    ).length;

    const serviceItems =
      serviceRes.status === "fulfilled" ? serviceRes.value.items : [];
    const serviceTotal =
      serviceRes.status === "fulfilled"
        ? serviceRes.value.pagination.totalItems
        : 0;
    const serviceActive = serviceItems.filter((s) => s.active).length;

    // Fetch coverage areas for services that didn't embed them directly
    const coveragePerService = await Promise.all(
      serviceItems.slice(0, 30).map(async (s) => {
        if (Array.isArray(s.coverageAreas) && s.coverageAreas.length > 0) {
          return { service: s, areas: s.coverageAreas };
        }
        try {
          const areas = await this.getServiceCoverage(s.id);
          return { service: s, areas };
        } catch {
          return { service: s, areas: [] as OrgServiceCoverageArea[] };
        }
      })
    );

    const provinceSet = new Set<string>();
    const wardSet = new Set<string>();
    let totalBindings = 0;
    let withoutCoverage = 0;

    for (const entry of coveragePerService) {
      const activeAreas = entry.areas.filter((a) => a.active !== false);
      if (entry.service.active && activeAreas.length === 0) {
        withoutCoverage += 1;
      }
      for (const area of activeAreas) {
        totalBindings += 1;
        if (area.level === "PROVINCE") {
          provinceSet.add(area.locationCode);
        } else {
          wardSet.add(area.locationCode);
        }
      }
    }

    const productItems =
      productRes.status === "fulfilled" ? productRes.value.items : [];
    const productTotal =
      productRes.status === "fulfilled"
        ? productRes.value.pagination.totalItems
        : 0;
    const productActive = productItems.filter((p) => p.status === "ACTIVE").length;
    const productOutOfStock = productItems.filter(
      (p) => p.status === "ACTIVE" && (p.availableQty ?? 0) <= 0
    ).length;

    return {
      technicians: {
        total: techTotal,
        active: techActive,
        error:
          techRes.status === "rejected"
            ? techRes.reason instanceof Error
              ? techRes.reason.message
              : "Không thể tải danh sách kỹ thuật viên"
            : null,
      },
      services: {
        total: serviceTotal,
        active: serviceActive,
        withoutCoverage,
        items: serviceItems,
        error:
          serviceRes.status === "rejected"
            ? serviceRes.reason instanceof Error
              ? serviceRes.reason.message
              : "Không thể tải danh sách dịch vụ"
            : null,
      },
      products: {
        total: productTotal,
        active: productActive,
        outOfStock: productOutOfStock,
        error:
          productRes.status === "rejected"
            ? productRes.reason instanceof Error
              ? productRes.reason.message
              : "Không thể tải danh sách sản phẩm"
            : null,
      },
      coverage: {
        uniqueProvinces: provinceSet.size,
        uniqueWards: wardSet.size,
        totalBindings,
        error:
          serviceRes.status === "rejected"
            ? "Không thể tổng hợp khu vực phủ sóng"
            : null,
      },
    };
  },
};
