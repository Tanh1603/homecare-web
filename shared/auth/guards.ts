import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import {
  extractRolesFromJwt,
  hasOrgPortalRole,
  isAdminRole,
} from "@/shared/auth/roles";
import {
  type OrganizationMembership,
} from "@/features/organizations/contracts/organization";
import { organizationsServerApi } from "@/features/organizations/api/organizations.server";

export const ACTIVE_ORG_COOKIE = "hc_active_org_id";

export interface AuthContext {
  userId: string;
  email: string;
  roles: string[];
}

export interface OrgContext extends AuthContext {
  memberships: OrganizationMembership[];
  activeOrganization: OrganizationMembership;
}

export async function getServerAuthContext(): Promise<AuthContext | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError && sessionError.name !== "AuthSessionMissingError") {
    throw sessionError;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") throw error;
  if (!user) {
    if (session) {
      throw Object.assign(
        new Error("Phiên đăng nhập đã hết hạn hoặc không còn hợp lệ"),
        { status: 401, code: "session_expired" }
      );
    }
    return null;
  }

  const roles = extractRolesFromJwt(session?.access_token);
  const appRoles = Array.isArray(user.app_metadata?.roles)
    ? (user.app_metadata.roles as string[])
    : [];
  const mergedRoles = Array.from(new Set([...roles, ...appRoles]));

  return {
    userId: user.id,
    email: user.email ?? "",
    roles: mergedRoles,
  };
}

export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await getServerAuthContext();
  if (!ctx) redirect("/login?next=/admin");
  if (!isAdminRole(ctx.roles)) redirect("/unauthorized");
  return ctx;
}

export async function getUserMemberships(): Promise<OrganizationMembership[]> {
  return organizationsServerApi.listMyMemberships();
}

export async function requireOrgContext(): Promise<OrgContext> {
  const ctx = await getServerAuthContext();
  if (!ctx) redirect("/login?next=/org");

  const memberships = await getUserMemberships();
  if (memberships.length === 0 && !hasOrgPortalRole(ctx.roles)) {
    redirect("/register/org");
  }
  if (memberships.length === 0) {
    redirect("/unauthorized");
  }

  const cookieStore = await cookies();
  const requestedOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const activeOrganization =
    memberships.find((m) => m.organizationId === requestedOrgId) ??
    memberships[0];

  return {
    ...ctx,
    memberships,
    activeOrganization,
  };
}
