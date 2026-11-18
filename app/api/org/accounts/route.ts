import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
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
  const ctx = await getServerAuthContext();
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

  const memberships = await getUserMemberships();
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
