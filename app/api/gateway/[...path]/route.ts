import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import {
  shouldAttachOrganizationHeader,
  type HomeCareScope,
} from "@/shared/api/org-header-policy";

const ACTIVE_ORG_COOKIE = "hc_active_org_id";

async function proxyToGateway(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const targetPath = `/${path.join("/")}${request.nextUrl.search}`;
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";
  const targetUrl = `${baseUrl.replace(/\/$/, "")}${targetPath}`;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        code: 401,
        errorCode: "UNAUTHENTICATED",
        message: "Unauthorized",
        data: null,
      },
      { status: 401 }
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  const headers = new Headers();
  headers.set(
    "Content-Type",
    request.headers.get("content-type") || "application/json"
  );
  headers.set(
    "X-Correlation-Id",
    request.headers.get("x-correlation-id") ||
      `web-${crypto.randomUUID()}`.slice(0, 64)
  );
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  const rawScope = request.headers.get("x-homecare-scope")?.toLowerCase();
  const explicitScope: HomeCareScope | undefined =
    rawScope === "personal" || rawScope === "organization" ? rawScope : undefined;
  const attachOrg = shouldAttachOrganizationHeader(
    request.method,
    targetPath,
    explicitScope
  );
  const explicitOrgId = request.headers.get("x-organization-id");
  const resolvedOrgId = attachOrg ? explicitOrgId || activeOrgId : undefined;
  if (resolvedOrgId) {
    headers.set("X-Organization-Id", resolvedOrgId);
  }
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) {
    headers.set("Idempotency-Key", idempotencyKey);
  }
  const ifMatch = request.headers.get("if-match");
  if (ifMatch) {
    headers.set("If-Match", ifMatch);
  }

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    const text = await upstream.text();
    const responseHeaders = new Headers({
      "Content-Type":
        upstream.headers.get("content-type") || "application/json",
    });
    for (const headerName of ["etag", "x-correlation-id", "content-disposition"]) {
      const val = upstream.headers.get(headerName);
      if (val) {
        responseHeaders.set(headerName, val);
      }
    }
    return new NextResponse(text, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: 502,
        errorCode: "GATEWAY_UNAVAILABLE",
        message: "Không thể kết nối tới HomeCare API Gateway",
        data: null,
        timestamp: new Date().toISOString(),
      },
      { status: 502 }
    );
  }
}

export const GET = proxyToGateway;
export const POST = proxyToGateway;
export const PUT = proxyToGateway;
export const PATCH = proxyToGateway;
export const DELETE = proxyToGateway;
