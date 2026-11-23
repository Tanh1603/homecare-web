import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "@/shared/ui/status-badge";

describe("StatusBadge", () => {
  it("distinguishes return approval from completed refund", () => {
    render(
      <>
        <StatusBadge status="APPROVED_PENDING_MANUAL_REFUND" />
        <StatusBadge status="REFUNDED" />
        <StatusBadge status="REFUND_SUBMITTED" />
        <StatusBadge status="REFUND_FAILED" />
        <StatusBadge status="MANUAL_REVIEW" />
      </>,
    );

    expect(screen.getByText("Chờ hoàn tiền thủ công")).toBeInTheDocument();
    expect(screen.getByText("Đã hoàn tiền")).toBeInTheDocument();
    expect(screen.getByText("Đang xử lý hoàn tiền")).toBeInTheDocument();
    expect(screen.getByText("Hoàn tiền thất bại")).toBeInTheDocument();
    expect(screen.getByText("Cần kiểm tra thủ công")).toBeInTheDocument();
  });

  it("uses distinct labels for booking and return REQUESTED states", () => {
    render(
      <>
        <StatusBadge status="REQUESTED" domain="booking" />
        <StatusBadge status="REQUESTED" domain="return" />
      </>,
    );

    expect(screen.getByText("Đang tìm thợ")).toBeInTheDocument();
    expect(screen.getByText("Chờ duyệt hoàn tiền")).toBeInTheDocument();
  });
});
