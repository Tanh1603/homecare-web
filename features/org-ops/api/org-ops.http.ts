import {
  extractPageItems,
  unwrapApiResponse,
  type ApiResponse,
  type PageResponse,
} from "@/shared/api/api-envelope";
import type {
  OrgBookingItem,
  OrgOrderItem,
  OrgProductItem,
  OrgReturnItem,
  OrgServiceItem,
  OrgTechnicianItem,
  OrgWarrantyItem,
} from "./org-ops.adapter";

export interface ScheduleWindowItem {
  id: string;
  technicianId: string;
  startTime: string;
  endTime: string;
  available: boolean;
  version?: number;
}

export interface BookingWorkEvidenceDto {
  id: string;
  bookingId: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  signedUrl?: string | null;
}

export interface BookingWorkUpdateDto {
  id: string;
  bookingId: string;
  technicianProfileId: string;
  kind: string;
  note?: string | null;
  extraCost?: number | null;
  extraCostStatus?: string | null;
  evidence?: BookingWorkEvidenceDto[];
  createdAt: string;
}

export interface BookingDetailDto {
  id: string;
  requesterProfileId: string;
  requesterName?: string | null;
  serviceName: string;
  assignedTechnicianId?: string | null;
  assignedTechnicianName?: string | null;
  address: string;
  notes?: string | null;
  status: string;
  allocationStatus: string;
  quotedPrice: number;
  version?: number;
  workUpdates?: BookingWorkUpdateDto[];
}

function orgHeaders(organizationId: string, etag?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Organization-Id": organizationId,
  };
  if (etag) headers["If-Match"] = etag;
  return headers;
}

function formatVersionEtag(version?: number): string | undefined {
  return typeof version === "number" ? `"v${version}"` : undefined;
}

export const orgOpsHttpApi = {
  async getBooking(
    organizationId: string,
    bookingId: string
  ): Promise<BookingDetailDto> {
    const res = await fetch(
      `/api/gateway/bookings/${encodeURIComponent(bookingId)}`,
      {
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      }
    );
    const json = (await res.json()) as ApiResponse<BookingDetailDto>;
    return unwrapApiResponse(json);
  },

  async listActiveTechnicians(
    organizationId: string
  ): Promise<OrgTechnicianItem[]> {
    const res = await fetch(
      `/api/gateway/technicians?providerId=${encodeURIComponent(organizationId)}&size=100`,
      {
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      }
    );
    const json = (await res.json()) as ApiResponse<
      PageResponse<OrgTechnicianItem> | OrgTechnicianItem[]
    >;
    return extractPageItems(unwrapApiResponse(json));
  },

  async assignTechnician(
    organizationId: string,
    bookingId: string,
    input: { technicianId: string; reason?: string },
    version?: number
  ): Promise<BookingDetailDto> {
    const res = await fetch(
      `/api/gateway/bookings/${encodeURIComponent(bookingId)}/assign`,
      {
        method: "POST",
        headers: orgHeaders(organizationId, formatVersionEtag(version)),
        body: JSON.stringify({
          technicianId: input.technicianId,
          reason: input.reason?.trim() || undefined,
        }),
      }
    );
    const json = (await res.json()) as ApiResponse<BookingDetailDto>;
    return unwrapApiResponse(json);
  },

  async cancelBooking(
    organizationId: string,
    bookingId: string,
    version?: number,
    reason?: string
  ): Promise<OrgBookingItem> {
    const res = await fetch(
      `/api/gateway/bookings/${encodeURIComponent(bookingId)}/cancel`,
      {
        method: "POST",
        headers: orgHeaders(organizationId, formatVersionEtag(version)),
        body: JSON.stringify({ reason: reason?.trim() || "Hủy bởi đối tác" }),
      }
    );
    const json = (await res.json()) as ApiResponse<OrgBookingItem>;
    return unwrapApiResponse(json);
  },

  async getOrder(organizationId: string, orderId: string): Promise<OrgOrderItem> {
    const res = await fetch(
      `/api/gateway/orders/${encodeURIComponent(orderId)}`,
      {
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      }
    );
    const json = (await res.json()) as ApiResponse<OrgOrderItem>;
    return unwrapApiResponse(json);
  },

  async fulfillOrderLine(
    organizationId: string,
    orderId: string,
    lineId: string
  ): Promise<OrgOrderItem> {
    const res = await fetch(
      `/api/gateway/orders/${encodeURIComponent(orderId)}/lines/${encodeURIComponent(lineId)}/fulfillment`,
      {
        method: "POST",
        headers: orgHeaders(organizationId),
      }
    );
    const json = (await res.json()) as ApiResponse<OrgOrderItem>;
    return unwrapApiResponse(json);
  },

  async resolveOrderReturn(
    organizationId: string,
    orderId: string,
    returnId: string,
    input: { action: "APPROVE" | "REJECT"; resolutionNote?: string },
    version?: number
  ): Promise<OrgReturnItem> {
    const res = await fetch(
      `/api/gateway/orders/${encodeURIComponent(orderId)}/returns/${encodeURIComponent(returnId)}/resolve`,
      {
        method: "POST",
        headers: orgHeaders(organizationId, formatVersionEtag(version)),
        body: JSON.stringify({
          action: input.action,
          resolutionNote: input.resolutionNote?.trim() || undefined,
        }),
      }
    );
    const json = (await res.json()) as ApiResponse<OrgReturnItem>;
    return unwrapApiResponse(json);
  },

  async confirmManualRefund(
    organizationId: string,
    orderId: string,
    returnId: string,
    input: string | { reference: string; note?: string },
    version?: number
  ): Promise<OrgReturnItem> {
    const payload =
      typeof input === "string"
        ? { reference: input.trim() }
        : {
            reference: input.reference.trim(),
            note: input.note?.trim() || undefined,
          };
    const res = await fetch(
      `/api/gateway/orders/${encodeURIComponent(orderId)}/returns/${encodeURIComponent(returnId)}/confirm-manual-refund`,
      {
        method: "POST",
        headers: orgHeaders(organizationId, formatVersionEtag(version)),
        body: JSON.stringify(payload),
      }
    );
    const json = (await res.json()) as ApiResponse<OrgReturnItem>;
    return unwrapApiResponse(json);
  },

  async retryRefund(
    organizationId: string,
    orderId: string,
    returnId: string,
    version?: number
  ): Promise<OrgReturnItem> {
    const res = await fetch(
      `/api/gateway/orders/${encodeURIComponent(orderId)}/returns/${encodeURIComponent(returnId)}/retry-refund`,
      {
        method: "POST",
        headers: orgHeaders(organizationId, formatVersionEtag(version)),
      }
    );
    const json = (await res.json()) as ApiResponse<OrgReturnItem>;
    return unwrapApiResponse(json);
  },

  async createService(
    organizationId: string,
    input: {
      name: string;
      category: string;
      description?: string;
      basePrice: number;
      estimatedDurationMinutes: number;
      active: boolean;
    }
  ): Promise<OrgServiceItem> {
    const res = await fetch("/api/gateway/services", {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ ...input, providerId: organizationId }),
    });
    const json = (await res.json()) as ApiResponse<OrgServiceItem>;
    return unwrapApiResponse(json);
  },

  async updateService(
    organizationId: string,
    serviceId: string,
    input: {
      name?: string;
      category?: string;
      description?: string;
      basePrice?: number;
      estimatedDurationMinutes?: number;
      active?: boolean;
    }
  ): Promise<OrgServiceItem> {
    const res = await fetch(
      `/api/gateway/services/${encodeURIComponent(serviceId)}`,
      {
        method: "PATCH",
        headers: orgHeaders(organizationId),
        body: JSON.stringify(input),
      }
    );
    const json = (await res.json()) as ApiResponse<OrgServiceItem>;
    return unwrapApiResponse(json);
  },

  async deleteService(organizationId: string, serviceId: string): Promise<void> {
    const res = await fetch(
      `/api/gateway/services/${encodeURIComponent(serviceId)}`,
      {
        method: "DELETE",
        headers: { "X-Organization-Id": organizationId },
      }
    );
    if (res.status === 204) return;
    const json = (await res.json()) as ApiResponse<null>;
    unwrapApiResponse(json);
  },

  async createProduct(
    organizationId: string,
    input: {
      sku: string;
      name: string;
      category: string;
      brand?: string;
      unitPrice: number;
      warrantyMonths?: number;
      returnWindowDays?: number;
      description?: string;
      status: "ACTIVE" | "INACTIVE";
    }
  ): Promise<OrgProductItem> {
    const res = await fetch("/api/gateway/products", {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ ...input, merchantId: organizationId }),
    });
    const json = (await res.json()) as ApiResponse<OrgProductItem>;
    return unwrapApiResponse(json);
  },

  async updateProduct(
    organizationId: string,
    productId: string,
    input: Partial<{
      sku: string;
      name: string;
      category: string;
      brand: string;
      unitPrice: number;
      warrantyMonths: number;
      returnWindowDays: number;
      description: string;
      status: "ACTIVE" | "INACTIVE";
    }>
  ): Promise<OrgProductItem> {
    const res = await fetch(
      `/api/gateway/products/${encodeURIComponent(productId)}`,
      {
        method: "PATCH",
        headers: orgHeaders(organizationId),
        body: JSON.stringify(input),
      }
    );
    const json = (await res.json()) as ApiResponse<OrgProductItem>;
    return unwrapApiResponse(json);
  },

  async updateInventory(
    organizationId: string,
    productId: string,
    availableQty: number
  ): Promise<OrgProductItem> {
    const res = await fetch(
      `/api/gateway/products/${encodeURIComponent(productId)}/inventory`,
      {
        method: "PATCH",
        headers: orgHeaders(organizationId),
        body: JSON.stringify({ availableQty }),
      }
    );
    const json = (await res.json()) as ApiResponse<OrgProductItem>;
    return unwrapApiResponse(json);
  },

  async deleteProduct(organizationId: string, productId: string): Promise<void> {
    const res = await fetch(
      `/api/gateway/products/${encodeURIComponent(productId)}`,
      {
        method: "DELETE",
        headers: { "X-Organization-Id": organizationId },
      }
    );
    if (res.status === 204) return;
    const json = (await res.json()) as ApiResponse<null>;
    unwrapApiResponse(json);
  },

  async createTechnician(
    organizationId: string,
    input: {
      profileId: string;
      fullName: string;
      specialties: string[];
      experienceYears: number;
      status: "ACTIVE" | "INACTIVE";
    }
  ): Promise<OrgTechnicianItem> {
    const res = await fetch("/api/gateway/technicians", {
      method: "POST",
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ ...input, providerId: organizationId }),
    });
    const json = (await res.json()) as ApiResponse<OrgTechnicianItem>;
    return unwrapApiResponse(json);
  },

  async updateTechnician(
    organizationId: string,
    technicianId: string,
    input: Partial<{
      fullName: string;
      specialties: string[];
      experienceYears: number;
      status: "ACTIVE" | "INACTIVE";
    }>
  ): Promise<OrgTechnicianItem> {
    const res = await fetch(
      `/api/gateway/technicians/${encodeURIComponent(technicianId)}`,
      {
        method: "PATCH",
        headers: orgHeaders(organizationId),
        body: JSON.stringify(input),
      }
    );
    const json = (await res.json()) as ApiResponse<OrgTechnicianItem>;
    return unwrapApiResponse(json);
  },

  async deleteTechnician(
    organizationId: string,
    technicianId: string
  ): Promise<void> {
    const res = await fetch(
      `/api/gateway/technicians/${encodeURIComponent(technicianId)}`,
      {
        method: "DELETE",
        headers: { "X-Organization-Id": organizationId },
      }
    );
    if (res.status === 204) return;
    const json = (await res.json()) as ApiResponse<null>;
    unwrapApiResponse(json);
  },

  async listTechnicianSchedules(
    organizationId: string,
    technicianId: string
  ): Promise<ScheduleWindowItem[]> {
    const res = await fetch(
      `/api/gateway/technicians/${encodeURIComponent(technicianId)}/schedules?page=1&size=50`,
      {
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      }
    );
    const json = (await res.json()) as ApiResponse<
      PageResponse<ScheduleWindowItem> | ScheduleWindowItem[]
    >;
    return extractPageItems(unwrapApiResponse(json));
  },

  async createTechnicianSchedule(
    organizationId: string,
    technicianId: string,
    input: { startTime: string; endTime: string; available?: boolean }
  ): Promise<ScheduleWindowItem> {
    const res = await fetch(
      `/api/gateway/technicians/${encodeURIComponent(technicianId)}/schedules`,
      {
        method: "POST",
        headers: orgHeaders(organizationId),
        body: JSON.stringify({ ...input, available: input.available ?? true }),
      }
    );
    const json = (await res.json()) as ApiResponse<ScheduleWindowItem>;
    return unwrapApiResponse(json);
  },

  async deleteTechnicianSchedule(
    organizationId: string,
    technicianId: string,
    windowId: string,
    version?: number
  ): Promise<void> {
    const headers: Record<string, string> = {
      "X-Organization-Id": organizationId,
    };
    const etag = formatVersionEtag(version);
    if (etag) headers["If-Match"] = etag;
    const res = await fetch(
      `/api/gateway/technicians/${encodeURIComponent(technicianId)}/schedules/${encodeURIComponent(windowId)}`,
      { method: "DELETE", headers }
    );
    if (res.status === 204) return;
    const json = (await res.json()) as ApiResponse<null>;
    unwrapApiResponse(json);
  },

  async getWarranty(
    organizationId: string,
    warrantyId: string
  ): Promise<OrgWarrantyItem> {
    const res = await fetch(
      `/api/gateway/warranties/${encodeURIComponent(warrantyId)}`,
      {
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      }
    );
    const json = (await res.json()) as ApiResponse<OrgWarrantyItem>;
    return unwrapApiResponse(json);
  },
};
