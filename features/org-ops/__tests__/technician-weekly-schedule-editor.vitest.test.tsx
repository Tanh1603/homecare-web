import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
import { describe, expect, it, vi, afterEach } from "vitest";
import { TechnicianWeeklyScheduleEditor } from "../components/technician-weekly-schedule-editor";
import { orgOpsHttpApi, ScheduleConflictError } from "../api/org-ops.http";

describe("TechnicianWeeklyScheduleEditor", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("applies Mon-Fri split preset and submits normalized intervals with If-Match version", async () => {
    const upsertSpy = vi
      .spyOn(orgOpsHttpApi, "upsertTechnicianWeeklySchedule")
      .mockResolvedValue({
        technicianId: "tech-1",
        horizonDays: 30,
        currentRule: {
          id: "rule-1",
          timezone: "Asia/Ho_Chi_Minh",
          effectiveFrom: "2026-11-27",
          effectiveUntil: null,
          version: 2,
          intervals: [],
        },
        upcomingRules: [],
      });
    const onSaved = vi.fn();

    renderWithQuery(
      <TechnicianWeeklyScheduleEditor
        organizationId="org-1"
        technicianId="tech-1"
        overview={{
          technicianId: "tech-1",
          horizonDays: 30,
          currentRule: {
            id: "rule-1",
            timezone: "Asia/Ho_Chi_Minh",
            effectiveFrom: "2026-11-27",
            effectiveUntil: null,
            version: 1,
            intervals: [],
          },
          upcomingRules: [],
        }}
        onSaved={onSaved}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /T2–T6 \(08:00–12:00, 13:00–17:00\)/ })
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Lưu & đồng bộ lịch tuần/ })
    );

    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledTimes(1);
    });
    expect(upsertSpy).toHaveBeenCalledWith(
      "org-1",
      "tech-1",
      expect.objectContaining({
        timezone: "Asia/Ho_Chi_Minh",
        intervals: expect.arrayContaining([
          { dayOfWeek: "MONDAY", startTime: "08:00:00", endTime: "12:00:00" },
          { dayOfWeek: "MONDAY", startTime: "13:00:00", endTime: "17:00:00" },
        ]),
      }),
      1
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("renders actionable 409 conflict alert when backend rejects conflicting bookings", async () => {
    vi.spyOn(orgOpsHttpApi, "upsertTechnicianWeeklySchedule").mockRejectedValue(
      new ScheduleConflictError({
        success: false,
        code: 409,
        errorCode: "SCHEDULE_ALLOCATION_CONFLICT",
        message: "Xung đột với 1 booking",
        timestamp: "2026-11-27T00:00:00Z",
        data: {
          conflicts: [
            {
              windowId: "win-1",
              bookingId: "12345678-aaaa-bbbb-cccc-1234567890ab",
              startsAt: "2026-12-01T07:00:00Z",
              endsAt: "2026-12-01T08:00:00Z",
            },
          ],
        },
      })
    );

    renderWithQuery(
      <TechnicianWeeklyScheduleEditor
        organizationId="org-1"
        technicianId="tech-1"
        overview={null}
        onSaved={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Lưu & đồng bộ lịch tuần/ })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Không thể cập nhật vì xung đột 1 booking đã phân bổ/)
      ).toBeTruthy();
      expect(screen.getByText(/Booking #12345678/)).toBeTruthy();
    });
  });
});
