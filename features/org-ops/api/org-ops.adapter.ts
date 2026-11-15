import {
  extractPageItems,
  type PageResponse,
} from "@/shared/api/api-envelope";
import { gatewayFetch } from "@/shared/api/gateway-client";

export interface OrgBookingItem {
  id: string;
  customerName: string;
  serviceName: string;
  technicianName: string | null;
  scheduledAt: string;
  address?: string;
  totalAmount: number;
  status: string;
}

export interface OrgOrderItem {
  id: string;
  buyerName: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  status: string;
  paymentStatus?: string;
  warrantyActivated: boolean;
}

export interface OrgTechnicianItem {
  id: string;
  fullName: string;
  phone: string;
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
  startsOn?: string;
  expiresAt: string;
  status: string;
}

interface BackendBooking {
  id: string;
  requesterProfileId: string;
  serviceName: string;
  assignedTechnicianName: string | null;
  preferredStart: string | null;
  createdAt: string;
  address: string;
  quotedPrice: number;
  status: string;
}

interface BackendOrderLine {
  productName: string;
  quantity: number;
  fulfillmentStatus: string;
}

interface BackendOrder {
  id: string;
  buyerProfileId: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
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
  providerName: string;
  source?: string;
  notes?: string;
  coverageSummary?: string;
  startsOn: string;
  endsOn: string;
  status: string;
}

export const orgOpsApi = {
  async listBookings(organizationId: string): Promise<OrgBookingItem[]> {
    try {
      const data = await gatewayFetch<PageResponse<BackendBooking> | BackendBooking[]>(
        "/bookings?size=100",
        { organizationId }
      );
      return extractPageItems(data).map((b) => ({
        id: b.id,
        customerName: b.requesterProfileId,
        serviceName: b.serviceName,
        technicianName: b.assignedTechnicianName ?? null,
        scheduledAt: b.preferredStart ?? b.createdAt,
        address: b.address,
        totalAmount: b.quotedPrice ?? 0,
        status: b.status,
      }));
    } catch {
      return [];
    }
  },

  async listOrders(organizationId: string): Promise<OrgOrderItem[]> {
    try {
      const data = await gatewayFetch<PageResponse<BackendOrder> | BackendOrder[]>(
        `/orders?organizationId=${encodeURIComponent(organizationId)}&size=100`,
        { organizationId }
      );
      return extractPageItems(data).map((o) => {
        const lines = o.lines ?? [];
        const productName =
          lines.map((l) => l.productName).filter(Boolean).join(", ") ||
          "Đơn hàng linh kiện";
        const quantity = lines.reduce((sum, l) => sum + (l.quantity || 0), 0);
        const warrantyActivated =
          o.status === "DELIVERED" ||
          lines.some((l) => l.fulfillmentStatus === "DELIVERED");
        return {
          id: o.id,
          buyerName: o.buyerProfileId,
          productName,
          quantity,
          totalAmount: o.totalAmount ?? 0,
          status: o.status,
          paymentStatus: o.paymentStatus,
          warrantyActivated,
        };
      });
    } catch {
      return [];
    }
  },

  async listTechnicians(
    organizationId: string
  ): Promise<OrgTechnicianItem[]> {
    try {
      const isAll = !organizationId || organizationId === "all";
      const path = isAll
        ? "/technicians?size=100"
        : `/technicians?providerId=${encodeURIComponent(organizationId)}&size=100`;
      const data = await gatewayFetch<
        PageResponse<BackendTechnician> | BackendTechnician[]
      >(path, isAll ? {} : { organizationId });
      return extractPageItems(data).map((t) => ({
        id: t.id,
        fullName: t.fullName,
        phone: t.profileId,
        specialty: t.specialties?.join(", ") || "Kỹ thuật đa năng",
        experienceYears: t.experienceYears,
        rating: t.ratingAvg ?? 0,
        activeAllocations: t.activeAllocations,
        status: t.status,
      }));
    } catch {
      return [];
    }
  },

  async listWarranties(organizationId: string): Promise<OrgWarrantyItem[]> {
    try {
      const data = await gatewayFetch<
        PageResponse<BackendWarranty> | BackendWarranty[]
      >(
        `/warranties?organizationId=${encodeURIComponent(organizationId)}&size=100`,
        { organizationId }
      );
      return extractPageItems(data).map((w) => ({
        id: w.id,
        deviceOrPart: w.notes || w.coverageSummary || w.providerName,
        customerName: w.source === "ORDER_AUTO" ? "Tự động từ đơn hàng" : w.source || "Thủ công",
        startsOn: w.startsOn,
        expiresAt: w.endsOn,
        status: w.status,
      }));
    } catch {
      return [];
    }
  },
};
