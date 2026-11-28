import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { browserHttpClient } from "@/shared/api/http-client";
import { orgOpsHttpApi, ScheduleConflictError } from "./org-ops.http";

describe("manual refund HTTP contract", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends organization scope, If-Match, and the required transfer reference", async () => {
    const requestSpy = vi
      .spyOn(browserHttpClient, "request")
      .mockResolvedValue({
        status: 200,
        data: { success: true, data: { id: "return-1", status: "REFUNDED" } },
      });

    await orgOpsHttpApi.confirmManualRefund(
      "org-1",
      "order-1",
      "return-1",
      "  BANK-123  ",
      8
    );

    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/orders/order-1/returns/return-1/confirm-manual-refund",
        method: "POST",
        headers: expect.objectContaining({
          "X-Organization-Id": "org-1",
          "If-Match": '"v8"',
        }),
        data: { reference: "BANK-123" },
      })
    );
  });

  it("sends startsAt and endsAt when creating a technician schedule window", async () => {
    const requestSpy = vi
      .spyOn(browserHttpClient, "request")
      .mockResolvedValue({
        status: 200,
        data: {
          success: true,
          data: {
            id: "win-1",
            technicianId: "tech-1",
            startsAt: "2026-11-27T01:00:00.000Z",
            endsAt: "2026-11-27T10:00:00.000Z",
            status: "AVAILABLE",
            version: 0,
          },
        },
      });

    await orgOpsHttpApi.createTechnicianSchedule("org-1", "tech-1", {
      startsAt: "2026-11-27T01:00:00.000Z",
      endsAt: "2026-11-27T10:00:00.000Z",
    });

    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/technicians/tech-1/schedules",
        method: "POST",
        headers: expect.objectContaining({
          "X-Organization-Id": "org-1",
        }),
        data: {
          startsAt: "2026-11-27T01:00:00.000Z",
          endsAt: "2026-11-27T10:00:00.000Z",
        },
      })
    );
  });

  it("sends If-Match on upsertTechnicianWeeklySchedule and surfaces 409 conflicts", async () => {
    const conflictPayload = {
      success: false,
      code: 409,
      errorCode: "SCHEDULE_ALLOCATION_CONFLICT",
      message: "Xung đột với 1 booking",
      data: {
        conflicts: [
          {
            windowId: "win-1",
            bookingId: "book-1",
            startsAt: "2026-12-01T07:00:00Z",
            endsAt: "2026-12-01T08:00:00Z",
          },
        ],
      },
    };
    const requestSpy = vi
      .spyOn(browserHttpClient, "request")
      .mockRejectedValue(
        new AxiosError(
          "Request failed with status code 409",
          "ERR_BAD_RESPONSE",
          undefined,
          undefined,
          {
            status: 409,
            statusText: "Conflict",
            headers: {},
            config: { headers: new AxiosHeaders() },
            data: conflictPayload,
          }
        )
      );

    await expect(
      orgOpsHttpApi.upsertTechnicianWeeklySchedule(
        "org-1",
        "tech-1",
        {
          effectiveFrom: "2026-12-01",
          intervals: [
            { dayOfWeek: "MONDAY", startTime: "08:00:00", endTime: "12:00:00" },
          ],
        },
        2
      )
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof ScheduleConflictError &&
        err.conflicts.length === 1 &&
        err.conflicts[0].bookingId === "book-1"
    );

    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/technicians/tech-1/weekly-schedules",
        method: "PUT",
        headers: expect.objectContaining({
          "X-Organization-Id": "org-1",
          "If-Match": '"v2"',
        }),
      })
    );
  });
});
