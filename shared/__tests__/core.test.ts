import assert from "node:assert/strict";
import test from "node:test";
import {
  extractRolesFromJwt,
  hasOrgPortalRole,
  isAdminRole,
} from "../auth/roles.ts";
import { GatewayApiError, unwrapApiResponse } from "../api/api-envelope.ts";

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString(
    "base64url"
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

test("extractRolesFromJwt merges roles from app_metadata, user_roles, and realm_access", () => {
  const token = makeJwt({
    user_roles: ["CUSTOMER"],
    app_metadata: { roles: ["ORGANIZATION", "ADMIN"] },
    realm_access: { roles: ["PROVIDER"] },
  });

  const roles = extractRolesFromJwt(token);
  assert.deepEqual(roles.sort(), [
    "ADMIN",
    "CUSTOMER",
    "ORGANIZATION",
    "PROVIDER",
  ]);
  assert.equal(isAdminRole(roles), true);
  assert.equal(hasOrgPortalRole(roles), true);
});

test("extractRolesFromJwt returns empty array on malformed tokens", () => {
  assert.deepEqual(extractRolesFromJwt(null), []);
  assert.deepEqual(extractRolesFromJwt("not-a-jwt"), []);
});

test("unwrapApiResponse returns data on success and throws GatewayApiError on failure", () => {
  const ok = unwrapApiResponse({
    success: true,
    code: 200,
    message: "OK",
    data: { id: "123" },
    timestamp: "2026-11-13T00:00:00Z",
  });
  assert.deepEqual(ok, { id: "123" });

  assert.throws(
    () =>
      unwrapApiResponse({
        success: false,
        code: 400,
        errorCode: "VALIDATION_FAILED",
        message: "Invalid input",
        data: null,
        timestamp: "2026-11-13T00:00:00Z",
        errors: [{ field: "taxCode", message: "Required" }],
      }),
    (err: unknown) =>
      err instanceof GatewayApiError &&
      err.status === 400 &&
      err.errorCode === "VALIDATION_FAILED" &&
      err.fieldErrors?.length === 1
  );
});
