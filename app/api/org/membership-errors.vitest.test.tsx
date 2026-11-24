import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { GatewayApiError } from "@/shared/api/api-envelope";
import { POST as setActiveOrganization } from "@/app/api/org/active/route";
import { POST as createOrganizationAccount } from "@/app/api/org/accounts/route";

const mocks = vi.hoisted(() => ({
  getServerAuthContext: vi.fn(),
  getUserMemberships: vi.fn(),
  provisionSupabaseAccount: vi.fn(),
}));

vi.mock("@/shared/auth/guards", () => ({
  getServerAuthContext: mocks.getServerAuthContext,
  getUserMemberships: mocks.getUserMemberships,
  ACTIVE_ORG_COOKIE: "hc_active_org_id",
}));
vi.mock("@/features/organizations/api/account-provisioning.server", () => ({
  AccountProvisioningError: class AccountProvisioningError extends Error {},
  provisionSupabaseAccount: mocks.provisionSupabaseAccount,
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: vi.fn(), get: vi.fn() })),
}));

const errors = [
  [new GatewayApiError({ message: "Expired", status: 401 }), 401],
  [new GatewayApiError({ message: "Forbidden", status: 403 }), 403],
  [new GatewayApiError({ message: "Unavailable", status: 503 }), 503],
  [new TypeError("fetch failed"), 502],
] as const;

const authErrors = [
  [Object.assign(new Error("Session expired"), { status: 400, code: "session_expired" }), 401],
  [Object.assign(new Error("Forbidden"), { status: 403 }), 403],
  [Object.assign(new Error("Auth service unavailable"), { status: 503 }), 503],
  [new TypeError("fetch failed"), 502],
] as const;

function request(url: string, body: unknown): NextRequest {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("organization membership API errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerAuthContext.mockResolvedValue({
      userId: "user-1",
      email: "person@example.com",
      roles: ["ORGANIZATION"],
    });
  });

  it.each(errors)("preserves membership error status in active-organization API", async (error, status) => {
    mocks.getUserMemberships.mockRejectedValue(error);

    const response = await setActiveOrganization(
      request("http://localhost/api/org/active", { organizationId: "org-1" })
    );

    expect(response.status).toBe(status);
  });

  it.each(errors)("preserves membership error status in account API", async (error, status) => {
    mocks.getUserMemberships.mockRejectedValue(error);

    const response = await createOrganizationAccount(
      request("http://localhost/api/org/accounts", {
        organizationId: "6b80a8f8-4a9d-4d79-8a53-3dad8db96af1",
        email: "staff@example.com",
        fullName: "Staff Member",
        password: "secret1",
      })
    );

    expect(response.status).toBe(status);
  });

  it.each(authErrors)("maps authentication errors to the correct status in active-organization API", async (error, status) => {
    mocks.getServerAuthContext.mockRejectedValue(error);

    const response = await setActiveOrganization(
      request("http://localhost/api/org/active", { organizationId: "org-1" })
    );

    expect(response.status).toBe(status);
    expect(mocks.getUserMemberships).not.toHaveBeenCalled();
  });

  it.each(authErrors)("maps authentication errors to the correct status in account API", async (error, status) => {
    mocks.getServerAuthContext.mockRejectedValue(error);

    const response = await createOrganizationAccount(
      request("http://localhost/api/org/accounts", {
        organizationId: "6b80a8f8-4a9d-4d79-8a53-3dad8db96af1",
        email: "staff@example.com",
        fullName: "Staff Member",
        password: "secret1",
      })
    );

    expect(response.status).toBe(status);
    expect(mocks.getUserMemberships).not.toHaveBeenCalled();
  });
});
