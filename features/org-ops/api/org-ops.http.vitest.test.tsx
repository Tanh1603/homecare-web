import { afterEach, describe, expect, it, vi } from "vitest";
import { orgOpsHttpApi } from "./org-ops.http";

describe("manual refund HTTP contract", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends organization scope, If-Match, and the required transfer reference", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ success: true, data: { id: "return-1", status: "REFUNDED" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    await orgOpsHttpApi.confirmManualRefund(
      "org-1",
      "order-1",
      "return-1",
      "  BANK-123  ",
      8
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gateway/orders/order-1/returns/return-1/confirm-manual-refund",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Organization-Id": "org-1",
          "If-Match": '"v8"',
        }),
        body: JSON.stringify({ reference: "BANK-123" }),
      })
    );
  });
});
