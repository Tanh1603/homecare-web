import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { GatewayApiError } from "@/shared/api/api-envelope";
import {
  ACTIVE_ORG_COOKIE,
  getServerAuthContext,
  getUserMemberships,
} from "@/shared/auth/guards";

const switchOrgSchema = z.object({
  organizationId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = await getServerAuthContext();
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? Number(error.status)
        : undefined;
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : undefined;
    const expiredSession = [
      "session_expired",
      "refresh_token_not_found",
      "refresh_token_already_used",
    ].includes(code ?? "");
    const responseStatus =
      status === 401 || expiredSession
        ? 401
        : status === 403
          ? 403
          : status !== undefined && status >= 500
            ? status
            : 502;
    const message = responseStatus === 401
      ? "Unauthorized"
      : responseStatus === 403
        ? "Forbidden"
        : "Unable to validate authentication";
    return NextResponse.json({ error: message }, { status: responseStatus });
  }
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = switchOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid organizationId" },
      { status: 400 }
    );
  }

  let memberships;
  try {
    memberships = await getUserMemberships();
  } catch (error) {
    const status = error instanceof GatewayApiError ? error.status : 502;
    const message = status === 401
      ? "Unauthorized"
      : status === 403
        ? "Forbidden"
        : "Unable to verify organization membership";
    return NextResponse.json({ error: message }, { status });
  }
  const target = memberships.find(
    (m) => m.organizationId === parsed.data.organizationId
  );

  if (!target) {
    return NextResponse.json(
      { error: "Forbidden: not a member of this organization" },
      { status: 403 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, target.organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ activeOrganization: target });
}
