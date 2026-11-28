import { extractPageItems, type PageResponse } from "@/shared/api/api-envelope";
import { gatewayHeaders, requestGateway } from "@/shared/api/http-client";

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

export const warrantiesHttpApi = {
  async adminListWarranties(verificationStatus = "ALL", page = 1, size = 30): Promise<HouseholdWarrantyItem[]> {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (verificationStatus && verificationStatus !== "ALL") {
      query.set("verificationStatus", verificationStatus);
    }
    const data = await requestGateway<PageResponse<HouseholdWarrantyItem> | HouseholdWarrantyItem[]>({
      url: `/admin/warranties?${query.toString()}`,
      method: "GET",
      headers: gatewayHeaders({ scope: "personal" }),
    });
    return extractPageItems(data);
  },

  async adminVerifyWarranty(
    warrantyId: string,
    payload: { verificationStatus: "VERIFIED" | "REJECTED"; note?: string },
    version?: number
  ): Promise<HouseholdWarrantyItem> {
    return requestGateway<HouseholdWarrantyItem>({
      url: `/admin/warranties/${encodeURIComponent(warrantyId)}/verify`,
      method: "POST",
      headers: gatewayHeaders({ version, scope: "personal" }),
      data: payload,
    });
  },

  async adminListClaims(page = 1, size = 30): Promise<WarrantyClaimItem[]> {
    const data = await requestGateway<PageResponse<WarrantyClaimItem> | WarrantyClaimItem[]>({
      url: `/admin/warranty-claims?page=${page}&size=${size}`,
      method: "GET",
      headers: gatewayHeaders({ scope: "personal" }),
    });
    return extractPageItems(data);
  },

  async adminVerifyClaim(
    claimId: string,
    payload: { warrantyVerificationStatus?: "VERIFIED" | "REJECTED"; authorizationVerificationStatus?: "VERIFIED" | "REJECTED"; note?: string },
    version?: number
  ): Promise<WarrantyClaimItem> {
    return requestGateway<WarrantyClaimItem>({
      url: `/admin/warranty-claims/${encodeURIComponent(claimId)}/verify`,
      method: "POST",
      headers: gatewayHeaders({ version, scope: "personal" }),
      data: payload,
    });
  },

  async orgListClaims(page = 1, size = 30): Promise<WarrantyClaimItem[]> {
    const data = await requestGateway<PageResponse<WarrantyClaimItem> | WarrantyClaimItem[]>({
      url: `/warranty-claims?page=${page}&size=${size}`,
      method: "GET",
      headers: gatewayHeaders({ scope: "organization" }),
    });
    return extractPageItems(data);
  },

  async orgRespondClaim(
    claimId: string,
    payload: { accepted: boolean; rejectionReason?: string },
    version?: number
  ): Promise<WarrantyClaimItem> {
    return requestGateway<WarrantyClaimItem>({
      url: `/warranty-claims/${encodeURIComponent(claimId)}/respond`,
      method: "POST",
      headers: gatewayHeaders({ version, scope: "organization" }),
      data: payload,
    });
  },

  async orgAppendClaimEvidence(
    claimId: string,
    payload: { evidenceKind: "WARRANTY" | "AUTHORIZATION"; evidenceRef: string }
  ): Promise<WarrantyClaimItem> {
    return requestGateway<WarrantyClaimItem>({
      url: `/warranty-claims/${encodeURIComponent(claimId)}/evidence`,
      method: "POST",
      headers: gatewayHeaders({ scope: "organization" }),
      data: payload,
    });
  },

  async orgListPartsRequests(bookingId: string): Promise<PartsRequestItem[]> {
    return requestGateway<PartsRequestItem[]>({
      url: `/bookings/${encodeURIComponent(bookingId)}/parts-requests`,
      method: "GET",
      headers: gatewayHeaders({ scope: "organization" }),
    });
  },

  async orgReviewPartsRequest(
    bookingId: string,
    requestId: string,
    payload: { approved: boolean; costPrice?: number; unitPrice?: number; reason?: string },
    version?: number
  ): Promise<PartsRequestItem> {
    return requestGateway<PartsRequestItem>({
      url: `/bookings/${encodeURIComponent(bookingId)}/parts-requests/${encodeURIComponent(requestId)}/review`,
      method: "POST",
      headers: gatewayHeaders({ version, scope: "organization" }),
      data: payload,
    });
  },
};
