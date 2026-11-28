import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { useUiStore } from "@/shared/store/ui-store";
import { AdminWarrantiesPanel } from "../components/admin-warranties-panel";

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("AdminWarrantiesPanel", () => {
  beforeEach(() => {
    useUiStore.getState().resetUiStore();
  });

  it("renders device warranty verification queue and claims tab counts", () => {
    renderWithQuery(
      <AdminWarrantiesPanel
        initialWarranties={[
          {
            id: "11111111-1111-1111-1111-111111111111",
            source: "MANUAL",
            providerName: "Daikin VN",
            status: "ACTIVE",
            warrantyCategory: "PRODUCT_MANUFACTURER",
            warrantyIssuer: "MANUFACTURER",
            verificationStatus: "UNVERIFIED",
            createdAt: "2026-11-28T00:00:00Z",
          },
        ]}
        initialClaims={[
          {
            id: "22222222-2222-2222-2222-222222222222",
            requesterProfileId: "cust-1",
            warrantyCategory: "WORKMANSHIP",
            warrantyIssuer: "PROVIDER",
            issueDescription: "Leaking pipe",
            warrantyEvidenceRefs: [],
            authorizationEvidenceRefs: [],
            claimStatus: "SUBMITTED",
            warrantyVerificationStatus: "UNVERIFIED",
            authorizationVerificationStatus: "UNVERIFIED",
            validityStatus: "ACTIVE",
            reportedAt: "2026-11-28T00:00:00Z",
            providerNoResponse: true,
            createdAt: "2026-11-28T00:00:00Z",
          },
        ]}
      />
    );

    expect(screen.getByText("Daikin VN")).toBeTruthy();
    expect(screen.getByText(/Bảo hành thiết bị \(1\)/)).toBeTruthy();
    expect(screen.getByText(/Yêu cầu bảo hành \/ SLA \(1\)/)).toBeTruthy();
  });
});
