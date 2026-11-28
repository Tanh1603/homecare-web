import { extractPageItems, type PageResponse } from "@/shared/api/api-envelope";
import { gatewayHeaders, requestGateway } from "@/shared/api/http-client";

export interface DisputeEvidenceItem {
  id: string;
  disputeId: string;
  uploadedByProfileId: string;
  uploaderRole: "CUSTOMER" | "PROVIDER" | "ADMIN" | string;
  workEvidenceId?: string | null;
  contentType: string;
  sizeBytes: number;
  note?: string | null;
  signedUrl?: string | null;
  createdAt: string;
}

export interface DisputeItem {
  id: string;
  bookingId: string;
  openedByProfileId: string;
  providerId: string;
  openedStage: "PRE_ACCEPTANCE" | "POST_ACCEPTANCE" | string;
  category: string;
  description: string;
  status: string;
  providerResponse?: string | null;
  providerRespondedAt?: string | null;
  providerNoResponse: boolean;
  slaDueAt?: string | null;
  slaReminderStage: number;
  resolutionProposal?: string | null;
  resolutionOutcome?: string | null;
  resolvedByAdminId?: string | null;
  resolutionNote?: string | null;
  version?: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  evidence: DisputeEvidenceItem[];
}

export interface AdminNotificationFailedBooking {
  bookingId: string;
  providerId: string;
  requesterProfileId: string;
  serviceName: string;
  completionSubmittedAt?: string | null;
  notificationFailedAt?: string | null;
  notificationRetryCount: number;
  lastNotificationRetryAt?: string | null;
  adminReviewReason?: string | null;
  version?: number;
}

export interface AdminNotificationFailedBookingDetail extends AdminNotificationFailedBooking {
  status: string;
  completionSummary?: string | null;
  workEvidenceCount: number;
}

export const disputesHttpApi = {
  async adminListDisputes(status?: string, page = 1, size = 30): Promise<DisputeItem[]> {
    const params: Record<string, string> = { page: String(page), size: String(size) };
    if (status && status !== "ALL") params.status = status;
    const data = await requestGateway<PageResponse<DisputeItem> | DisputeItem[]>({
      method: "GET",
      url: "/admin/disputes",
      params,
      headers: gatewayHeaders({ personal: true }),
    });
    return extractPageItems(data);
  },

  async adminRequestProviderResponse(
    disputeId: string,
    version?: number,
    note?: string
  ): Promise<DisputeItem> {
    return requestGateway<DisputeItem>({
      method: "POST",
      url: `/admin/disputes/${encodeURIComponent(disputeId)}/request-provider-response`,
      headers: gatewayHeaders({ personal: true, version }),
      data: { note: note?.trim() || undefined },
    });
  },

  async adminRequestCustomerEvidence(
    disputeId: string,
    version?: number,
    note?: string
  ): Promise<DisputeItem> {
    return requestGateway<DisputeItem>({
      method: "POST",
      url: `/admin/disputes/${encodeURIComponent(disputeId)}/request-customer-evidence`,
      headers: gatewayHeaders({ personal: true, version }),
      data: { note: note?.trim() || undefined },
    });
  },

  async adminProposeResolution(
    disputeId: string,
    input: { proposal: string; outcome: string },
    version?: number
  ): Promise<DisputeItem> {
    return requestGateway<DisputeItem>({
      method: "POST",
      url: `/admin/disputes/${encodeURIComponent(disputeId)}/propose-resolution`,
      headers: gatewayHeaders({ personal: true, version }),
      data: {
        proposal: input.proposal.trim(),
        outcome: input.outcome,
      },
    });
  },

  async adminResolveDispute(
    disputeId: string,
    input: {
      outcome: "RESOLVED" | "ESCALATED" | "CLOSED";
      bookingAction?: "ACCEPT" | "REWORK" | "CLOSE_UNRESOLVED";
      note: string;
    },
    version?: number
  ): Promise<DisputeItem> {
    return requestGateway<DisputeItem>({
      method: "POST",
      url: `/admin/disputes/${encodeURIComponent(disputeId)}/resolve`,
      headers: gatewayHeaders({ personal: true, version }),
      data: input,
    });
  },

  async orgListBookingDisputes(
    organizationId: string,
    bookingId: string
  ): Promise<DisputeItem[]> {
    return requestGateway<DisputeItem[]>({
      method: "GET",
      url: `/bookings/${encodeURIComponent(bookingId)}/disputes`,
      headers: gatewayHeaders({ organizationId }),
    });
  },

  async orgSubmitProviderResponse(
    organizationId: string,
    disputeId: string,
    response: string,
    version?: number
  ): Promise<DisputeItem> {
    return requestGateway<DisputeItem>({
      method: "POST",
      url: `/disputes/${encodeURIComponent(disputeId)}/provider-response`,
      headers: gatewayHeaders({ organizationId, version }),
      data: { response: response.trim() },
    });
  },

  async orgReassignSameOrgTechnician(
    organizationId: string,
    bookingId: string,
    input: { technicianId: string; note?: string },
    version?: number
  ): Promise<{ id: string; status: string; assignedTechnicianId?: string | null; assignedTechnicianName?: string | null; version?: number }> {
    return requestGateway({
      method: "POST",
      url: `/bookings/${encodeURIComponent(bookingId)}/reassign-technician`,
      headers: gatewayHeaders({ organizationId, version }),
      data: input,
    });
  },

  async adminListNotificationFailedBookings(
    page = 1,
    size = 30
  ): Promise<AdminNotificationFailedBooking[]> {
    const data = await requestGateway<
      PageResponse<AdminNotificationFailedBooking> | AdminNotificationFailedBooking[]
    >({
      method: "GET",
      url: "/admin/bookings/notification-failed",
      params: { page: String(page), size: String(size) },
      headers: gatewayHeaders({ personal: true }),
    });
    return extractPageItems(data);
  },

  async adminGetNotificationFailedBooking(
    bookingId: string
  ): Promise<AdminNotificationFailedBookingDetail> {
    return requestGateway<AdminNotificationFailedBookingDetail>({
      method: "GET",
      url: `/admin/bookings/notification-failed/${encodeURIComponent(bookingId)}`,
      headers: gatewayHeaders({ personal: true }),
    });
  },

  async adminRetryCompletionNotification(
    bookingId: string,
    version?: number,
    note?: string
  ): Promise<AdminNotificationFailedBookingDetail> {
    return requestGateway<AdminNotificationFailedBookingDetail>({
      method: "POST",
      url: `/admin/bookings/notification-failed/${encodeURIComponent(bookingId)}/retry`,
      headers: gatewayHeaders({ personal: true, version }),
      data: { note: note?.trim() || undefined },
    });
  },
};
