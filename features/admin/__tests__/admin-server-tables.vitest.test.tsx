import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
import { OrganizationsTable } from "../components/organizations-table";
import { AdminUsersTable } from "../components/admin-users-table";
import type { Organization } from "@/features/organizations/contracts/organization";
import type { AdminUserItem } from "../api/admin.adapter";

const replaceMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
  }),
}));

const sampleOrg: Organization = {
  id: "org-1",
  name: "Điện Lạnh Minh Tâm",
  type: "SERVICE",
  legalEntityType: "COMPANY",
  status: "PENDING",
  taxCode: "0312345678",
  phone: "0901234567",
  city: "Hà Nội",
  address: "12 Cầu Giấy",
  description: "Sửa chữa điện lạnh",
  createdAt: "2026-01-10T00:00:00Z",
  updatedAt: "2026-01-10T00:00:00Z",
};

const sampleUser: AdminUserItem = {
  id: "user-1",
  fullName: "Nguyễn Văn A",
  email: "a@homecare.vn",
  role: "CUSTOMER",
  status: "ACTIVE",
  createdAt: "2026-01-10T00:00:00Z",
};

describe("Admin server-side tables", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replaceMock.mockReset();
    refreshMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("OrganizationsTable drives status, debounced search, and sort via URL params and resets page=1", () => {
    renderWithQuery(
      <OrganizationsTable
        initialData={[sampleOrg]}
        initialStatus="ALL"
        initialQuery=""
        initialSortBy="createdAt"
        initialSortDir="desc"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Chờ duyệt" }));
    expect(replaceMock).toHaveBeenCalledWith(
      "/admin/organizations?status=PENDING&page=1"
    );

    replaceMock.mockClear();
    fireEvent.change(
      screen.getByPlaceholderText("Tìm tên tổ chức, MST, SĐT, thành phố..."),
      { target: { value: "Gamma" } }
    );
    vi.advanceTimersByTime(310);
    expect(replaceMock).toHaveBeenCalledWith(
      "/admin/organizations?q=Gamma&page=1"
    );

    replaceMock.mockClear();
    fireEvent.change(screen.getByLabelText("Sắp xếp tổ chức"), {
      target: { value: "name:asc" },
    });
    expect(replaceMock).toHaveBeenCalledWith(
      "/admin/organizations?q=Gamma&sortBy=name&sortDir=asc&page=1"
    );
  });

  it("AdminUsersTable drives role, status, sort, and debounced search via URL params and resets page=1", () => {
    renderWithQuery(
      <AdminUsersTable
        initialUsers={[sampleUser]}
        initialQuery=""
        initialRole="ALL"
        initialStatus="ALL"
        initialSortBy="createdAt"
        initialSortDir="desc"
      />
    );

    fireEvent.change(screen.getByLabelText("Lọc theo vai trò"), {
      target: { value: "TECHNICIAN" },
    });
    expect(replaceMock).toHaveBeenCalledWith(
      "/admin/users?role=TECHNICIAN&page=1"
    );

    replaceMock.mockClear();
    fireEvent.change(screen.getByLabelText("Lọc theo trạng thái"), {
      target: { value: "SUSPENDED" },
    });
    expect(replaceMock).toHaveBeenCalledWith(
      "/admin/users?status=SUSPENDED&page=1"
    );

    replaceMock.mockClear();
    fireEvent.change(screen.getByLabelText("Tìm kiếm người dùng"), {
      target: { value: "son.target" },
    });
    vi.advanceTimersByTime(310);
    expect(replaceMock).toHaveBeenCalledWith(
      "/admin/users?q=son.target&page=1"
    );
  });
});
