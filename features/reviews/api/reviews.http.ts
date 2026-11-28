import {
  extractPageItems,
  extractPaginationMeta,
  unwrapApiResponse,
  type ApiResponse,
  type PageResponse,
  type PaginationMeta,
} from "@/shared/api/api-envelope";

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

function adminHeaders(version?: number): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-homecare-scope": "personal",
  };
  if (typeof version === "number") {
    headers["If-Match"] = `"v${version}"`;
  }
  return headers;
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
    const query = new URLSearchParams({
      page: String(params?.page ?? 1),
      size: String(params?.size ?? 20),
    });
    if (params?.status && params.status !== "ALL") query.set("status", params.status);
    if (params?.providerId?.trim()) query.set("providerId", params.providerId.trim());
    if (typeof params?.rating === "number") query.set("rating", String(params.rating));
    if (params?.q?.trim()) query.set("q", params.q.trim());

    const res = await fetch(`/api/gateway/admin/service-reviews?${query.toString()}`, {
      cache: "no-store",
      headers: { "x-homecare-scope": "personal" },
    });
    const json = (await res.json()) as ApiResponse<PageResponse<AdminReviewItem> | AdminReviewItem[]>;
    const unwrapped = unwrapApiResponse(json);
    return {
      items: extractPageItems(unwrapped),
      pagination: extractPaginationMeta(unwrapped, params?.page ?? 1, params?.size ?? 20),
    };
  },

  async adminHideServiceReview(
    reviewId: string,
    reason: string,
    version?: number
  ): Promise<AdminReviewItem> {
    const res = await fetch(
      `/api/gateway/admin/service-reviews/${encodeURIComponent(reviewId)}/hide`,
      {
        method: "POST",
        headers: adminHeaders(version),
        body: JSON.stringify({ reason: reason.trim() }),
      }
    );
    const json = (await res.json()) as ApiResponse<AdminReviewItem>;
    return unwrapApiResponse(json);
  },

  async adminRestoreServiceReview(
    reviewId: string,
    note?: string,
    version?: number
  ): Promise<AdminReviewItem> {
    const res = await fetch(
      `/api/gateway/admin/service-reviews/${encodeURIComponent(reviewId)}/restore`,
      {
        method: "POST",
        headers: adminHeaders(version),
        body: JSON.stringify({ note: note?.trim() || undefined }),
      }
    );
    const json = (await res.json()) as ApiResponse<AdminReviewItem>;
    return unwrapApiResponse(json);
  },

  async adminResyncRating(providerId?: string): Promise<AdminResyncRatingResult> {
    const res = await fetch("/api/gateway/admin/service-reviews/resync-rating", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify(providerId?.trim() ? { providerId: providerId.trim() } : {}),
    });
    const json = (await res.json()) as ApiResponse<AdminResyncRatingResult>;
    return unwrapApiResponse(json);
  },
};
