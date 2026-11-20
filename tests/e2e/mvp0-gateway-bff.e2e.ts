import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { shouldAttachOrganizationHeader } from "@/shared/api/org-header-policy";

const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockCookieGet = vi.fn();

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
      getSession: mockGetSession,
    },
  })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockCookieGet,
  })),
}));

import { GET, PATCH, POST } from "@/app/api/gateway/[...path]/route";

function makeNextRequest(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {}
): NextRequest {
  const req = new Request(url, {
    method: init.method ?? "GET",
    headers: init.headers,
    body: init.body,
  });
  const parsedUrl = new URL(url);
  return Object.assign(req, {
    nextUrl: parsedUrl,
  }) as unknown as NextRequest;
}

describe("MVP-0 Gateway BFF Proxy & X-Organization-Id Policy", () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://gateway.local:8080/api/v1";
    mockGetUser.mockReset();
    mockGetSession.mockReset();
    mockCookieGet.mockReset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalBaseUrl;
    }
    vi.unstubAllGlobals();
  });

  it("enforces shouldAttachOrganizationHeader across personal vs organization MVP-0 routes", () => {
    expect(shouldAttachOrganizationHeader("POST", "/organizations")).toBe(false);
    expect(shouldAttachOrganizationHeader("GET", "/organizations/my")).toBe(false);
    expect(shouldAttachOrganizationHeader("GET", "/organizations/org-1")).toBe(false);
    expect(shouldAttachOrganizationHeader("GET", "/admin/organizations")).toBe(false);
    expect(shouldAttachOrganizationHeader("GET", "/households")).toBe(false);
    expect(shouldAttachOrganizationHeader("GET", "/devices/dev-1")).toBe(false);
    expect(shouldAttachOrganizationHeader("GET", "/warranties/war-1")).toBe(false);
    expect(shouldAttachOrganizationHeader("POST", "/orders")).toBe(false);
    expect(shouldAttachOrganizationHeader("POST", "/bookings")).toBe(false);

    expect(shouldAttachOrganizationHeader("PATCH", "/organizations/current")).toBe(true);
    expect(shouldAttachOrganizationHeader("POST", "/products")).toBe(true);
    expect(
      shouldAttachOrganizationHeader("POST", "/orders/o1/lines/l1/fulfillment")
    ).toBe(true);
    expect(
      shouldAttachOrganizationHeader("GET", "/warranties?organizationId=org-1")
    ).toBe(true);
    expect(shouldAttachOrganizationHeader("GET", "/products", "organization")).toBe(true);
    expect(shouldAttachOrganizationHeader("PATCH", "/organizations/current", "personal")).toBe(
      false
    );
  });

  it("returns 401 UNAUTHENTICATED without calling upstream when Supabase user is absent", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(
      makeNextRequest("http://localhost:3000/api/gateway/organizations", {
        method: "POST",
        body: JSON.stringify({ name: "Test Org", type: "SERVICE" }),
      }),
      { params: Promise.resolve({ path: ["organizations"] }) }
    );

    expect(res.status).toBe(401);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.success).toBe(false);
    expect(json.errorCode).toBe("UNAUTHENTICATED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("strips X-Organization-Id on POST /organizations even when hc_active_org_id cookie is set", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "jwt-abc" } } });
    mockCookieGet.mockReturnValue({ value: "org-cookie-999" });

    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          code: 201,
          message: "Created",
          data: { id: "org-new", type: "SERVICE", legalEntityType: "COMPANY" },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(
      makeNextRequest("http://localhost:3000/api/gateway/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Correlation-Id": "corr-123" },
        body: JSON.stringify({
          name: "Tech Partner",
          type: "SERVICE",
          legalEntityType: "COMPANY",
        }),
      }),
      { params: Promise.resolve({ path: ["organizations"] }) }
    );

    expect(res.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [targetUrl, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(targetUrl).toBe("http://gateway.local:8080/api/v1/organizations");
    const forwardedHeaders = init.headers as Headers;
    expect(forwardedHeaders.get("Authorization")).toBe("Bearer jwt-abc");
    expect(forwardedHeaders.get("X-Correlation-Id")).toBe("corr-123");
    expect(forwardedHeaders.get("X-Organization-Id")).toBeNull();
  });

  it("attaches X-Organization-Id and forwards If-Match & ETag on PATCH /organizations/current", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "jwt-abc" } } });
    mockCookieGet.mockReturnValue({ value: "org-cookie-777" });

    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ success: true, code: 200, data: { id: "org-cookie-777" } }), {
        status: 200,
        headers: { "Content-Type": "application/json", ETag: '"4"' },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await PATCH(
      makeNextRequest("http://localhost:3000/api/gateway/organizations/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "If-Match": '"3"' },
        body: JSON.stringify({ name: "Updated Org" }),
      }),
      { params: Promise.resolve({ path: ["organizations", "current"] }) }
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("etag")).toBe('"4"');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const forwardedHeaders = init.headers as Headers;
    expect(forwardedHeaders.get("X-Organization-Id")).toBe("org-cookie-777");
    expect(forwardedHeaders.get("If-Match")).toBe('"3"');
  });

  it("forwards Idempotency-Key on POST /orders without X-Organization-Id and passes through 400 errors", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "jwt-abc" } } });
    mockCookieGet.mockReturnValue({ value: "org-cookie-777" });

    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: false,
          code: 400,
          errorCode: "MALFORMED_REQUEST",
          message: "Invalid enum",
          data: null,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(
      makeNextRequest("http://localhost:3000/api/gateway/orders", {
        method: "POST",
        headers: { "Idempotency-Key": "idem-order-1" },
        body: JSON.stringify({ items: [] }),
      }),
      { params: Promise.resolve({ path: ["orders"] }) }
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.errorCode).toBe("MALFORMED_REQUEST");
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const forwardedHeaders = init.headers as Headers;
    expect(forwardedHeaders.get("Idempotency-Key")).toBe("idem-order-1");
    expect(forwardedHeaders.get("X-Organization-Id")).toBeNull();
  });

  it("returns 502 GATEWAY_UNAVAILABLE when upstream fetch throws", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "jwt-abc" } } });
    mockCookieGet.mockReturnValue(undefined);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    const res = await GET(
      makeNextRequest("http://localhost:3000/api/gateway/locations/provinces?q=Ha"),
      { params: Promise.resolve({ path: ["locations", "provinces"] }) }
    );

    expect(res.status).toBe(502);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.success).toBe(false);
    expect(json.errorCode).toBe("GATEWAY_UNAVAILABLE");
  });
});
