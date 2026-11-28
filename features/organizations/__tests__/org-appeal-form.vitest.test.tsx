import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OrgAppealForm } from "@/features/organizations/components/org-appeal-form";
import { organizationsHttpAdapter } from "@/features/organizations/api/organizations.http";

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

vi.mock("@/features/organizations/api/organizations.http", () => ({
  organizationsHttpAdapter: {
    submitAppeal: vi.fn(),
  },
}));

describe("OrgAppealForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits appeal with enforcementId and reason", async () => {
    vi.mocked(organizationsHttpAdapter.submitAppeal).mockResolvedValue({
      id: "appeal-1",
      status: "SUBMITTED",
      slaDueAt: "2026-11-30T00:00:00Z",
    });

    renderWithQuery(<OrgAppealForm organizationId="org-1" />);

    fireEvent.change(screen.getByLabelText(/Mã quyết định chế tài/i), {
      target: { value: "enf-123" },
    });
    fireEvent.change(screen.getByLabelText(/Nội dung giải trình/i), {
      target: { value: "Đã bổ sung đầy đủ chứng từ hợp lệ" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gửi đơn kháng cáo" }));

    await waitFor(() => {
      expect(organizationsHttpAdapter.submitAppeal).toHaveBeenCalledWith("org-1", {
        enforcementId: "enf-123",
        appealReason: "Đã bổ sung đầy đủ chứng từ hợp lệ",
        evidenceRefs: undefined,
      });
    });

    expect(
      await screen.findByText(/Đã tiếp nhận kháng cáo \(SUBMITTED\)/i)
    ).toBeTruthy();
  });
});
