import {
  extractPageItems,
  extractPaginationMeta,
  type PageResponse,
  type PaginationMeta,
} from "@/shared/api/api-envelope";
import { gatewayHeaders, requestGateway } from "@/shared/api/http-client";

export interface AdminReviewItem {
  id: string;
  bookingId: string;
  providerId: string;
  authorProfileId: string;
  authorName?: string | null;
  rating: number;
  comment: string;
  status: "PUBLISHED" | "HIDDEN" | "DELETED" | string;
  editCount: number;
  editedAt?: string | null;
  hiddenReason?: string | null;
  hiddenBy?: string | null;
  hiddenAt?: string | null;
  restoredBy?: string | null;
  restoredAt?: string | null;
  restoreNote?: string | null;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderRatingSnapshot {
  providerId: string;
  ratingAvg: number;
  reviewCount: number;
  calculatedAt: string;
}

export interface AdminResyncRatingResult {
  resyncedProviders: number;
  snapshots: ProviderRatingSnapshot[];
}

export const reviewsHttpApi = {
  async adminListServiceReviews(params?: {
    status?: string;
    providerId?: string;
    rating?: number | null;
    q?: string;
    page?: number;
    size?: number;
  }): Promise<{ items: AdminReviewItem[]; pagination: PaginationMeta }> {
    const query: Record<string, string> = {
      page: String(params?.page ?? 1),
      size: String(params?.size ?? 20),
    };
    if (params?.status && params.status !== "ALL") query.status = params.status;
    if (params?.providerId?.trim()) query.providerId = params.providerId.trim();
    if (typeof params?.rating === "number") query.rating = String(params.rating);
    if (params?.q?.trim()) query.q = params.q.trim();

    const data = await requestGateway<PageResponse<AdminReviewItem> | AdminReviewItem[]>({
      method: "GET",
      url: "/admin/service-reviews",
      params: query,
      headers: gatewayHeaders({ personal: true }),
    });
    return {
      items: extractPageItems(data),
      pagination: extractPaginationMeta(data, params?.page ?? 1, params?.size ?? 20),
    };
  },

  async adminHideServiceReview(
    reviewId: string,
    reason: string,
    version?: number
  ): Promise<AdminReviewItem> {
    return requestGateway<AdminReviewItem>({
      method: "POST",
      url: `/admin/service-reviews/${encodeURIComponent(reviewId)}/hide`,
      headers: gatewayHeaders({ personal: true, version }),
      data: { reason: reason.trim() },
    });
  },

  async adminRestoreServiceReview(
    reviewId: string,
    note?: string,
    version?: number
  ): Promise<AdminReviewItem> {
    return requestGateway<AdminReviewItem>({
      method: "POST",
      url: `/admin/service-reviews/${encodeURIComponent(reviewId)}/restore`,
      headers: gatewayHeaders({ personal: true, version }),
      data: { note: note?.trim() || undefined },
    });
  },

  async adminResyncRating(providerId?: string): Promise<AdminResyncRatingResult> {
    return requestGateway<AdminResyncRatingResult>({
      method: "POST",
      url: "/admin/service-reviews/resync-rating",
      headers: gatewayHeaders({ personal: true }),
      data: providerId?.trim() ? { providerId: providerId.trim() } : {},
    });
  },
};
