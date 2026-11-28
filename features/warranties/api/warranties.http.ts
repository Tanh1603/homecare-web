import {
  extractPageItems,
  unwrapApiResponse,
  type ApiResponse,
  type PageResponse,
} from "@/shared/api/api-envelope";

export interface HouseholdWarrantyItem {
  id: string;
  deviceId?: string | null;
  organizationId?: string | null;
  source: string;
  providerName: string;
  ownerName?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
  status: string;
  warrantyCategory?: string;
  warrantyIssuer?: string;
  verificationStatus?: string;
  validityStatus?: string;
  authorizationEvidenceRef?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  verificationNote?: string | null;
  version?: number;
  createdAt: string;
}

export interface WarrantyClaimItem {
  id: string;
  bookingId?: string | null;
  deviceId?: string | null;
  householdWarrantyId?: string | null;
  providerId?: string | null;
  requesterProfileId: string;
  warrantyCategory: "PRODUCT_MANUFACTURER" | "WORKMANSHIP" | "PARTS" | string;
  warrantyIssuer: string;
  referenceSerial?: string | null;
  issueDescription: string;
  warrantyEvidenceRefs: string[];
  authorizationEvidenceRefs: string[];
  claimStatus: string;
  warrantyVerificationStatus: string;
  authorizationVerificationStatus: string;
  validityStatus: string;
  reportedAt: string;
  providerResponseDeadlineAt?: string | null;
  providerNoResponse: boolean;
  reworkBookingId?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  version?: number;
  createdAt: string;
}

export interface PartsRequestItem {
  id: string;
  bookingId: string;
  providerId: string;
  requestedByProfileId: string;
  partName: string;
  partCode?: string | null;
  quantity: number;
  partSource: string;
  supplierName?: string | null;
  costPrice?: number | null;
  unitPrice?: number | null;
  status: string;
  compatibilityNote?: string | null;
  refusalReason?: string | null;
  evidenceRef?: string | null;
  version?: number;
  createdAt: string;
}

function buildHeaders(version?: number, scope: "personal" | "organization" = "personal"): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-homecare-scope": scope,
  };
  if (typeof version === "number") {
    headers["If-Match"] = `"v${version}"`;
  }
  return headers;
}

export const warrantiesHttpApi = {
  async adminListWarranties(verificationStatus = "ALL", page = 1, size = 30): Promise<HouseholdWarrantyItem[]> {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (verificationStatus && verificationStatus !== "ALL") {
      query.set("verificationStatus", verificationStatus);
    }
    const res = await fetch(`/api/gateway/admin/warranties?${query.toString()}`, {
      cache: "no-store",
      headers: { "x-homecare-scope": "personal" },
    });
    const json = (await res.json()) as ApiResponse<PageResponse<HouseholdWarrantyItem> | HouseholdWarrantyItem[]>;
    return extractPageItems(unwrapApiResponse(json));
  },

  async adminVerifyWarranty(
    warrantyId: string,
    payload: { verificationStatus: "VERIFIED" | "REJECTED"; note?: string },
    version?: number
  ): Promise<HouseholdWarrantyItem> {
    const res = await fetch(`/api/gateway/admin/warranties/${encodeURIComponent(warrantyId)}/verify`, {
      method: "POST",
      headers: buildHeaders(version, "personal"),
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as ApiResponse<HouseholdWarrantyItem>;
    return unwrapApiResponse(json);
  },

  async adminListClaims(page = 1, size = 30): Promise<WarrantyClaimItem[]> {
    const res = await fetch(`/api/gateway/admin/warranty-claims?page=${page}&size=${size}`, {
      cache: "no-store",
      headers: { "x-homecare-scope": "personal" },
    });
    const json = (await res.json()) as ApiResponse<PageResponse<WarrantyClaimItem> | WarrantyClaimItem[]>;
    return extractPageItems(unwrapApiResponse(json));
  },

  async adminVerifyClaim(
    claimId: string,
    payload: { warrantyVerificationStatus?: "VERIFIED" | "REJECTED"; authorizationVerificationStatus?: "VERIFIED" | "REJECTED"; note?: string },
    version?: number
  ): Promise<WarrantyClaimItem> {
    const res = await fetch(`/api/gateway/admin/warranty-claims/${encodeURIComponent(claimId)}/verify`, {
      method: "POST",
      headers: buildHeaders(version, "personal"),
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as ApiResponse<WarrantyClaimItem>;
    return unwrapApiResponse(json);
  },

  async orgListClaims(page = 1, size = 30): Promise<WarrantyClaimItem[]> {
    const res = await fetch(`/api/gateway/warranty-claims?page=${page}&size=${size}`, {
      cache: "no-store",
      headers: { "x-homecare-scope": "organization" },
    });
    const json = (await res.json()) as ApiResponse<PageResponse<WarrantyClaimItem> | WarrantyClaimItem[]>;
    return extractPageItems(unwrapApiResponse(json));
  },

  async orgRespondClaim(
    claimId: string,
    payload: { accepted: boolean; rejectionReason?: string },
    version?: number
  ): Promise<WarrantyClaimItem> {
    const res = await fetch(`/api/gateway/warranty-claims/${encodeURIComponent(claimId)}/respond`, {
      method: "POST",
      headers: buildHeaders(version, "organization"),
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as ApiResponse<WarrantyClaimItem>;
    return unwrapApiResponse(json);
  },

  async orgAppendClaimEvidence(
    claimId: string,
    payload: { evidenceKind: "WARRANTY" | "AUTHORIZATION"; evidenceRef: string }
  ): Promise<WarrantyClaimItem> {
    const res = await fetch(`/api/gateway/warranty-claims/${encodeURIComponent(claimId)}/evidence`, {
      method: "POST",
      headers: buildHeaders(undefined, "organization"),
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as ApiResponse<WarrantyClaimItem>;
    return unwrapApiResponse(json);
  },

  async orgListPartsRequests(bookingId: string): Promise<PartsRequestItem[]> {
    const res = await fetch(`/api/gateway/bookings/${encodeURIComponent(bookingId)}/parts-requests`, {
      cache: "no-store",
      headers: { "x-homecare-scope": "organization" },
    });
    const json = (await res.json()) as ApiResponse<PartsRequestItem[]>;
    return unwrapApiResponse(json);
  },

  async orgReviewPartsRequest(
    bookingId: string,
    requestId: string,
    payload: { approved: boolean; costPrice?: number; unitPrice?: number; reason?: string },
    version?: number
  ): Promise<PartsRequestItem> {
    const res = await fetch(
      `/api/gateway/bookings/${encodeURIComponent(bookingId)}/parts-requests/${encodeURIComponent(requestId)}/review`,
      {
        method: "POST",
        headers: buildHeaders(version, "organization"),
        body: JSON.stringify(payload),
      }
    );
    const json = (await res.json()) as ApiResponse<PartsRequestItem>;
    return unwrapApiResponse(json);
  },
};
