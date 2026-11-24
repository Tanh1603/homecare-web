import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { GatewayApiError } from "@/shared/api/api-envelope";
import { getServerAuthContext, getUserMemberships } from "@/shared/auth/guards";
import {
  AccountProvisioningError,
  provisionSupabaseAccount,
} from "@/features/organizations/api/account-provisioning.server";

const MANAGE_ROLES = new Set(["ORG_OWNER", "ORG_ADMIN", "OWNER", "MANAGER"]);

const createAccountSchema = z.object({
  organizationId: z.string().uuid("organizationId không hợp lệ"),
  email: z.string().trim().email("Email không hợp lệ"),
  fullName: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
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
  const parsed = createAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
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
  const membership = memberships.find(
    (m) => m.organizationId === parsed.data.organizationId
  );
  if (!membership || !MANAGE_ROLES.has(membership.role)) {
    return NextResponse.json(
      { error: "Bạn không có quyền tạo tài khoản cho tổ chức này" },
      { status: 403 }
    );
  }

  try {
    const account = await provisionSupabaseAccount(
      {
        email: parsed.data.email,
        fullName: parsed.data.fullName,
        password: parsed.data.password,
      },
      {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        secretKey: process.env.SUPABASE_SECRET_KEY,
      }
    );
    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    if (err instanceof AccountProvisioningError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Không thể tạo tài khoản Supabase" },
      { status: 500 }
    );
  }
}
