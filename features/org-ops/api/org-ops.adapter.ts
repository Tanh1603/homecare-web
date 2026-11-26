import {
  extractPageItems,
  extractPaginationMeta,
  type PageResponse,
} from "@/shared/api/api-envelope";
import { gatewayFetch } from "@/shared/api/gateway-client";
import type { AddressSnapshotDto } from "@/features/org-ops/api/org-ops.http";

export interface OrgBookingItem {
  id: string;
  customerName: string;
  serviceName: string;
  technicianId?: string | null;
  technicianName: string | null;
  scheduledAt: string;
  createdAt?: string;
  address?: string;
  addressSnapshot?: AddressSnapshotDto | null;
  totalAmount: number;
  status: string;
  purpose?: "REPAIR" | "INSTALLATION" | string;
  productReady?: boolean;
  version?: number;
}

export interface OrgOrderLineItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  fulfillmentStatus: string;
}

export interface OrgOrderItem {
  id: string;
  buyerName: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  status: string;
  paymentStatus?: string;
  shippingAddress?: string;
  shippingAddressSnapshot?: AddressSnapshotDto | null;
  warrantyActivated: boolean;
  version?: number;
  lines: OrgOrderLineItem[];
}

export interface OrgTechnicianItem {
  id: string;
  profileId: string;
  fullName: string;
  phone: string;
  specialties: string[];
  specialty: string;
  experienceYears?: number;
  rating: number;
  activeAllocations?: number;
  status: string;
}

export interface OrgWarrantyItem {
  id: string;
  deviceOrPart: string;
  customerName: string;
  providerName?: string;
  coverageSummary?: string;
  notes?: string;
  startsOn?: string;
  expiresAt: string;
  status: string;
  source?: string;
  manufacturerRegistrationStatus?: string | null;
  triggerEvidenceRef?: string | null;
}

export interface OrgServiceCoverageArea {
  locationCode: string;
  level: "PROVINCE" | "WARD";
  active?: boolean;
}

export interface OrgServiceItem {
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
  status: string;
}

export interface OrgServiceRequestItem {
  id: string;
  requesterProfileId: string;
  requesterName?: string | null;
  requestType: "PAID_REPAIR" | "WARRANTY_CLAIM" | "MARKETPLACE" | string;
  serviceCategory: string;
  serviceOfferingId?: string | null;
  priceType: "FIXED" | "QUOTE_REQUIRED" | string;
  requiresOnsiteSurvey: boolean;
  inspectionFee: number;
  inspectionFeePolicy?: "NO_FEE" | "CREDIT_FULL" | "NON_CREDITABLE" | string | null;
  inspectionFeeWarningFlag?: boolean;
  fallbackCount?: number;
  deviceId?: string | null;
  warrantyId?: string | null;
  warrantyStatus?: string | null;
  assignedProviderId?: string | null;
  fallbackReason?: string | null;
  diagnosticBookingId?: string | null;
  repairBookingId?: string | null;
  acceptedQuotationId?: string | null;
  issueDescription?: string | null;
  preferredStart: string;
  address: string;
  formattedAddress?: string | null;
  status: string;
  createdAt: string;
}

export interface OrgProductItem {
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
  reservedQty: number;
  status: string;
}

export interface OrgReturnItem {
  id: string;
  orderId: string;
  orderLineId: string;
  productId: string;
  productName: string;
  buyerName: string;
  returnType: string;
  quantity: number;
  reason: string;
  status: string;
  resolutionNote?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  version?: number;
}

interface BackendBooking {
  id: string;
  requesterProfileId: string;
  requesterName?: string | null;
  serviceName: string;
  assignedTechnicianId?: string | null;
  assignedTechnicianName: string | null;
  preferredStart: string | null;
  createdAt: string;
  address: string;
  addressSnapshot?: AddressSnapshotDto | null;
  quotedPrice: number;
  status: string;
  version?: number;
}

interface BackendOrderLine {
  id?: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
  fulfillmentStatus: string;
}

interface BackendOrder {
  id: string;
  buyerProfileId: string;
  buyerName?: string | null;
  shippingAddress?: string;
  shippingAddressSnapshot?: AddressSnapshotDto | null;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  version?: number;
  lines?: BackendOrderLine[];
}

interface BackendTechnician {
  id: string;
  profileId: string;
  fullName: string;
  specialties?: string[];
  experienceYears: number;
  ratingAvg: number;
  activeAllocations: number;
  status: string;
}

interface BackendWarranty {
  id: string;
  ownerName?: string | null;
  providerName: string;
  source?: string;
  notes?: string;
  coverageSummary?: string;
  startsOn: string;
  endsOn: string;
  status: string;
  manufacturerRegistrationStatus?: string | null;
  triggerEvidenceRef?: string | null;
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

interface BackendOrderReturn {
  id: string;
  orderId: string;
  orderLineId: string;
  productId: string;
  productName: string;
  buyerProfileId: string;
  buyerName?: string | null;
  returnType: string;
  quantity: number;
  reason: string;
  status: string;
  resolutionNote?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  version?: number;
}

export function mapBooking(b: BackendBooking): OrgBookingItem {
  return {
    id: b.id,
    customerName: b.requesterName?.trim() || b.requesterProfileId,
    serviceName: b.serviceName,
    technicianId: b.assignedTechnicianId ?? null,
    technicianName: b.assignedTechnicianName ?? null,
    scheduledAt: b.preferredStart ?? b.createdAt,
    createdAt: b.createdAt,
    address: b.address,
    addressSnapshot: b.addressSnapshot ?? null,
    totalAmount: b.quotedPrice ?? 0,
    status: b.status,
    version: b.version,
  };
}

export function mapOrder(o: BackendOrder): OrgOrderItem {
  const rawLines = o.lines ?? [];
  const productName =
    rawLines.map((l) => l.productName).filter(Boolean).join(", ") ||
    "Đơn hàng linh kiện";
  const quantity = rawLines.reduce((sum, l) => sum + (l.quantity || 0), 0);
  const warrantyActivated =
    o.status === "DELIVERED" ||
    rawLines.some((l) => l.fulfillmentStatus === "DELIVERED");
  return {
    id: o.id,
    buyerName: o.buyerName?.trim() || o.buyerProfileId,
    productName,
    quantity,
    totalAmount: o.totalAmount ?? 0,
    status: o.status,
    paymentStatus: o.paymentStatus,
    shippingAddress: o.shippingAddress,
    shippingAddressSnapshot: o.shippingAddressSnapshot ?? null,
    warrantyActivated,
    version: o.version,
    lines: rawLines.map((l, idx) => ({
      id: l.id ?? String(idx),
      productId: l.productId ?? "",
      productName: l.productName,
      quantity: l.quantity,
      unitPrice: l.unitPrice ?? 0,
      lineTotal: l.lineTotal ?? 0,
      fulfillmentStatus: l.fulfillmentStatus,
    })),
  };
}

export const orgOpsApi = {
  async listBookings(organizationId: string): Promise<OrgBookingItem[]> {
    return (await this.listBookingsPage(organizationId, 1, 100)).items;
  },

  async listBookingsPage(
    organizationId: string,
    page = 1,
    size = 20
  ): Promise<PageResponse<OrgBookingItem>> {
    const data = await gatewayFetch<
      PageResponse<BackendBooking> | BackendBooking[]
    >(`/bookings?page=${page}&size=${size}`, { organizationId });
    return {
      items: extractPageItems(data).map(mapBooking),
      pagination: extractPaginationMeta(data, page, size),
    };
  },

  async listOrders(organizationId: string): Promise<OrgOrderItem[]> {
    return (await this.listOrdersPage(organizationId, 1, 100)).items;
  },

  async listOrdersPage(
    organizationId: string,
    page = 1,
    size = 20
  ): Promise<PageResponse<OrgOrderItem>> {
    const data = await gatewayFetch<
      PageResponse<BackendOrder> | BackendOrder[]
    >(
      `/orders?organizationId=${encodeURIComponent(organizationId)}&page=${page}&size=${size}`,
      { organizationId }
    );
    return {
      items: extractPageItems(data).map(mapOrder),
      pagination: extractPaginationMeta(data, page, size),
    };
  },

  async listTechnicians(organizationId: string): Promise<OrgTechnicianItem[]> {
    return (await this.listTechniciansPage(organizationId, 1, 100)).items;
  },

  async listTechniciansPage(
    organizationId: string,
    page = 1,
    size = 20,
    includeInactive = true
  ): Promise<PageResponse<OrgTechnicianItem>> {
    const isAll = !organizationId || organizationId === "all";
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (!isAll) query.set("providerId", organizationId);
    if (includeInactive) query.set("includeInactive", "true");
    const data = await gatewayFetch<
      PageResponse<BackendTechnician> | BackendTechnician[]
    >(
      `/technicians?${query.toString()}`,
      isAll ? { organizationId: null, scope: "personal" } : { organizationId }
    );
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

  async listWarranties(organizationId: string): Promise<OrgWarrantyItem[]> {
    return (await this.listWarrantiesPage(organizationId, 1, 100)).items;
  },

  async listWarrantiesPage(
    organizationId: string,
    page = 1,
    size = 20
  ): Promise<PageResponse<OrgWarrantyItem>> {
    const data = await gatewayFetch<
      PageResponse<BackendWarranty> | BackendWarranty[]
    >(
      `/warranties?organizationId=${encodeURIComponent(organizationId)}&page=${page}&size=${size}`,
      { organizationId }
    );
    return {
      items: extractPageItems(data).map((w) => ({
        id: w.id,
        deviceOrPart: w.notes || w.coverageSummary || w.providerName,
        customerName:
          w.ownerName?.trim() ||
          (w.source === "ORDER_AUTO_ACTIVATED"
            ? "Tự động từ đơn hàng"
            : w.source || "Thủ công"),
        providerName: w.providerName,
        coverageSummary: w.coverageSummary,
        notes: w.notes,
        startsOn: w.startsOn,
        expiresAt: w.endsOn,
        status: w.status,
        source: w.source,
        manufacturerRegistrationStatus: w.manufacturerRegistrationStatus,
        triggerEvidenceRef: w.triggerEvidenceRef,
      })),
      pagination: extractPaginationMeta(data, page, size),
    };
  },

  async listServicesPage(
    organizationId: string,
    page = 1,
    size = 20
  ): Promise<PageResponse<OrgServiceItem>> {
    const data = await gatewayFetch<
      PageResponse<BackendServiceOffering> | BackendServiceOffering[]
    >(
      `/services?providerId=${encodeURIComponent(organizationId)}&includeInactive=true&page=${page}&size=${size}`,
      { organizationId }
    );
    return {
      items: extractPageItems(data).map((s) => ({
        ...s,
        status: s.active ? "ACTIVE" : "INACTIVE",
      })),
      pagination: extractPaginationMeta(data, page, size),
    };
  },

  async listProductsPage(
    organizationId: string,
    page = 1,
    size = 20
  ): Promise<PageResponse<OrgProductItem>> {
    const data = await gatewayFetch<
      PageResponse<BackendProduct> | BackendProduct[]
    >(
      `/products?merchantId=${encodeURIComponent(organizationId)}&includeInactive=true&page=${page}&size=${size}`,
      { organizationId }
    );
    return {
      items: extractPageItems(data).map((p) => ({
        ...p,
        reservedQty: p.reservedQty ?? 0,
      })),
      pagination: extractPaginationMeta(data, page, size),
    };
  },

  async listReturnsPage(
    organizationId: string,
    page = 1,
    size = 20,
    status?: string
  ): Promise<PageResponse<OrgReturnItem>> {
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (status) query.set("status", status);
    const data = await gatewayFetch<
      PageResponse<BackendOrderReturn> | BackendOrderReturn[]
    >(`/merchant/returns?${query.toString()}`, { organizationId });
    return {
      items: extractPageItems(data).map((r) => ({
        id: r.id,
        orderId: r.orderId,
        orderLineId: r.orderLineId,
        productId: r.productId,
        productName: r.productName,
        buyerName: r.buyerName?.trim() || r.buyerProfileId,
        returnType: r.returnType,
        quantity: r.quantity,
        reason: r.reason,
        status: r.status,
        resolutionNote: r.resolutionNote,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
        version: r.version,
      })),
      pagination: extractPaginationMeta(data, page, size),
    };
  },
};
