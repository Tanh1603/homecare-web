import {
  extractPageItems,
  GatewayApiError,
  unwrapApiResponse,
  type ApiResponse,
  type PageResponse,
} from "@/shared/api/api-envelope";
import type {
  OrgBookingItem,
  OrgOrderItem,
  OrgProductItem,
  OrgReturnItem,
  OrgServiceCoverageArea,
  OrgServiceItem,
  OrgServiceRequestItem,
  OrgTechnicianItem,
  OrgWarrantyItem,
} from "./org-ops.adapter";

export interface ScheduleWindowItem {
  id: string;
  technicianId: string;
  startsAt: string;
  endsAt: string;
  status: "AVAILABLE" | "BOOKED" | "BLOCKED" | "UNAVAILABLE" | string;
  allocatedBookingId?: string | null;
  version?: number;
  source?: "MANUAL" | "RECURRING" | string;
}

export type WeeklyDayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface WeeklyDayInterval {
  dayOfWeek: WeeklyDayOfWeek;
  startTime: string;
  endTime: string;
}

export interface LocalTimeInterval {
  startTime: string;
  endTime: string;
}

export interface WeeklyScheduleRuleDto {
  id: string;
  timezone: string;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  version: number;
  intervals: WeeklyDayInterval[];
}

export interface WeeklyScheduleOverview {
  technicianId: string;
  horizonDays: number;
  currentRule: WeeklyScheduleRuleDto | null;
  upcomingRules: WeeklyScheduleRuleDto[];
}

export type ScheduleExceptionType =
  | "UNAVAILABLE"
  | "CUSTOM_HOURS"
  | "EXTRA_HOURS";

export interface ScheduleExceptionItem {
  id: string;
  technicianId: string;
  localDate: string;
  exceptionType: ScheduleExceptionType;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
  version?: number;
}

export interface ScheduleConflictItem {
  windowId: string;
  bookingId?: string | null;
  startsAt: string;
  endsAt: string;
}

export interface CalendarSlotItem {
  windowId?: string | null;
  startsAt: string;
  endsAt: string;
  localStartTime: string;
  localEndTime: string;
  status: "AVAILABLE" | "BOOKED" | "BLOCKED" | "UNAVAILABLE" | string;
  source: "MANUAL" | "RECURRING" | string;
  allocatedBookingId?: string | null;
  version?: number | null;
  projected: boolean;
}

export interface CalendarDayItem {
  date: string;
  dayOfWeek: WeeklyDayOfWeek;
  dayStatus: "WORKING" | "BOOKED" | "OFF" | "UNSCHEDULED";
  projected: boolean;
  bookingCount: number;
  exceptionType?: ScheduleExceptionType | null;
  exceptionReason?: string | null;
  slots: CalendarSlotItem[];
}

export interface TechnicianCalendarRow {
  technicianId: string;
  profileId: string;
  fullName: string;
  status: string;
  isOnline: boolean;
  specialties: string[];
  timezone: string;
  days: CalendarDayItem[];
}

export interface OrganizationCalendarResponse {
  organizationId: string;
  from: string;
  to: string;
  timezone: string;
  horizonDays: number;
  technicians: TechnicianCalendarRow[];
}

export interface ScheduleAuditItem {
  id: string;
  technicianId: string;
  actorId: string;
  action: string;
  scope?: string | null;
  affectedFrom?: string | null;
  affectedTo?: string | null;
  detailsJson?: string | null;
  createdAt: string;
}

export type ScheduleChangeRequestType = "LEAVE" | "SHIFT_CHANGE" | "EXTRA_HOURS";
export type ScheduleChangeRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface ScheduleChangeRequestItem {
  id: string;
  technicianId: string;
  technicianName: string;
  organizationId: string;
  requestType: ScheduleChangeRequestType;
  fromDate: string;
  toDate: string;
  requestedStartTime?: string | null;
  requestedEndTime?: string | null;
  reason?: string | null;
  status: ScheduleChangeRequestStatus;
  reviewedBy?: string | null;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  version?: number;
  createdAt: string;
}

export class ScheduleConflictError extends GatewayApiError {
  readonly conflicts: ScheduleConflictItem[];

  constructor(
    payload: ApiResponse<{ conflicts?: ScheduleConflictItem[] } | null>
  ) {
    super({
      message: payload.message || "Xung đột với booking đã phân bổ",
      status: payload.code || 409,
      errorCode: payload.errorCode,
      traceId: payload.traceId,
      fieldErrors: payload.errors,
    });
    this.name = "ScheduleConflictError";
    this.conflicts = Array.isArray(payload.data?.conflicts)
      ? payload.data.conflicts
      : [];
  }
}

function unwrapScheduleResponse<T>(payload: ApiResponse<T>): T {
  if (
    !payload.success &&
    (payload.code === 409 || payload.errorCode === "SCHEDULE_ALLOCATION_CONFLICT")
  ) {
    throw new ScheduleConflictError(
      payload as unknown as ApiResponse<{ conflicts?: ScheduleConflictItem[] } | null>
    );
  }
  return unwrapApiResponse(payload);
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

export interface AddressSnapshotDto {
  addressId?: string | null;
  recipientName?: string | null;
  phoneNumber?: string | null;
  addressLine?: string | null;
  wardCode?: string | null;
  wardName?: string | null;
  provinceCode?: string | null;
  provinceName?: string | null;
  formattedAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface BookingDetailDto {
  id: string;
  requesterProfileId: string;
  requesterName?: string | null;
  serviceName: string;
  assignedTechnicianId?: string | null;
  assignedTechnicianName?: string | null;
  address: string;
  addressSnapshot?: AddressSnapshotDto | null;
  notes?: string | null;
  status: string;
  allocationStatus: string;
  quotedPrice: number;
  preferredStart?: string | null;
  createdAt?: string;
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
      priceType?: "FIXED" | "QUOTE_REQUIRED";
      inspectionFee?: number | null;
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

  async replaceServiceCoverage(
    organizationId: string,
    serviceId: string,
    areas: OrgServiceCoverageArea[]
  ): Promise<OrgServiceCoverageArea[]> {
    const res = await fetch(
      `/api/gateway/services/${encodeURIComponent(serviceId)}/coverage`,
      {
        method: "PUT",
        headers: orgHeaders(organizationId),
        body: JSON.stringify({ areas }),
      }
    );
    const json = (await res.json()) as ApiResponse<OrgServiceCoverageArea[]>;
    return unwrapApiResponse(json);
  },

  async listServiceRequests(
    organizationId: string,
    page = 1,
    size = 50
  ): Promise<OrgServiceRequestItem[]> {
    const res = await fetch(
      `/api/gateway/service-requests?page=${page}&size=${size}`,
      {
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      }
    );
    const json = (await res.json()) as ApiResponse<
      PageResponse<OrgServiceRequestItem> | OrgServiceRequestItem[]
    >;
    return extractPageItems(unwrapApiResponse(json));
  },

  async acceptServiceRequest(
    organizationId: string,
    requestId: string,
    fixedPrice = 0
  ): Promise<OrgServiceRequestItem> {
    const res = await fetch(
      `/api/gateway/service-requests/${encodeURIComponent(requestId)}/provider-accept?fixedPrice=${fixedPrice}`,
      {
        method: "POST",
        headers: orgHeaders(organizationId),
      }
    );
    const json = (await res.json()) as ApiResponse<OrgServiceRequestItem>;
    return unwrapApiResponse(json);
  },

  async rejectServiceRequest(
    organizationId: string,
    requestId: string,
    reason: string
  ): Promise<OrgServiceRequestItem> {
    const res = await fetch(
      `/api/gateway/service-requests/${encodeURIComponent(requestId)}/provider-reject`,
      {
        method: "POST",
        headers: orgHeaders(organizationId),
        body: JSON.stringify({ reason }),
      }
    );
    const json = (await res.json()) as ApiResponse<OrgServiceRequestItem>;
    return unwrapApiResponse(json);
  },

  async issueQuotation(
    organizationId: string,
    requestId: string,
    input: {
      items: {
        type: "LABOR" | "MATERIAL" | "OTHER";
        description: string;
        quantity: number;
        unitPrice: number;
      }[];
      validUntil?: string;
      applyInspectionFeeCredit?: boolean;
      supersedeReason?: string;
    }
  ): Promise<{
    id: string;
    serviceRequestId?: string | null;
    bookingId?: string | null;
    quoteKind?: "INITIAL" | "REVISED" | string;
    version: number;
    itemsTotal: number;
    inspectionFeePaid: number;
    inspectionFeeCredit: number;
    totalDueAfterCredit: number;
    supersedeReason?: string | null;
    status: string;
  }> {
    const res = await fetch(
      `/api/gateway/service-requests/${encodeURIComponent(requestId)}/quotations`,
      {
        method: "POST",
        headers: orgHeaders(organizationId),
        body: JSON.stringify(input),
      }
    );
    const json = (await res.json()) as ApiResponse<{
      id: string;
      serviceRequestId?: string | null;
      bookingId?: string | null;
      quoteKind?: "INITIAL" | "REVISED" | string;
      version: number;
      itemsTotal: number;
      inspectionFeePaid: number;
      inspectionFeeCredit: number;
      totalDueAfterCredit: number;
      supersedeReason?: string | null;
      status: string;
    }>;
    return unwrapApiResponse(json);
  },

  async issueRevisedQuotation(
    organizationId: string,
    bookingId: string,
    input: {
      items: {
        type: "LABOR" | "MATERIAL" | "OTHER";
        description: string;
        quantity: number;
        unitPrice: number;
      }[];
      revisionReason: string;
      validUntil?: string;
    }
  ): Promise<{
    id: string;
    bookingId?: string | null;
    quoteKind?: string;
    version: number;
    itemsTotal: number;
    totalDueAfterCredit: number;
    status: string;
  }> {
    const res = await fetch(
      `/api/gateway/bookings/${encodeURIComponent(bookingId)}/revised-quotations`,
      {
        method: "POST",
        headers: orgHeaders(organizationId),
        body: JSON.stringify(input),
      }
    );
    const json = (await res.json()) as ApiResponse<{
      id: string;
      bookingId?: string | null;
      quoteKind?: string;
      version: number;
      itemsTotal: number;
      totalDueAfterCredit: number;
      status: string;
    }>;
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
      productType?: string;
      unitPrice: number;
      warrantyMonths?: number;
      returnWindowDays?: number;
      description?: string;
      imageUrl?: string;
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
      productType: string;
      unitPrice: number;
      warrantyMonths: number;
      returnWindowDays: number;
      description: string;
      imageUrl: string;
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
    input: { startsAt: string; endsAt: string }
  ): Promise<ScheduleWindowItem> {
    const res = await fetch(
      `/api/gateway/technicians/${encodeURIComponent(technicianId)}/schedules`,
      {
        method: "POST",
        headers: orgHeaders(organizationId),
        body: JSON.stringify({
          startsAt: input.startsAt,
          endsAt: input.endsAt,
        }),
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
    unwrapScheduleResponse(json);
  },

  async getTechnicianWeeklySchedule(
    organizationId: string,
    technicianId: string
  ): Promise<WeeklyScheduleOverview> {
    const res = await fetch(
      `/api/gateway/technicians/${encodeURIComponent(technicianId)}/weekly-schedules`,
      {
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      }
    );
    const json = (await res.json()) as ApiResponse<WeeklyScheduleOverview>;
    return unwrapScheduleResponse(json);
  },

  async upsertTechnicianWeeklySchedule(
    organizationId: string,
    technicianId: string,
    input: {
      timezone?: string;
      effectiveFrom: string;
      effectiveUntil?: string | null;
      intervals: WeeklyDayInterval[];
    },
    version?: number
  ): Promise<WeeklyScheduleOverview> {
    const res = await fetch(
      `/api/gateway/technicians/${encodeURIComponent(technicianId)}/weekly-schedules`,
      {
        method: "PUT",
        headers: orgHeaders(organizationId, formatVersionEtag(version)),
        body: JSON.stringify({
          timezone: input.timezone || "Asia/Ho_Chi_Minh",
          effectiveFrom: input.effectiveFrom,
          effectiveUntil: input.effectiveUntil || null,
          intervals: input.intervals,
        }),
      }
    );
    const json = (await res.json()) as ApiResponse<WeeklyScheduleOverview>;
    return unwrapScheduleResponse(json);
  },

  async endTechnicianWeeklySchedule(
    organizationId: string,
    technicianId: string,
    effectiveUntil?: string,
    version?: number
  ): Promise<void> {
    const query = effectiveUntil
      ? `?effectiveUntil=${encodeURIComponent(effectiveUntil)}`
      : "";
    const headers: Record<string, string> = {
      "X-Organization-Id": organizationId,
    };
    const etag = formatVersionEtag(version);
    if (etag) headers["If-Match"] = etag;
    const res = await fetch(
      `/api/gateway/technicians/${encodeURIComponent(technicianId)}/weekly-schedules${query}`,
      { method: "DELETE", headers }
    );
    if (res.status === 204) return;
    const json = (await res.json()) as ApiResponse<null>;
    unwrapScheduleResponse(json);
  },

  async listTechnicianScheduleExceptions(
    organizationId: string,
    technicianId: string,
    from?: string,
    to?: string
  ): Promise<ScheduleExceptionItem[]> {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(
      `/api/gateway/technicians/${encodeURIComponent(technicianId)}/schedule-exceptions${qs}`,
      {
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      }
    );
    const json = (await res.json()) as ApiResponse<ScheduleExceptionItem[]>;
    return unwrapScheduleResponse(json);
  },

  async upsertTechnicianScheduleExceptions(
    organizationId: string,
    technicianId: string,
    input: {
      fromDate: string;
      toDate?: string;
      exceptionType: ScheduleExceptionType;
      reason?: string;
      intervals?: LocalTimeInterval[];
    }
  ): Promise<ScheduleExceptionItem[]> {
    const res = await fetch(
      `/api/gateway/technicians/${encodeURIComponent(technicianId)}/schedule-exceptions`,
      {
        method: "PUT",
        headers: orgHeaders(organizationId),
        body: JSON.stringify({
          fromDate: input.fromDate,
          toDate: input.toDate || input.fromDate,
          exceptionType: input.exceptionType,
          reason: input.reason?.trim() || undefined,
          intervals: input.intervals ?? [],
        }),
      }
    );
    const json = (await res.json()) as ApiResponse<ScheduleExceptionItem[]>;
    return unwrapScheduleResponse(json);
  },

  async deleteTechnicianScheduleException(
    organizationId: string,
    technicianId: string,
    exceptionId: string,
    version?: number
  ): Promise<void> {
    const headers: Record<string, string> = {
      "X-Organization-Id": organizationId,
    };
    const etag = formatVersionEtag(version);
    if (etag) headers["If-Match"] = etag;
    const res = await fetch(
      `/api/gateway/technicians/${encodeURIComponent(technicianId)}/schedule-exceptions/${encodeURIComponent(exceptionId)}`,
      {
        method: "DELETE",
        headers,
      }
    );
    if (res.status === 204) return;
    const json = (await res.json()) as ApiResponse<null>;
    unwrapScheduleResponse(json);
  },

  async getOrganizationCalendar(
    organizationId: string,
    params: {
      from: string;
      to: string;
      technicianId?: string;
      keyword?: string;
      status?: string;
    }
  ): Promise<OrganizationCalendarResponse> {
    const qs = new URLSearchParams();
    qs.set("from", params.from);
    qs.set("to", params.to);
    if (params.technicianId) qs.set("technicianId", params.technicianId);
    if (params.keyword?.trim()) qs.set("keyword", params.keyword.trim());
    if (params.status && params.status !== "ALL") qs.set("status", params.status);
    const res = await fetch(
      `/api/gateway/organizations/${encodeURIComponent(organizationId)}/technicians/calendar?${qs.toString()}`,
      {
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      }
    );
    const json = (await res.json()) as ApiResponse<OrganizationCalendarResponse>;
    return unwrapScheduleResponse(json);
  },

  async listTechnicianScheduleAudits(
    organizationId: string,
    technicianId: string
  ): Promise<ScheduleAuditItem[]> {
    const res = await fetch(
      `/api/gateway/technicians/${encodeURIComponent(technicianId)}/schedule-audits`,
      {
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      }
    );
    const json = (await res.json()) as ApiResponse<ScheduleAuditItem[]>;
    return unwrapScheduleResponse(json);
  },

  async listOrganizationScheduleRequests(
    organizationId: string,
    status?: string
  ): Promise<ScheduleChangeRequestItem[]> {
    const qs =
      status && status !== "ALL" ? `?status=${encodeURIComponent(status)}` : "";
    const res = await fetch(
      `/api/gateway/organizations/${encodeURIComponent(organizationId)}/technicians/schedule-requests${qs}`,
      {
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      }
    );
    const json = (await res.json()) as ApiResponse<ScheduleChangeRequestItem[]>;
    return unwrapScheduleResponse(json);
  },

  async reviewOrganizationScheduleRequest(
    organizationId: string,
    requestId: string,
    input: { approve: boolean; reviewNote?: string }
  ): Promise<ScheduleChangeRequestItem> {
    const res = await fetch(
      `/api/gateway/organizations/${encodeURIComponent(organizationId)}/technicians/schedule-requests/${encodeURIComponent(requestId)}/review`,
      {
        method: "POST",
        headers: orgHeaders(organizationId),
        body: JSON.stringify({
          approve: input.approve,
          reviewNote: input.reviewNote?.trim() || undefined,
        }),
      }
    );
    const json = (await res.json()) as ApiResponse<ScheduleChangeRequestItem>;
    return unwrapScheduleResponse(json);
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
