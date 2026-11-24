import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { OrganizationMembership } from "@/features/organizations/contracts/organization";
import { GatewayApiError } from "@/shared/api/api-envelope";
import HomePage from "@/app/page";

const mocks = vi.hoisted(() => ({
  getServerAuthContext: vi.fn(),
  listMyMemberships: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/shared/auth/guards", () => ({
  getServerAuthContext: mocks.getServerAuthContext,
}));
vi.mock("@/features/organizations/api/organizations.server", () => ({
  organizationsServerApi: { listMyMemberships: mocks.listMyMemberships },
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/shared/ui/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

const auth = (roles: string[] = []) => ({
  userId: "user-1",
  email: "person@example.com",
  roles,
});

function membership(
  organizationStatus: OrganizationMembership["organizationStatus"]
): OrganizationMembership {
  return {
    organizationId: "org-1",
    organizationName: "HomeCare Partner",
    organizationStatus,
    role: "ORG_OWNER",
    memberRole: "ORG_OWNER",
  };
}

async function renderHome() {
  const page = await HomePage();
  render(page);
}

describe("role-aware home entry", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("keeps the public landing page for a guest without requesting memberships", async () => {
    mocks.getServerAuthContext.mockResolvedValue(null);

    await renderHome();

    expect(screen.getByRole("link", { name: /Đăng nhập/i })).toHaveAttribute(
      "href",
      "/login"
    );
    expect(mocks.listMyMemberships).not.toHaveBeenCalled();
  });

  it("prioritizes Admin over an Organization and skips membership lookup", async () => {
    mocks.getServerAuthContext.mockResolvedValue(auth(["ADMIN"]));
    mocks.listMyMemberships.mockResolvedValue([membership("APPROVED")]);

    await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT:/admin");

    expect(mocks.listMyMemberships).not.toHaveBeenCalled();
  });

  it.each(["APPROVED", "PENDING", "REJECTED", "SUSPENDED", "BANNED"] as const)(
    "sends an Organization with %s status to /org for centralized status routing",
    async (status) => {
      mocks.getServerAuthContext.mockResolvedValue(auth(["CUSTOMER"]));
      mocks.listMyMemberships.mockResolvedValue([membership(status)]);

      await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT:/org");
      expect(mocks.listMyMemberships).toHaveBeenCalledOnce();
    }
  );

  it("shows only the registration invitation and an accessible sign-out action for an authenticated user without Organizations", async () => {
    mocks.getServerAuthContext.mockResolvedValue(auth(["CUSTOMER"]));
    mocks.listMyMemberships.mockResolvedValue([]);

    await renderHome();

    expect(screen.getByRole("link", { name: /Đăng ký tổ chức/i })).toHaveAttribute(
      "href",
      "/register/org"
    );
    expect(screen.getByRole("button", { name: /Đăng xuất/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Đăng nhập/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /quản trị/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Đăng ký tổ chức/i })).toHaveLength(1);
  });

  it.each([
    [401, "Phiên đăng nhập đã hết hạn"],
    [403, "không có quyền xem thông tin tổ chức"],
    [502, "Không thể kết nối"],
    [500, "máy chủ HomeCare đang gặp sự cố"],
  ])("does not invite registration when membership lookup returns HTTP %i", async (status, message) => {
    mocks.getServerAuthContext.mockResolvedValue(auth(["CUSTOMER"]));
    mocks.listMyMemberships.mockRejectedValue(
      new GatewayApiError({ message: "membership request failed", status })
    );

    await renderHome();

    expect(screen.getByText(new RegExp(message, "i"))).toBeInTheDocument();
    if (status === 401) {
      expect(screen.getByRole("link", { name: /Đăng nhập lại/i })).toHaveAttribute("href", "/login");
    }
    expect(screen.queryByRole("link", { name: /Đăng ký tổ chức/i })).not.toBeInTheDocument();
  });

  it("shows a retryable error for a network failure instead of an empty-membership invitation", async () => {
    mocks.getServerAuthContext.mockResolvedValue(auth(["CUSTOMER"]));
    mocks.listMyMemberships.mockRejectedValue(new TypeError("fetch failed"));

    await renderHome();

    expect(screen.getByText(/Không thể kết nối/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Thử lại/i })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: /Đăng ký tổ chức/i })).not.toBeInTheDocument();
  });

  it("surfaces an expired auth session instead of treating it as a guest or empty membership", async () => {
    mocks.getServerAuthContext.mockRejectedValue(
      Object.assign(new Error("Session expired"), {
        name: "AuthApiError",
        status: 400,
        code: "session_expired",
      })
    );

    await renderHome();

    expect(screen.getByText(/Phiên đăng nhập đã hết hạn/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Đăng nhập lại/i })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("link", { name: /Đăng ký đối tác/i })).not.toBeInTheDocument();
    expect(mocks.listMyMemberships).not.toHaveBeenCalled();
  });

});
