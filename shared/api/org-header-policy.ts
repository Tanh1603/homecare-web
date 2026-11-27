export type HomeCareScope = "personal" | "organization";

const PERSONAL_ONLY_PREFIXES = [
  "/admin",
  "/notifications",
  "/notification-devices",
  "/service-reviews",
  "/households",
  "/devices",
  "/maintenance-schedules",
  "/care-history",
];

function stripQuery(path: string): string {
  const idx = path.indexOf("?");
  const raw = idx >= 0 ? path.slice(0, idx) : path;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

/**
 * Determines whether X-Organization-Id should be attached to an upstream gateway request.
 * Personal-only routes, admin routes, and explicit `personal` scope never inherit the active org cookie.
 */
export function shouldAttachOrganizationHeader(
  method: string,
  pathWithQuery: string,
  explicitScope?: HomeCareScope
): boolean {
  if (explicitScope === "personal") {
    return false;
  }
  if (explicitScope === "organization") {
    return true;
  }

  const upperMethod = method.toUpperCase();
  const path = stripQuery(pathWithQuery);

  if (PERSONAL_ONLY_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return false;
  }

  // /organizations/my, POST /organizations, GET /organizations/{id} are personal/member-lookup;
  // /organizations/current/* and /organizations/{id}/technicians/* require X-Organization-Id.
  if (path === "/organizations" || path.startsWith("/organizations/")) {
    return (
      path === "/organizations/current" ||
      path.startsWith("/organizations/current/") ||
      /^\/organizations\/[^/]+\/technicians(\/|$)/.test(path)
    );
  }

  if (/^\/products\/[^/]+\/reviews(\/|$)/.test(path)) {
    return false;
  }
  if (/^\/providers\/[^/]+\/service-reviews(\/|$)/.test(path)) {
    return false;
  }
  if (/^\/warranties\/[^/]+$/.test(path)) {
    return false;
  }
  if (path === "/technicians/me" || path.startsWith("/technicians/me/")) {
    return false;
  }

  // Personal customer mutations
  if (upperMethod === "POST") {
    if (
      path === "/bookings" ||
      path === "/orders" ||
      /^\/orders\/[^/]+\/payment-attempts$/.test(path) ||
      /^\/orders\/[^/]+\/lines\/[^/]+\/returns$/.test(path)
    ) {
      return false;
    }
  }

  // Public catalog GETs should not implicitly attach X-Organization-Id unless explicitScope === "organization"
  if (upperMethod === "GET") {
    if (
      path === "/services" ||
      path.startsWith("/services/") ||
      path === "/products" ||
      path.startsWith("/products/") ||
      path === "/providers" ||
      path.startsWith("/providers/") ||
      path === "/technicians" ||
      /^\/technicians\/[^/]+$/.test(path)
    ) {
      return false;
    }
  }

  return true;
}
