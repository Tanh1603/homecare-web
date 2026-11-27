import {
  extractPageItems,
  unwrapApiResponse,
  type ApiResponse,
  type PageResponse,
} from "@/shared/api/api-envelope";

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

function etagHeader(version?: number, personal = false): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (personal) {
    headers["x-homecare-scope"] = "personal";
  }
  if (typeof version === "number") {
    headers["If-Match"] = `"v${version}"`;
  }
  return headers;
}

export const disputesHttpApi = {
  async adminListDisputes(status?: string, page = 1, size = 30): Promise<DisputeItem[]> {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (status && status !== "ALL") query.set("status", status);
    const res = await fetch(`/api/gateway/admin/disputes?${query.toString()}`, {
      cache: "no-store",
      headers: { "x-homecare-scope": "personal" },
    });
    const json = (await res.json()) as ApiResponse<PageResponse<DisputeItem> | DisputeItem[]>;
    return extractPageItems(unwrapApiResponse(json));
  },

  async adminRequestProviderResponse(
    disputeId: string,
    version?: number,
    note?: string
  ): Promise<DisputeItem> {
    const res = await fetch(
      `/api/gateway/admin/disputes/${encodeURIComponent(disputeId)}/request-provider-response`,
      {
        method: "POST",
        headers: etagHeader(version, true),
        body: JSON.stringify({ note: note?.trim() || undefined }),
      }
    );
    const json = (await res.json()) as ApiResponse<DisputeItem>;
    return unwrapApiResponse(json);
  },

  async adminRequestCustomerEvidence(
    disputeId: string,
    version?: number,
    note?: string
  ): Promise<DisputeItem> {
    const res = await fetch(
      `/api/gateway/admin/disputes/${encodeURIComponent(disputeId)}/request-customer-evidence`,
      {
        method: "POST",
        headers: etagHeader(version, true),
        body: JSON.stringify({ note: note?.trim() || undefined }),
      }
    );
    const json = (await res.json()) as ApiResponse<DisputeItem>;
    return unwrapApiResponse(json);
  },

  async adminProposeResolution(
    disputeId: string,
    input: { proposal: string; outcome: string },
    version?: number
  ): Promise<DisputeItem> {
    const res = await fetch(
      `/api/gateway/admin/disputes/${encodeURIComponent(disputeId)}/propose-resolution`,
      {
        method: "POST",
        headers: etagHeader(version, true),
        body: JSON.stringify({
          proposal: input.proposal.trim(),
          outcome: input.outcome,
        }),
      }
    );
    const json = (await res.json()) as ApiResponse<DisputeItem>;
    return unwrapApiResponse(json);
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
    const res = await fetch(
      `/api/gateway/admin/disputes/${encodeURIComponent(disputeId)}/resolve`,
      {
        method: "POST",
        headers: etagHeader(version, true),
        body: JSON.stringify(input),
      }
    );
    const json = (await res.json()) as ApiResponse<DisputeItem>;
    return unwrapApiResponse(json);
  },

  async orgListBookingDisputes(
    organizationId: string,
    bookingId: string
  ): Promise<DisputeItem[]> {
    const res = await fetch(
      `/api/gateway/bookings/${encodeURIComponent(bookingId)}/disputes`,
      {
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      }
    );
    const json = (await res.json()) as ApiResponse<DisputeItem[]>;
    return unwrapApiResponse(json);
  },

  async orgSubmitProviderResponse(
    organizationId: string,
    disputeId: string,
    response: string,
    version?: number
  ): Promise<DisputeItem> {
    const headers: Record<string, string> = {
      ...etagHeader(version),
      "X-Organization-Id": organizationId,
    };
    const res = await fetch(
      `/api/gateway/disputes/${encodeURIComponent(disputeId)}/provider-response`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ response: response.trim() }),
      }
    );
    const json = (await res.json()) as ApiResponse<DisputeItem>;
    return unwrapApiResponse(json);
  },

  async orgReassignSameOrgTechnician(
    organizationId: string,
    bookingId: string,
    input: { technicianId: string; note?: string },
    version?: number
  ): Promise<{ id: string; status: string; assignedTechnicianId?: string | null; assignedTechnicianName?: string | null; version?: number }> {
    const headers: Record<string, string> = {
      ...etagHeader(version),
      "X-Organization-Id": organizationId,
    };
    const res = await fetch(
      `/api/gateway/bookings/${encodeURIComponent(bookingId)}/reassign-technician`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      }
    );
    const json = (await res.json()) as ApiResponse<{
      id: string;
      status: string;
      assignedTechnicianId?: string | null;
      assignedTechnicianName?: string | null;
      version?: number;
    }>;
    return unwrapApiResponse(json);
  },
};
