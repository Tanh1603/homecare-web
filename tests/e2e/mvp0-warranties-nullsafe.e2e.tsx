import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => ({ value: "org-1" })),
  })),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "org-owner-1" } } })),
      getSession: vi.fn(async () => ({ data: { session: { access_token: "test-jwt" } } })),
    },
  })),
}));

import { OrgWarrantiesTable } from "@/features/org-ops/components/org-warranties-table";
import { orgOpsApi, type OrgWarrantyItem } from "@/features/org-ops/api/org-ops.adapter";

describe("MVP-0 Web Warranties Null-Safety (F5: PENDING_TRIGGER & Non-Device Warranties)", () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://gateway.local:8080/api/v1";
  });

  afterEach(() => {
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalBaseUrl;
    }
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders '—' instead of 1970 epoch when startsOn and expiresAt (endsOn) are null on PENDING_TRIGGER warranty", () => {
    const pendingItem = {
      id: "11111111-2222-3333-4444-555555555555",
      deviceOrPart: "Máy lạnh Daikin FTKY25 (Chờ lắp đặt)",
      customerName: "Nguyễn Văn A",
      providerName: "Điện Lạnh HomeCare",
      startsOn: null,
      expiresAt: null,
      status: "PENDING_TRIGGER",
    } as unknown as OrgWarrantyItem;

    render(React.createElement(OrgWarrantiesTable, { initialWarranties: [pendingItem] }));

    expect(screen.getByText("PENDING_TRIGGER")).toBeInTheDocument();
    expect(screen.queryByText(/1970/)).toBeNull();
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getByRole("button", { name: /xem/i }));
    expect(screen.queryByText(/1970/)).toBeNull();
  });

  it("maps backend PENDING_TRIGGER and deviceId=null warranties via orgOpsApi without throwing", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          code: 200,
          message: "OK",
          data: {
            items: [
              {
                id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                deviceId: null,
                ownerName: "Trần Thị B",
                providerName: "HomeCare Store",
                source: "ORDER_AUTO_ACTIVATED",
                notes: "Tụ điện 35uF",
                startsOn: null,
                endsOn: null,
                status: "PENDING_TRIGGER",
              },
            ],
            pagination: { page: 1, size: 20, totalItems: 1, totalPages: 1 },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const page = await orgOpsApi.listWarrantiesPage("org-1", 1, 20);
    await waitFor(() => expect(page.items).toHaveLength(1));

    render(React.createElement(OrgWarrantiesTable, { initialWarranties: page.items }));
    expect(screen.getByText("PENDING_TRIGGER")).toBeInTheDocument();
    expect(screen.queryByText(/1970/)).toBeNull();
  });

  it("renders installation-triggered provenance, manufacturer status, and triggerEvidenceRef in inspector", () => {
    const activeItem: OrgWarrantyItem = {
      id: "22222222-3333-4444-5555-666666666666",
      deviceOrPart: "Máy lạnh Daikin FTKC25",
      customerName: "Lê Văn C",
      providerName: "Điện Lạnh HomeCare",
      startsOn: "2026-11-20",
      expiresAt: "2028-11-20",
      status: "ACTIVE",
      source: "INSTALLATION_COMPLETED",
      manufacturerRegistrationStatus: "NOT_VERIFIED",
      triggerEvidenceRef: "evidence-install-9988",
    };

    render(React.createElement(OrgWarrantiesTable, { initialWarranties: [activeItem] }));

    expect(screen.getByText("Hoàn tất lắp đặt")).toBeInTheDocument();
    expect(screen.getByText("Chưa xác minh hãng")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /xem/i }));
    expect(screen.getByText("evidence-install-9988")).toBeInTheDocument();
  });
});
