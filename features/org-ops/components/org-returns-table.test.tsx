import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrgReturnsTable } from "./org-returns-table";
import { orgOpsHttpApi } from "../api/org-ops.http";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../api/org-ops.http", () => ({
  orgOpsHttpApi: {
    resolveOrderReturn: vi.fn(),
    confirmManualRefund: vi.fn(),
  },
}));

const pendingRefund = {
  id: "return-1",
  orderId: "order-1",
  orderLineId: "line-1",
  productId: "product-1",
  productName: "Máy lọc không khí",
  buyerName: "Khách hàng",
  returnType: "REFUND",
  quantity: 1,
  reason: "Không phù hợp",
  status: "APPROVED_PENDING_MANUAL_REFUND",
  createdAt: "2026-11-17T00:00:00Z",
  version: 3,
};

describe("OrgReturnsTable manual refund", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not expose manual refund confirmation to staff", () => {
    render(
      <OrgReturnsTable
        organizationId="org-1"
        currentUserRole="ORG_STAFF"
        initialReturns={[pendingRefund]}
      />
    );

    expect(screen.queryByRole("button", { name: /xác nhận hoàn tiền/i })).toBeNull();
  });

  it("lets the owner confirm a pending manual refund with a transfer reference", async () => {
    vi.mocked(orgOpsHttpApi.confirmManualRefund).mockResolvedValue({
      ...pendingRefund,
      status: "REFUNDED",
    });
    render(
      <OrgReturnsTable
        organizationId="org-1"
        currentUserRole="ORG_OWNER"
        initialReturns={[pendingRefund]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /xác nhận hoàn tiền/i }));
    fireEvent.change(screen.getByLabelText(/mã giao dịch/i), {
      target: { value: "BANK-REF-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));

    await waitFor(() =>
      expect(orgOpsHttpApi.confirmManualRefund).toHaveBeenCalledWith(
        "org-1",
        "order-1",
        "return-1",
        "BANK-REF-123",
        3
      )
    );
    expect(await screen.findByText("Đã hoàn tiền")).toBeTruthy();
  });
});
