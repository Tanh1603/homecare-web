import {
  extractPageItems,
  extractPaginationMeta,
  type PageResponse,
} from "@/shared/api/api-envelope";
import { gatewayFetch } from "@/shared/api/gateway-client";

export interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface CatalogItem {
  id: string;
  type: "DEVICE" | "SERVICE" | "PRODUCT";
  name: string;
  category: string;
  providerName?: string;
  basePrice?: number;
  durationMinutes?: number;
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
  unitPrice: number;
  availableQty: number;
  status: string;
}

interface SupabaseAdminUserRaw {
  id: string;
  email?: string;
  created_at?: string;
  banned_until?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

function resolveSupabaseRole(user: SupabaseAdminUserRaw): string {
  const candidates: string[] = [];
  const appRoles = user.app_metadata?.roles;
  const appUserRoles = user.app_metadata?.user_roles;
  const metaRole = user.user_metadata?.role;

  for (const source of [appRoles, appUserRoles, metaRole]) {
    if (Array.isArray(source)) {
      source.forEach((v) => {
        if (typeof v === "string" && v.trim()) candidates.push(v.trim());
      });
    } else if (typeof source === "string" && source.trim()) {
      candidates.push(source.trim());
    }
  }

  for (const preferred of ["ADMIN", "ORGANIZATION", "TECHNICIAN", "CUSTOMER"]) {
    if (candidates.some((r) => r.toUpperCase() === preferred)) {
      return preferred;
    }
  }
  return candidates[0]?.toUpperCase() ?? "CUSTOMER";
}

async function listUsersFromSupabaseAdmin(): Promise<AdminUserItem[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) return [];

  try {
    const res = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/auth/v1/admin/users?page=1&per_page=100`,
      {
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { users?: SupabaseAdminUserRaw[] };
    const users = Array.isArray(json.users) ? json.users : [];
    return users.map((u) => {
      const email = u.email ?? "";
      const metaName =
        (u.user_metadata?.full_name as string | undefined) ||
        (u.user_metadata?.name as string | undefined);
      return {
        id: u.id,
        fullName: metaName?.trim() || email.split("@")[0] || u.id,
        email,
        role: resolveSupabaseRole(u),
        status: u.banned_until ? "SUSPENDED" : "ACTIVE",
        createdAt: u.created_at ?? new Date().toISOString(),
      };
    });
  } catch {
    return [];
  }
}

export const adminApi = {
  async listUsers(): Promise<AdminUserItem[]> {
    return (await this.listUsersPage(1, 100)).items;
  },

  async listUsersPage(
    page = 1,
    size = 20
  ): Promise<PageResponse<AdminUserItem>> {
    try {
      const data = await gatewayFetch<
        PageResponse<AdminUserItem> | AdminUserItem[]
      >(`/admin/users?page=${page}&size=${size}`, {
        organizationId: null,
        scope: "personal",
      });
      return {
        items: extractPageItems(data),
        pagination: extractPaginationMeta(data, page, size),
      };
    } catch (err) {
      const fallback = await listUsersFromSupabaseAdmin();
      if (fallback.length > 0) {
        return {
          items: fallback,
          pagination: {
            page: 1,
            size: fallback.length,
            totalItems: fallback.length,
            totalPages: 1,
          },
        };
      }
      throw err;
    }
  },

  async listServicesCatalogPage(
    page = 1,
    size = 20
  ): Promise<PageResponse<CatalogItem>> {
    const data = await gatewayFetch<
      PageResponse<BackendServiceOffering> | BackendServiceOffering[]
    >(`/services?includeInactive=true&page=${page}&size=${size}`, {
      organizationId: null,
      scope: "personal",
    });
    return {
      items: extractPageItems(data).map((s) => ({
        id: s.id,
        type: "SERVICE" as const,
        name: s.name,
        category: s.category,
        providerName: s.providerName,
        basePrice: s.basePrice,
        durationMinutes: s.estimatedDurationMinutes,
        status: s.active ? "ACTIVE" : "INACTIVE",
      })),
      pagination: extractPaginationMeta(data, page, size),
    };
  },

  async listProductsCatalogPage(
    page = 1,
    size = 20
  ): Promise<PageResponse<CatalogItem>> {
    const data = await gatewayFetch<
      PageResponse<BackendProduct> | BackendProduct[]
    >(`/products?includeInactive=true&page=${page}&size=${size}`, {
      organizationId: null,
      scope: "personal",
    });
    return {
      items: extractPageItems(data).map((p) => ({
        id: p.id,
        type: "PRODUCT" as const,
        name: p.name,
        category: p.category,
        providerName: p.merchantName,
        basePrice: p.unitPrice,
        status: p.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      })),
      pagination: extractPaginationMeta(data, page, size),
    };
  },

  async listCatalog(): Promise<CatalogItem[]> {
    const [servicesRes, productsRes] = await Promise.all([
      this.listServicesCatalogPage(1, 100),
      this.listProductsCatalogPage(1, 100),
    ]);
    return [...servicesRes.items, ...productsRes.items];
  },
};
