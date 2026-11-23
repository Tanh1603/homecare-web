export const WEB_ADMIN_ROLE = "ADMIN" as const;
export const WEB_ORG_ROLES = [
  "ORGANIZATION",
  "PROVIDER",
  "MERCHANT",
] as const;

export type WebRole = typeof WEB_ADMIN_ROLE | (typeof WEB_ORG_ROLES)[number];

interface JwtPayload {
  sub?: string;
  email?: string;
  user_roles?: string[];
  roles?: string[];
  app_metadata?: {
    user_roles?: string[];
    roles?: string[];
  };
  realm_access?: {
    roles?: string[];
  };
}

function decodeBase64Url(segment: string): string {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64").toString("utf8");
  }
  return atob(base64);
}

/**
 * Mirrors JwtRoleParser.kt in homecare-mobile so web and mobile resolve
 * Supabase/Keycloak JWT claims identically.
 */
export function extractRolesFromJwt(token?: string | null): string[] {
  if (!token) return [];
  const parts = token.split(".");
  if (parts.length < 2) return [];

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as JwtPayload;
    const roles = new Set<string>();
    payload.user_roles?.forEach((r) => roles.add(r));
    payload.roles?.forEach((r) => roles.add(r));
    payload.app_metadata?.user_roles?.forEach((r) => roles.add(r));
    payload.app_metadata?.roles?.forEach((r) => roles.add(r));
    payload.realm_access?.roles?.forEach((r) => roles.add(r));
    return Array.from(roles);
  } catch {
    return [];
  }
}

export function isAdminRole(roles: string[]): boolean {
  return roles.includes(WEB_ADMIN_ROLE);
}

export function hasOrgPortalRole(roles: string[]): boolean {
  return roles.some((r) =>
    (WEB_ORG_ROLES as readonly string[]).includes(r)
  );
}
