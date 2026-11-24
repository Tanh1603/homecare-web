import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerAuthContext, getUserMemberships, requireOrgContext } from "@/shared/auth/guards";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  listMyMemberships: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("@/features/organizations/api/organizations.server", () => ({
  organizationsServerApi: { listMyMemberships: mocks.listMyMemberships },
}));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: vi.fn() })) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

describe("auth guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-key");
  });

  it("propagates membership lookup errors rather than returning an empty list", async () => {
    const failure = Object.assign(new Error("membership API unavailable"), { status: 503 });
    mocks.listMyMemberships.mockRejectedValue(failure);

    await expect(getUserMemberships()).rejects.toBe(failure);
  });

  it("does not redirect an Organization request to registration after membership lookup fails", async () => {
    const failure = new Error("membership API unavailable");
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: "user-1", email: "person@example.com" } }, error: null })),
        getSession: vi.fn(async () => ({ data: { session: null } })),
      },
    });
    mocks.listMyMemberships.mockRejectedValue(failure);

    await expect(requireOrgContext()).rejects.toBe(failure);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("surfaces an expired Supabase session instead of treating it as a guest", async () => {
    const expired = Object.assign(new Error("JWT expired"), {
      name: "AuthApiError",
      status: 400,
      code: "session_expired",
    });
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null }, error: expired })),
        getSession: vi.fn(async () => ({ data: { session: { access_token: "expired-token" } } })),
      },
    });

    await expect(getServerAuthContext()).rejects.toBe(expired);
  });

  it("still treats a missing Supabase session as a guest", async () => {
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: null },
          error: Object.assign(new Error("Auth session missing!"), { name: "AuthSessionMissingError" }),
        })),
        getSession: vi.fn(async () => ({ data: { session: null } })),
      },
    });

    await expect(getServerAuthContext()).resolves.toBeNull();
  });

  it("surfaces a revoked session that Supabase removes while validating the user", async () => {
    let storedSession: { access_token: string } | null = {
      access_token: "revoked-token",
    };
    const missingSession = Object.assign(new Error("Session is no longer valid"), {
      name: "AuthSessionMissingError",
    });
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getSession: vi.fn(async () => ({ data: { session: storedSession } })),
        getUser: vi.fn(async () => {
          storedSession = null;
          return { data: { user: null }, error: missingSession };
        }),
      },
    });

    await expect(getServerAuthContext()).rejects.toMatchObject({
      status: 401,
      code: "session_expired",
    });
  });
});
