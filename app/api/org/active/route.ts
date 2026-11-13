import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  ACTIVE_ORG_COOKIE,
  getServerAuthContext,
  getUserMemberships,
} from "@/shared/auth/guards";

const switchOrgSchema = z.object({
  organizationId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ctx = await getServerAuthContext();
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

  const memberships = await getUserMemberships(ctx.isMockMode);
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
