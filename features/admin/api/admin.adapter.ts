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
  description?: string;
  sku?: string;
  brand?: string;
  productType?: string;
  warrantyMonths?: number;
  returnWindowDays?: number;
  imageUrl?: string | null;
  availableQty?: number;
  reservedQty?: number;
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

interface SupabaseAdminUserRaw {
  id: string;
  email?: string;
  created_at?: string;
  banned_until?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

function resolveSupabaseRole(
  user: SupabaseAdminUserRaw,
  dbRoles: string[] = []
): string {
  const candidates: string[] = [...dbRoles];
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
    const base = supabaseUrl.replace(/\/$/, "");
    const res = await fetch(`${base}/auth/v1/admin/users?page=1&per_page=100`, {
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { users?: SupabaseAdminUserRaw[] };
    const users = Array.isArray(json.users) ? json.users : [];
    const dbRolesByUser = new Map<string, string[]>();
    if (users.length > 0) {
      try {
        const ids = users.map((u) => u.id).join(",");
        const rolesRes = await fetch(
          `${base}/rest/v1/user_roles?user_id=in.(${ids})&select=user_id,roles(code)`,
          {
            headers: {
              apikey: secretKey,
              Authorization: `Bearer ${secretKey}`,
            },
            cache: "no-store",
          }
        );
        if (rolesRes.ok) {
          const roleRows = (await rolesRes.json()) as Array<{
            user_id?: string;
            roles?: { code?: string } | null;
          }>;
          for (const row of roleRows) {
            const code = row.roles?.code?.trim();
            if (row.user_id && code) {
              const list = dbRolesByUser.get(row.user_id) ?? [];
              list.push(code);
              dbRolesByUser.set(row.user_id, list);
            }
          }
        }
      } catch {
        // Fallback to metadata-only roles if PostgREST lookup fails
      }
    }
    return users.map((u) => {
      const email = u.email ?? "";
      const metaName =
        (u.user_metadata?.full_name as string | undefined) ||
        (u.user_metadata?.name as string | undefined);
      return {
        id: u.id,
        fullName: metaName?.trim() || email.split("@")[0] || u.id,
        email,
        role: resolveSupabaseRole(u, dbRolesByUser.get(u.id) ?? []),
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
    size = 20,
    filters?: {
      q?: string;
      role?: string;
      status?: string;
      sortBy?: string;
      sortDir?: "asc" | "desc";
      excludeSelf?: boolean;
      excludeUserId?: string;
    }
  ): Promise<PageResponse<AdminUserItem>> {
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (filters?.q?.trim()) query.set("q", filters.q.trim());
    if (filters?.role && filters.role !== "ALL") query.set("role", filters.role);
    if (filters?.status && filters.status !== "ALL")
      query.set("status", filters.status);
    if (filters?.sortBy?.trim()) query.set("sortBy", filters.sortBy.trim());
    if (filters?.sortDir) query.set("sortDir", filters.sortDir);
    if (filters?.excludeSelf) query.set("excludeSelf", "true");

    try {
      const data = await gatewayFetch<
        PageResponse<AdminUserItem> | AdminUserItem[]
      >(`/admin/users?${query.toString()}`, {
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
        const needle = filters?.q?.trim().toLowerCase() || "";
        const filtered = fallback
          .filter((u) => !filters?.excludeUserId || u.id !== filters.excludeUserId)
          .filter(
            (u) =>
              !filters?.role || filters.role === "ALL" || u.role === filters.role
          )
          .filter(
            (u) =>
              !filters?.status ||
              filters.status === "ALL" ||
              u.status === filters.status
          )
          .filter(
            (u) =>
              !needle ||
              u.fullName.toLowerCase().includes(needle) ||
              u.email.toLowerCase().includes(needle)
          );
        const dir = filters?.sortDir === "asc" ? 1 : -1;
        const sortBy = filters?.sortBy || "createdAt";
        filtered.sort((a, b) => {
          const av = String((a as unknown as Record<string, unknown>)[sortBy] ?? "");
          const bv = String((b as unknown as Record<string, unknown>)[sortBy] ?? "");
          return av.localeCompare(bv) * dir;
        });
        const totalItems = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / size));
        const from = Math.min((page - 1) * size, totalItems);
        const items = filtered.slice(from, from + size);
        return {
          items,
          pagination: {
            page,
            size,
            totalItems,
            totalPages,
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
        description: s.description,
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
        description: p.description,
        sku: p.sku,
        brand: p.brand,
        productType: p.productType,
        warrantyMonths: p.warrantyMonths,
        returnWindowDays: p.returnWindowDays,
        imageUrl: p.imageUrl,
        availableQty: p.availableQty,
        reservedQty: p.reservedQty,
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
