import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminDisputesPanel } from "../components/admin-disputes-panel";
import { disputesHttpApi } from "../api/disputes.http";

describe("AdminDisputesPanel Notification Failed tab", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("switches to Notification Failed tab, inspects detail, and triggers retry with If-Match", async () => {
    const detailSpy = vi
      .spyOn(disputesHttpApi, "adminGetNotificationFailedBooking")
      .mockResolvedValue({
        bookingId: "bk-fail-1",
        providerId: "prv-1",
        requesterProfileId: "cust-1",
        serviceName: "Ve sinh dieu hoa",
        status: "COMPLETED_PENDING_ACCEPTANCE",
        completionSummary: "Da ve sinh dan nong va dan lanh",
        workEvidenceCount: 2,
        completionSubmittedAt: "2026-11-27T01:00:00Z",
        notificationFailedAt: "2026-11-28T02:00:00Z",
        notificationRetryCount: 0,
        lastNotificationRetryAt: null,
        adminReviewReason: "NOTIFICATION_FAILED: 24h unconfirmed",
        version: 4,
      });

    const retrySpy = vi
      .spyOn(disputesHttpApi, "adminRetryCompletionNotification")
      .mockResolvedValue({
        bookingId: "bk-fail-1",
        providerId: "prv-1",
        requesterProfileId: "cust-1",
        serviceName: "Ve sinh dieu hoa",
        status: "COMPLETED_PENDING_ACCEPTANCE",
        completionSummary: "Da ve sinh dan nong va dan lanh",
        workEvidenceCount: 2,
        completionSubmittedAt: "2026-11-27T01:00:00Z",
        notificationFailedAt: "2026-11-28T02:00:00Z",
        notificationRetryCount: 1,
        lastNotificationRetryAt: "2026-11-28T06:00:00Z",
        adminReviewReason: "NOTIFICATION_FAILED: 24h unconfirmed",
        version: 5,
      });

    render(
      <AdminDisputesPanel
        initialDisputes={[]}
        initialNotificationFailed={[
          {
            bookingId: "bk-fail-1",
            providerId: "prv-1",
            requesterProfileId: "cust-1",
            serviceName: "Ve sinh dieu hoa",
            completionSubmittedAt: "2026-11-27T01:00:00Z",
            notificationFailedAt: "2026-11-28T02:00:00Z",
            notificationRetryCount: 0,
            adminReviewReason: "NOTIFICATION_FAILED: 24h unconfirmed",
            version: 4,
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Notification Failed \(1\)/i }));
    expect(screen.getByText("Ve sinh dieu hoa")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Chi tiết/i }));
    await waitFor(() => {
      expect(detailSpy).toHaveBeenCalledWith("bk-fail-1");
    });
    expect(screen.getByText(/Da ve sinh dan nong va dan lanh/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Thử gửi lại thông báo/i }));
    await waitFor(() => {
      expect(retrySpy).toHaveBeenCalledWith("bk-fail-1", 4, "");
    });
  });
});
