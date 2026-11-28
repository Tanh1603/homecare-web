import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { OrganizationWorkspaceShell } from "@/features/admin/components/organization-workspace-shell";
import { OrganizationOverviewPanel } from "@/features/admin/components/organization-overview-panel";
import { AdminUsersTable } from "@/features/admin/components/admin-users-table";
import { RowActionsMenu } from "@/shared/ui/row-actions-menu";
import type { Organization } from "@/features/organizations/contracts/organization";
import type { WorkspaceSummaryData } from "@/features/admin/api/organization-workspace.server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/organizations/org-12345678/services",
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const sampleOrg: Organization = {
  id: "org-12345678-90ab-cdef-1234-567890abcdef",
  name: "Điện Lạnh Minh Tâm",
  type: "BOTH",
  legalEntityType: "HOUSEHOLD_BUSINESS",
  pendingLegalEntityUpgrade: "COMPANY",
  status: "APPROVED",
  identityVerified: true,
  resubmitCount: 1,
  taxCode: "0312345678",
  phone: "0909123456",
  city: "TP. Hồ Chí Minh",
  address: "123 Nguyễn Văn Trỗi",
  description: "Chuyên bảo dưỡng và sửa chữa điện lạnh.",
  createdAt: "2026-10-01T08:00:00Z",
  updatedAt: "2026-11-01T08:00:00Z",
};

const sampleSummary: WorkspaceSummaryData = {
  technicians: { total: 5, active: 0, error: null },
  services: { total: 4, active: 3, withoutCoverage: 2, items: [], error: null },
  products: { total: 10, active: 9, outOfStock: 1, error: null },
  coverage: {
    uniqueProvinces: 2,
    uniqueWards: 8,
    totalBindings: 10,
    error: null,
  },
};

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("Organization Workspace & Modern Row Actions", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders OrganizationWorkspaceShell with compact header and 6 vertical secondary nav items", () => {
    renderWithQuery(
      <OrganizationWorkspaceShell
        initialOrganization={sampleOrg}
        counts={{ technicians: 5, services: 4, products: 10, coverage: 10 }}
      >
        <div>Nội dung mô-đun</div>
      </OrganizationWorkspaceShell>
    );

    expect(
      screen.getByRole("heading", { name: "Điện Lạnh Minh Tâm" })
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /Tổng quan/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Hồ sơ pháp lý/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Kỹ thuật viên/i })).toBeTruthy();
    const servicesLink = screen.getByRole("link", {
      name: /Dịch vụ cung cấp/i,
    });
    expect(servicesLink.getAttribute("href")).toBe(
      `/admin/organizations/${sampleOrg.id}/services`
    );
    expect(
      screen.getByRole("link", { name: /Sản phẩm kinh doanh/i })
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Khu vực phủ sóng/i })
    ).toBeTruthy();
  });

  it("prioritizes operational alerts and direct-link KPIs in OrganizationOverviewPanel", () => {
    renderWithQuery(
      <OrganizationOverviewPanel
        organization={sampleOrg}
        summary={sampleSummary}
      />
    );

    expect(
      screen.getByText(/Có yêu cầu nâng cấp loại hình pháp lý/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/2 dịch vụ đang bật chưa cấu hình khu vực phủ sóng/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/Chưa có kỹ thuật viên đang hoạt động/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/1 sản phẩm đang bán đã hết tồn kho khả dụng/i)
    ).toBeTruthy();

    expect(screen.getByText("0 / 5")).toBeTruthy();
    expect(screen.getByText("3 / 4")).toBeTruthy();
    expect(screen.getByText("9 / 10")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
  });

  it("renders RowActionsMenu cleanly with single overflow trigger and optional primary action", () => {
    render(
      <RowActionsMenu
        ariaLabel="Thao tác cho hàng thử nghiệm"
        primaryAction={{ label: "Duyệt", onClick: vi.fn() }}
        groups={[
          {
            id: "main",
            items: [
              { id: "inspect", label: "Xem nhanh", onSelect: vi.fn() },
              { id: "hidden-item", label: "Ẩn", hidden: true },
            ],
          },
        ]}
      />
    );

    expect(screen.getByRole("button", { name: "Duyệt" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Thao tác cho hàng thử nghiệm" })
    ).toBeTruthy();
  });

  it("omits ADMIN from AdminUsersTable role filter and displays Vietnamese role labels", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <AdminUsersTable
          initialUsers={[
            {
              id: "u-1",
              fullName: "Nguyễn Văn An",
              email: "an@example.com",
              role: "TECHNICIAN",
              status: "ACTIVE",
              createdAt: "2026-10-01T08:00:00Z",
            },
          ]}
        />
      </QueryClientProvider>
    );

    const roleSelect = screen.getByLabelText("Lọc theo vai trò");
    const optionValues = Array.from(roleSelect.querySelectorAll("option")).map(
      (opt) => opt.getAttribute("value")
    );
    expect(optionValues).not.toContain("ADMIN");
    expect(optionValues).toEqual([
      "ALL",
      "ORGANIZATION",
      "TECHNICIAN",
      "CUSTOMER",
    ]);
    expect(screen.getAllByText("Kỹ thuật viên").length).toBeGreaterThanOrEqual(
      2
    );
    expect(
      screen.getByRole("button", {
        name: "Mở menu thao tác cho an@example.com",
      })
    ).toBeTruthy();
  });
});
