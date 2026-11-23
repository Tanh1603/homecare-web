import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { z } from "zod";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const src = typeof props.src === "string" ? props.src : "";
    const alt = typeof props.alt === "string" ? props.alt : "";
    return React.createElement("img", { src, alt });
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => React.createElement("a", { href, ...rest }, children),
}));

import * as orgContracts from "@/features/organizations/contracts/organization";
import RegisterOrganizationPage from "@/app/(auth)/register/org/page";
import { OrgProfileForm } from "@/features/organizations/components/org-profile-form";
import { OrganizationsTable } from "@/features/admin/components/organizations-table";

const CAPABILITIES = ["SERVICE", "COMMERCE", "BOTH"] as const;
const LEGAL_ENTITIES = ["COMPANY", "HOUSEHOLD_BUSINESS", "INDIVIDUAL"] as const;

describe("MVP-0 Web Organization Capability vs LegalEntityType (F2 / T1-F2 & T2-F2)", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockRefresh.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("T1-F2-01 & T1-F2-02: separates ORGANIZATION_TYPES (capability) from LEGAL_ENTITY_TYPES and validates all 9 pairs", () => {
    const contractsRecord = orgContracts as unknown as Record<string, unknown>;
    expect(contractsRecord.ORGANIZATION_TYPES).toEqual(["SERVICE", "COMMERCE", "BOTH"]);
    expect(contractsRecord.LEGAL_ENTITY_TYPES).toEqual([
      "COMPANY",
      "HOUSEHOLD_BUSINESS",
      "INDIVIDUAL",
    ]);

    const schema = orgContracts.registerOrganizationSchema as z.ZodTypeAny;
    for (const type of CAPABILITIES) {
      for (const legalEntityType of LEGAL_ENTITIES) {
        const parsed = schema.safeParse({
          name: "Điện Lạnh HomeCare",
          type,
          legalEntityType,
          taxCode: "0109283746",
          phone: "0901234567",
          city: "TP. Hồ Chí Minh",
          address: "123 Nguyễn Văn Linh, Quận 7",
          description: "Dịch vụ và thiết bị gia dụng",
        });
        expect(parsed.success, `Expected pair (${type}, ${legalEntityType}) to pass`).toBe(true);
      }
    }
  });

  it("T2-F2-01 & T2-F2-02: rejects legacy legal values in type, unknown legalEntityType, and invalid taxCode", () => {
    const schema = orgContracts.registerOrganizationSchema as z.ZodTypeAny;

    for (const badType of ["COMPANY", "INDIVIDUAL", "UNKNOWN"]) {
      const res = schema.safeParse({
        name: "Test Org",
        type: badType,
        legalEntityType: "COMPANY",
        phone: "0901234567",
        city: "TP. Hồ Chí Minh",
        address: "123 Đường Số 1",
      });
      expect(res.success).toBe(false);
    }

    const badLegal = schema.safeParse({
      name: "Test Org",
      type: "SERVICE",
      legalEntityType: "PARTNERSHIP",
      phone: "0901234567",
      city: "TP. Hồ Chí Minh",
      address: "123 Đường Số 1",
    });
    expect(badLegal.success).toBe(false);

    const badTax = schema.safeParse({
      name: "Test Org",
      type: "SERVICE",
      legalEntityType: "COMPANY",
      taxCode: "123",
      phone: "0901234567",
      city: "TP. Hồ Chí Minh",
      address: "123 Đường Số 1",
    });
    expect(badTax.success).toBe(false);
  });

  it("T1-F2-03 & T2-F2-03: normalizeOrganization and normalizeMembership preserve type and null legalEntityType", () => {
    const orgNorm = orgContracts.normalizeOrganization({
      id: "org-1",
      name: "Cửa hàng A",
      type: "COMMERCE" as unknown as orgContracts.OrganizationType,
      legalEntityType: null,
      status: "APPROVED",
      phone: "0901234567",
      city: "Hà Nội",
      createdAt: "2026-11-20T00:00:00Z",
      updatedAt: "2026-11-20T00:00:00Z",
    }) as unknown as Record<string, unknown>;

    expect(orgNorm.type).toBe("COMMERCE");
    expect(orgNorm.legalEntityType).toBeNull();

    const memNorm = orgContracts.normalizeMembership({
      organizationId: "org-1",
      organizationName: "Cửa hàng A",
      type: "SERVICE" as unknown as orgContracts.OrganizationType,
      organizationStatus: "APPROVED",
      role: "ORG_OWNER",
      memberRole: "ORG_OWNER",
    }) as unknown as Record<string, unknown>;

    expect(memNorm.type).toBe("SERVICE");
    expect(memNorm.legalEntityType).toBeNull();
  });

  it("T1-F2-04: /register/org renders capability & legalEntityType controls, posts both, and redirects to /org/status", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          code: 201,
          message: "Created",
          data: {
            id: "org-created-1",
            name: "Điện Lạnh Bách Khoa",
            type: "BOTH",
            legalEntityType: "HOUSEHOLD_BUSINESS",
            status: "PENDING",
            phone: "0901234567",
            city: "TP. Hồ Chí Minh",
            address: "456 Lê Lợi, Quận 1",
            createdAt: "2026-11-20T00:00:00Z",
            updatedAt: "2026-11-20T00:00:00Z",
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(React.createElement(RegisterOrganizationPage));

    const typeSelect = container.querySelector<HTMLSelectElement>("select#type");
    const legalSelect = container.querySelector<HTMLSelectElement>("select#legalEntityType");
    expect(typeSelect).not.toBeNull();
    expect(legalSelect).not.toBeNull();

    fireEvent.change(container.querySelector<HTMLInputElement>("input#name")!, {
      target: { value: "Điện Lạnh Bách Khoa" },
    });
    fireEvent.change(typeSelect!, { target: { value: "BOTH" } });
    fireEvent.change(legalSelect!, { target: { value: "HOUSEHOLD_BUSINESS" } });
    fireEvent.change(container.querySelector<HTMLInputElement>("input#phone")!, {
      target: { value: "0901234567" },
    });
    fireEvent.change(container.querySelector<HTMLInputElement>("input#city")!, {
      target: { value: "TP. Hồ Chí Minh" },
    });
    fireEvent.change(container.querySelector<HTMLInputElement>("input#address")!, {
      target: { value: "456 Lê Lợi, Quận 1" },
    });

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/gateway/organizations");
    const sent = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(sent.type).toBe("BOTH");
    expect(sent.legalEntityType).toBe("HOUSEHOLD_BUSINESS");

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/org/status");
    });
  });

  it("T2-F2-04: /register/org displays inline /login?next=/register/org prompt on 401 without redirecting", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: false,
          code: 401,
          errorCode: "UNAUTHENTICATED",
          message: "Unauthorized",
          data: null,
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(React.createElement(RegisterOrganizationPage));
    const typeSelect = container.querySelector<HTMLSelectElement>("select#type");
    const legalSelect = container.querySelector<HTMLSelectElement>("select#legalEntityType");
    expect(typeSelect).not.toBeNull();
    expect(legalSelect).not.toBeNull();

    fireEvent.change(container.querySelector<HTMLInputElement>("input#name")!, {
      target: { value: "Unauth Org" },
    });
    fireEvent.change(typeSelect!, { target: { value: "SERVICE" } });
    fireEvent.change(legalSelect!, { target: { value: "COMPANY" } });
    fireEvent.change(container.querySelector<HTMLInputElement>("input#phone")!, {
      target: { value: "0901234567" },
    });
    fireEvent.change(container.querySelector<HTMLInputElement>("input#address")!, {
      target: { value: "456 Lê Lợi, Quận 1" },
    });

    fireEvent.submit(container.querySelector("form")!);

    const loginLink = await screen.findByRole("link", { name: /đăng nhập tại đây/i });
    expect(loginLink.getAttribute("href")).toBe("/login?next=/register/org");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("T1-F2-05 & T2-F2-05: OrgProfileForm and OrganizationsTable render capability and legalEntityType distinctly with '—' fallback", () => {
    const orgWithLegal = {
      id: "org-1",
      name: "Bách Khoa Service",
      type: "SERVICE" as unknown as orgContracts.OrganizationType,
      legalEntityType: "COMPANY",
      status: "APPROVED",
      phone: "0901234567",
      city: "TP. Hồ Chí Minh",
      address: "12 Nguyễn Huệ",
      createdAt: "2026-11-20T00:00:00Z",
      updatedAt: "2026-11-20T00:00:00Z",
    } as unknown as orgContracts.Organization;

    const orgNullLegal = {
      id: "org-2",
      name: "Dual Partner",
      type: "BOTH" as unknown as orgContracts.OrganizationType,
      legalEntityType: null,
      status: "PENDING",
      phone: "0902222333",
      city: "Hà Nội",
      address: "99 Cầu Giấy",
      createdAt: "2026-11-20T00:00:00Z",
      updatedAt: "2026-11-20T00:00:00Z",
    } as unknown as orgContracts.Organization;

    render(
      React.createElement(OrgProfileForm, {
        organizationId: "org-1",
        organizationName: "Bách Khoa Service",
        organizationStatus: "APPROVED",
        currentUserRole: "ORG_OWNER",
        initialOrganization: orgWithLegal,
      })
    );
    expect(screen.getByText(/Công ty \/ Doanh nghiệp/i)).toBeInTheDocument();

    cleanup();

    render(
      React.createElement(OrgProfileForm, {
        organizationId: "org-2",
        organizationName: "Dual Partner",
        organizationStatus: "PENDING",
        currentUserRole: "ORG_OWNER",
        initialOrganization: orgNullLegal,
      })
    );
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);

    cleanup();

    render(React.createElement(OrganizationsTable, { initialData: [orgWithLegal, orgNullLegal] }));
    expect(screen.getByText("Bách Khoa Service")).toBeInTheDocument();
    expect(screen.getByText("Dual Partner")).toBeInTheDocument();
    expect(screen.getByText(/Công ty \/ Doanh nghiệp/i)).toBeInTheDocument();
  });
});
