import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminReviewsPanel } from "../components/admin-reviews-panel";
import { reviewsHttpApi } from "../api/reviews.http";

function renderWithQueryClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("AdminReviewsPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders review moderation audit trail, validates hide reason, and supports restore & resync", async () => {
    const hideSpy = vi.spyOn(reviewsHttpApi, "adminHideServiceReview").mockResolvedValue({
      id: "rev-1",
      bookingId: "bk-1",
      providerId: "prv-1",
      authorProfileId: "cust-1",
      authorName: "Nguyen Van A",
      rating: 5,
      comment: "Tho lam rat tot",
      status: "HIDDEN",
      editCount: 0,
      hiddenReason: "Spam quang cao",
      hiddenBy: "admin-1",
      hiddenAt: "2026-11-28T05:00:00Z",
      version: 1,
      createdAt: "2026-11-28T01:00:00Z",
      updatedAt: "2026-11-28T05:00:00Z",
    });
    const resyncSpy = vi.spyOn(reviewsHttpApi, "adminResyncRating").mockResolvedValue({
      resyncedProviders: 1,
      snapshots: [],
    });

    renderWithQueryClient(
      <AdminReviewsPanel
        initialItems={[
          {
            id: "rev-1",
            bookingId: "bk-1",
            providerId: "prv-1",
            authorProfileId: "cust-1",
            authorName: "Nguyen Van A",
            rating: 5,
            comment: "Tho lam rat tot",
            status: "PUBLISHED",
            editCount: 0,
            version: 0,
            createdAt: "2026-11-28T01:00:00Z",
            updatedAt: "2026-11-28T01:00:00Z",
          },
        ]}
        initialPagination={{ page: 1, size: 20, totalItems: 1, totalPages: 1 }}
      />
    );

    expect(screen.getByText("Tho lam rat tot")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Ẩn đánh giá/i }));
    const reasonInput = screen.getByLabelText(/Lý do ẩn bắt buộc/i);
    fireEvent.change(reasonInput, { target: { value: "Spam quang cao" } });
    fireEvent.click(screen.getByRole("button", { name: /Xác nhận ẩn/i }));

    await waitFor(() => {
      expect(hideSpy).toHaveBeenCalledWith("rev-1", "Spam quang cao", 0);
    });
    expect(screen.getByText(/Lý do ẩn: Spam quang cao/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Resync Rating/i }));
    await waitFor(() => {
      expect(resyncSpy).toHaveBeenCalledTimes(1);
    });
  });
});
