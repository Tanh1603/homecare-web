import { AxiosError, type AxiosRequestConfig } from "axios";
import {
  extractPageItems,
  GatewayApiError,
  unwrapApiResponse,
  type ApiResponse,
  type PageResponse,
} from "@/shared/api/api-envelope";
import {
  browserHttpClient,
  gatewayHeaders,
  requestGateway,
} from "@/shared/api/http-client";
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

async function requestScheduleGateway<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const res = await browserHttpClient.request<ApiResponse<T>>(config);
    if (res.status === 204 || res.data == null || (res.data as unknown) === "") {
      return undefined as T;
    }
    return unwrapScheduleResponse(res.data);
  } catch (err) {
    if (err instanceof GatewayApiError) {
      throw err;
    }
    if (err instanceof AxiosError) {
      const payload = err.response?.data as
        | ApiResponse<{ conflicts?: ScheduleConflictItem[] } | null>
        | undefined;
      if (payload && typeof payload === "object") {
        if (payload.code === 409 || payload.errorCode === "SCHEDULE_ALLOCATION_CONFLICT") {
          throw new ScheduleConflictError(payload);
        }
        if ("message" in payload) {
          throw new GatewayApiError({
            message: payload.message || `Gateway HTTP ${err.response?.status ?? 500}`,
            status: payload.code || err.response?.status || 500,
            errorCode: payload.errorCode,
            traceId: payload.traceId,
            fieldErrors: payload.errors,
          });
        }
      }
      throw new GatewayApiError({
        message: err.message || "Không thể kết nối tới HomeCare API Gateway",
        status: err.response?.status ?? 502,
        errorCode: err.response ? undefined : "GATEWAY_UNAVAILABLE",
      });
    }
    throw err;
  }
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

export interface CategoryQualificationItem {
  id: string;
  providerId: string;
  category: string;
  status: "UNVERIFIED" | "VERIFIED" | "REJECTED" | "REVOKED";
  evidenceRefs?: string | null;
  reason?: string | null;
  verifiedAt?: string | null;
}

export const orgOpsHttpApi = {
  async getBooking(
    organizationId: string,
    bookingId: string
  ): Promise<BookingDetailDto> {
    return requestGateway<BookingDetailDto>({
      url: `/bookings/${encodeURIComponent(bookingId)}`,
      method: "GET",
      headers: gatewayHeaders({ organizationId }),
    });
  },

  async listActiveTechnicians(
    organizationId: string
  ): Promise<OrgTechnicianItem[]> {
    const data = await requestGateway<PageResponse<OrgTechnicianItem> | OrgTechnicianItem[]>({
      url: `/technicians?providerId=${encodeURIComponent(organizationId)}&size=100`,
      method: "GET",
      headers: gatewayHeaders({ organizationId }),
    });
    return extractPageItems(data);
  },

  async assignTechnician(
    organizationId: string,
    bookingId: string,
    input: { technicianId: string; reason?: string },
    version?: number
  ): Promise<BookingDetailDto> {
    return requestGateway<BookingDetailDto>({
      url: `/bookings/${encodeURIComponent(bookingId)}/assign`,
      method: "POST",
      headers: gatewayHeaders({ organizationId, version }),
      data: {
        technicianId: input.technicianId,
        reason: input.reason?.trim() || undefined,
      },
    });
  },

  async cancelBooking(
    organizationId: string,
    bookingId: string,
    version?: number,
    reason?: string
  ): Promise<OrgBookingItem> {
    return requestGateway<OrgBookingItem>({
      url: `/bookings/${encodeURIComponent(bookingId)}/cancel`,
      method: "POST",
      headers: gatewayHeaders({ organizationId, version }),
      data: { reason: reason?.trim() || "Hủy bởi đối tác" },
    });
  },

  async getOrder(organizationId: string, orderId: string): Promise<OrgOrderItem> {
    return requestGateway<OrgOrderItem>({
      url: `/orders/${encodeURIComponent(orderId)}`,
      method: "GET",
      headers: gatewayHeaders({ organizationId }),
    });
  },

  async fulfillOrderLine(
    organizationId: string,
    orderId: string,
    lineId: string
  ): Promise<OrgOrderItem> {
    return requestGateway<OrgOrderItem>({
      url: `/orders/${encodeURIComponent(orderId)}/lines/${encodeURIComponent(lineId)}/fulfillment`,
      method: "POST",
      headers: gatewayHeaders({ organizationId }),
    });
  },

  async resolveOrderReturn(
    organizationId: string,
    orderId: string,
    returnId: string,
    input: { action: "APPROVE" | "REJECT"; resolutionNote?: string },
    version?: number
  ): Promise<OrgReturnItem> {
    return requestGateway<OrgReturnItem>({
      url: `/orders/${encodeURIComponent(orderId)}/returns/${encodeURIComponent(returnId)}/resolve`,
      method: "POST",
      headers: gatewayHeaders({ organizationId, version }),
      data: {
        action: input.action,
        resolutionNote: input.resolutionNote?.trim() || undefined,
      },
    });
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
    return requestGateway<OrgReturnItem>({
      url: `/orders/${encodeURIComponent(orderId)}/returns/${encodeURIComponent(returnId)}/confirm-manual-refund`,
      method: "POST",
      headers: gatewayHeaders({ organizationId, version }),
      data: payload,
    });
  },

  async retryRefund(
    organizationId: string,
    orderId: string,
    returnId: string,
    version?: number
  ): Promise<OrgReturnItem> {
    return requestGateway<OrgReturnItem>({
      url: `/orders/${encodeURIComponent(orderId)}/returns/${encodeURIComponent(returnId)}/retry-refund`,
      method: "POST",
      headers: gatewayHeaders({ organizationId, version }),
    });
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
    return requestGateway<OrgServiceItem>({
      url: "/services",
      method: "POST",
      headers: gatewayHeaders({ organizationId }),
      data: { ...input, providerId: organizationId },
    });
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
    return requestGateway<OrgServiceItem>({
      url: `/services/${encodeURIComponent(serviceId)}`,
      method: "PATCH",
      headers: gatewayHeaders({ organizationId }),
      data: input,
    });
  },

  async replaceServiceCoverage(
    organizationId: string,
    serviceId: string,
    areas: OrgServiceCoverageArea[]
  ): Promise<OrgServiceCoverageArea[]> {
    return requestGateway<OrgServiceCoverageArea[]>({
      url: `/services/${encodeURIComponent(serviceId)}/coverage`,
      method: "PUT",
      headers: gatewayHeaders({ organizationId }),
      data: { areas },
    });
  },

  async listServiceRequests(
    organizationId: string,
    page = 1,
    size = 50
  ): Promise<OrgServiceRequestItem[]> {
    const data = await requestGateway<
      PageResponse<OrgServiceRequestItem> | OrgServiceRequestItem[]
    >({
      url: `/service-requests?page=${page}&size=${size}`,
      method: "GET",
      headers: gatewayHeaders({ organizationId }),
    });
    return extractPageItems(data);
  },

  async acceptServiceRequest(
    organizationId: string,
    requestId: string,
    fixedPrice = 0
  ): Promise<OrgServiceRequestItem> {
    return requestGateway<OrgServiceRequestItem>({
      url: `/service-requests/${encodeURIComponent(requestId)}/provider-accept?fixedPrice=${fixedPrice}`,
      method: "POST",
      headers: gatewayHeaders({ organizationId }),
    });
  },

  async rejectServiceRequest(
    organizationId: string,
    requestId: string,
    reason: string
  ): Promise<OrgServiceRequestItem> {
    return requestGateway<OrgServiceRequestItem>({
      url: `/service-requests/${encodeURIComponent(requestId)}/provider-reject`,
      method: "POST",
      headers: gatewayHeaders({ organizationId }),
      data: { reason },
    });
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
    return requestGateway({
      url: `/service-requests/${encodeURIComponent(requestId)}/quotations`,
      method: "POST",
      headers: gatewayHeaders({ organizationId }),
      data: input,
    });
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
    return requestGateway({
      url: `/bookings/${encodeURIComponent(bookingId)}/revised-quotations`,
      method: "POST",
      headers: gatewayHeaders({ organizationId }),
      data: input,
    });
  },

  async deleteService(organizationId: string, serviceId: string): Promise<void> {
    await requestGateway<null>({
      url: `/services/${encodeURIComponent(serviceId)}`,
      method: "DELETE",
      headers: gatewayHeaders({ organizationId }),
    });
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
    return requestGateway<OrgProductItem>({
      url: "/products",
      method: "POST",
      headers: gatewayHeaders({ organizationId }),
      data: { ...input, merchantId: organizationId },
    });
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
    return requestGateway<OrgProductItem>({
      url: `/products/${encodeURIComponent(productId)}`,
      method: "PATCH",
      headers: gatewayHeaders({ organizationId }),
      data: input,
    });
  },

  async updateInventory(
    organizationId: string,
    productId: string,
    availableQty: number
  ): Promise<OrgProductItem> {
    return requestGateway<OrgProductItem>({
      url: `/products/${encodeURIComponent(productId)}/inventory`,
      method: "PATCH",
      headers: gatewayHeaders({ organizationId }),
      data: { availableQty },
    });
  },

  async deleteProduct(organizationId: string, productId: string): Promise<void> {
    await requestGateway<null>({
      url: `/products/${encodeURIComponent(productId)}`,
      method: "DELETE",
      headers: gatewayHeaders({ organizationId }),
    });
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
    return requestGateway<OrgTechnicianItem>({
      url: "/technicians",
      method: "POST",
      headers: gatewayHeaders({ organizationId }),
      data: { ...input, providerId: organizationId },
    });
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
    return requestGateway<OrgTechnicianItem>({
      url: `/technicians/${encodeURIComponent(technicianId)}`,
      method: "PATCH",
      headers: gatewayHeaders({ organizationId }),
      data: input,
    });
  },

  async deleteTechnician(
    organizationId: string,
    technicianId: string
  ): Promise<void> {
    await requestGateway<null>({
      url: `/technicians/${encodeURIComponent(technicianId)}`,
      method: "DELETE",
      headers: gatewayHeaders({ organizationId }),
    });
  },

  async listTechnicianSchedules(
    organizationId: string,
    technicianId: string
  ): Promise<ScheduleWindowItem[]> {
    const data = await requestGateway<
      PageResponse<ScheduleWindowItem> | ScheduleWindowItem[]
    >({
      url: `/technicians/${encodeURIComponent(technicianId)}/schedules?page=1&size=50`,
      method: "GET",
      headers: gatewayHeaders({ organizationId }),
    });
    return extractPageItems(data);
  },

  async createTechnicianSchedule(
    organizationId: string,
    technicianId: string,
    input: { startsAt: string; endsAt: string }
  ): Promise<ScheduleWindowItem> {
    return requestGateway<ScheduleWindowItem>({
      url: `/technicians/${encodeURIComponent(technicianId)}/schedules`,
      method: "POST",
      headers: gatewayHeaders({ organizationId }),
      data: {
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      },
    });
  },

  async deleteTechnicianSchedule(
    organizationId: string,
    technicianId: string,
    windowId: string,
    version?: number
  ): Promise<void> {
    await requestScheduleGateway<null>({
      url: `/technicians/${encodeURIComponent(technicianId)}/schedules/${encodeURIComponent(windowId)}`,
      method: "DELETE",
      headers: gatewayHeaders({ organizationId, version }),
    });
  },

  async getTechnicianWeeklySchedule(
    organizationId: string,
    technicianId: string
  ): Promise<WeeklyScheduleOverview> {
    return requestScheduleGateway<WeeklyScheduleOverview>({
      url: `/technicians/${encodeURIComponent(technicianId)}/weekly-schedules`,
      method: "GET",
      headers: gatewayHeaders({ organizationId }),
    });
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
    return requestScheduleGateway<WeeklyScheduleOverview>({
      url: `/technicians/${encodeURIComponent(technicianId)}/weekly-schedules`,
      method: "PUT",
      headers: gatewayHeaders({ organizationId, version }),
      data: {
        timezone: input.timezone || "Asia/Ho_Chi_Minh",
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil || null,
        intervals: input.intervals,
      },
    });
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
    await requestScheduleGateway<null>({
      url: `/technicians/${encodeURIComponent(technicianId)}/weekly-schedules${query}`,
      method: "DELETE",
      headers: gatewayHeaders({ organizationId, version }),
    });
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
    return requestScheduleGateway<ScheduleExceptionItem[]>({
      url: `/technicians/${encodeURIComponent(technicianId)}/schedule-exceptions${qs}`,
      method: "GET",
      headers: gatewayHeaders({ organizationId }),
    });
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
    return requestScheduleGateway<ScheduleExceptionItem[]>({
      url: `/technicians/${encodeURIComponent(technicianId)}/schedule-exceptions`,
      method: "PUT",
      headers: gatewayHeaders({ organizationId }),
      data: {
        fromDate: input.fromDate,
        toDate: input.toDate || input.fromDate,
        exceptionType: input.exceptionType,
        reason: input.reason?.trim() || undefined,
        intervals: input.intervals ?? [],
      },
    });
  },

  async deleteTechnicianScheduleException(
    organizationId: string,
    technicianId: string,
    exceptionId: string,
    version?: number
  ): Promise<void> {
    await requestScheduleGateway<null>({
      url: `/technicians/${encodeURIComponent(technicianId)}/schedule-exceptions/${encodeURIComponent(exceptionId)}`,
      method: "DELETE",
      headers: gatewayHeaders({ organizationId, version }),
    });
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
    return requestScheduleGateway<OrganizationCalendarResponse>({
      url: `/organizations/${encodeURIComponent(organizationId)}/technicians/calendar?${qs.toString()}`,
      method: "GET",
      headers: gatewayHeaders({ organizationId }),
    });
  },

  async listTechnicianScheduleAudits(
    organizationId: string,
    technicianId: string
  ): Promise<ScheduleAuditItem[]> {
    return requestScheduleGateway<ScheduleAuditItem[]>({
      url: `/technicians/${encodeURIComponent(technicianId)}/schedule-audits`,
      method: "GET",
      headers: gatewayHeaders({ organizationId }),
    });
  },

  async listOrganizationScheduleRequests(
    organizationId: string,
    status?: string
  ): Promise<ScheduleChangeRequestItem[]> {
    const qs =
      status && status !== "ALL" ? `?status=${encodeURIComponent(status)}` : "";
    return requestScheduleGateway<ScheduleChangeRequestItem[]>({
      url: `/organizations/${encodeURIComponent(organizationId)}/technicians/schedule-requests${qs}`,
      method: "GET",
      headers: gatewayHeaders({ organizationId }),
    });
  },

  async reviewOrganizationScheduleRequest(
    organizationId: string,
    requestId: string,
    input: { approve: boolean; reviewNote?: string }
  ): Promise<ScheduleChangeRequestItem> {
    return requestScheduleGateway<ScheduleChangeRequestItem>({
      url: `/organizations/${encodeURIComponent(organizationId)}/technicians/schedule-requests/${encodeURIComponent(requestId)}/review`,
      method: "POST",
      headers: gatewayHeaders({ organizationId }),
      data: {
        approve: input.approve,
        reviewNote: input.reviewNote?.trim() || undefined,
      },
    });
  },

  async getWarranty(
    organizationId: string,
    warrantyId: string
  ): Promise<OrgWarrantyItem> {
    return requestGateway<OrgWarrantyItem>({
      url: `/warranties/${encodeURIComponent(warrantyId)}`,
      method: "GET",
      headers: gatewayHeaders({ organizationId }),
    });
  },

  async listCurrentQualifications(
    organizationId: string
  ): Promise<CategoryQualificationItem[]> {
    return requestGateway<CategoryQualificationItem[]>({
      url: "/providers/current/qualifications",
      method: "GET",
      headers: gatewayHeaders({ organizationId }),
    });
  },

  async upsertCurrentQualification(
    organizationId: string,
    category: string,
    evidenceRefs: string
  ): Promise<CategoryQualificationItem> {
    return requestGateway<CategoryQualificationItem>({
      url: `/providers/current/qualifications/${encodeURIComponent(category)}`,
      method: "POST",
      headers: gatewayHeaders({ organizationId }),
      data: { evidenceRefs: evidenceRefs.trim() },
    });
  },

  async deleteCurrentQualification(
    organizationId: string,
    category: string
  ): Promise<void> {
    await requestGateway<null>({
      url: `/providers/current/qualifications/${encodeURIComponent(category)}`,
      method: "DELETE",
      headers: gatewayHeaders({ organizationId }),
    });
  },

  async deleteOrganizationEvidence(
    organizationId: string,
    objectKey: string
  ): Promise<void> {
    await requestGateway<null>({
      url: `/organizations/${encodeURIComponent(organizationId)}/evidence?objectKey=${encodeURIComponent(objectKey)}`,
      method: "DELETE",
      headers: gatewayHeaders({ personal: true }),
    });
  },
};
