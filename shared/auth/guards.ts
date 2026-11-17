import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import {
  extractRolesFromJwt,
  hasOrgPortalRole,
  isAdminRole,
} from "@/shared/auth/roles";
import {
  normalizeMembership,
  type OrganizationMembership,
} from "@/features/organizations/contracts/organization";
import { gatewayFetch } from "@/shared/api/gateway-client";
import { extractPageItems } from "@/shared/api/api-envelope";

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
  };
}

export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await getServerAuthContext();
  if (!ctx) redirect("/login?next=/admin");
  if (!isAdminRole(ctx.roles)) redirect("/unauthorized");
  return ctx;
}

export async function getUserMemberships(): Promise<OrganizationMembership[]> {
  try {
    const data = await gatewayFetch<
      { items?: Record<string, unknown>[] } | Record<string, unknown>[]
    >("/organizations/my?page=1&size=100", {
      organizationId: null,
      scope: "personal",
    });
    return extractPageItems(data).map(normalizeMembership);
  } catch {
    return [];
  }
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
