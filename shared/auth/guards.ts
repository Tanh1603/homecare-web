import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import {
  extractRolesFromJwt,
  hasOrgPortalRole,
  isAdminRole,
} from "@/shared/auth/roles";
import type { OrganizationMembership } from "@/features/organizations/contracts/organization";
import { organizationsMockAdapter } from "@/features/organizations/api/organizations.mock";
import { gatewayFetch } from "@/shared/api/gateway-client";

export const ACTIVE_ORG_COOKIE = "hc_active_org_id";

export interface AuthContext {
  userId: string;
  email: string;
  roles: string[];
  isMockMode: boolean;
}

export interface OrgContext extends AuthContext {
  memberships: OrganizationMembership[];
  activeOrganization: OrganizationMembership;
}

export async function getServerAuthContext(): Promise<AuthContext | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // shortcut: allow local UI preview in mock mode when Supabase env is unset
  if (!url || !key) {
    return {
      userId: "mock-user-1",
      email: "demo@homecare.vn",
      roles: ["ADMIN", "ORGANIZATION"],
      isMockMode: true,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const roles = extractRolesFromJwt(session?.access_token);
  const appRoles = Array.isArray(user.app_metadata?.roles)
    ? (user.app_metadata.roles as string[])
    : [];
  const mergedRoles = Array.from(new Set([...roles, ...appRoles]));

  return {
    userId: user.id,
    email: user.email ?? "",
    roles: mergedRoles,
    isMockMode: false,
  };
}

export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await getServerAuthContext();
  if (!ctx) redirect("/login?next=/admin");
  if (!isAdminRole(ctx.roles)) redirect("/unauthorized");
  return ctx;
}

export async function getUserMemberships(
  isMockMode: boolean
): Promise<OrganizationMembership[]> {
  if (isMockMode || process.env.NEXT_PUBLIC_USE_MOCK_API !== "false") {
    return organizationsMockAdapter.listMyMemberships();
  }
  return gatewayFetch<OrganizationMembership[]>(
    "/organizations/me/memberships"
  );
}

export async function requireOrgContext(): Promise<OrgContext> {
  const ctx = await getServerAuthContext();
  if (!ctx) redirect("/login?next=/org");

  const memberships = await getUserMemberships(ctx.isMockMode);
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
