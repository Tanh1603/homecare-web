import assert from "node:assert/strict";
import test from "node:test";
import {
  extractRolesFromJwt,
  hasOrgPortalRole,
  isAdminRole,
} from "../auth/roles.ts";
import {
  extractPageItems,
  GatewayApiError,
  unwrapApiResponse,
} from "../api/api-envelope.ts";
import {
  normalizeMembership,
  normalizeOrganization,
  registerOrganizationSchema,
} from "../../features/organizations/contracts/organization.ts";

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

test("extractPageItems handles both arrays and Spring PageResponse envelopes", () => {
  assert.deepEqual(extractPageItems([{ id: 1 }, { id: 2 }]), [
    { id: 1 },
    { id: 2 },
  ]);
  assert.deepEqual(
    extractPageItems({ items: [{ id: "a" }], page: 0, size: 20 }),
    [{ id: "a" }]
  );
  assert.deepEqual(extractPageItems(null), []);
});

test("normalizeOrganization and normalizeMembership align Spring Boot fields", () => {
  const org = normalizeOrganization({
    id: "org-100",
    name: "Điện Lạnh Thành Đạt",
    type: "COMPANY",
    status: "REJECTED",
    rejectReason: "Thiếu MST",
    phone: "0909123456",
    city: "Hà Nội",
    createdAt: "2026-11-15T00:00:00Z",
    updatedAt: "2026-11-15T00:00:00Z",
  });
  assert.equal(org.type, "COMPANY");
  assert.equal(org.city, "Hà Nội");
  assert.equal(org.rejectReason, "Thiếu MST");
  assert.equal(org.rejectionReason, "Thiếu MST");

  const membership = normalizeMembership({
    organizationId: "org-100",
    organizationName: "Điện Lạnh Thành Đạt",
    type: "COMPANY",
    organizationStatus: "APPROVED",
    role: "ORG_OWNER",
    memberStatus: "ACTIVE",
  });
  assert.equal(membership.role, "ORG_OWNER");
  assert.equal(membership.memberRole, "ORG_OWNER");
});

test("registerOrganizationSchema validates backend type and city requirements", () => {
  const valid = registerOrganizationSchema.safeParse({
    name: "Trung Tâm Sửa Chữa An Phát",
    type: "HOUSEHOLD_BUSINESS",
    taxCode: "",
    phone: "0912345678",
    city: "Đà Nẵng",
    address: "15 Nguyễn Văn Linh, Hải Châu",
    description: "Chuyên điều hòa & máy giặt",
  });
  assert.equal(valid.success, true);

  const missingCity = registerOrganizationSchema.safeParse({
    name: "Trung Tâm Sửa Chữa An Phát",
    type: "COMPANY",
    phone: "0912345678",
    city: "",
    address: "15 Nguyễn Văn Linh, Hải Châu",
  });
  assert.equal(missingCity.success, false);
});
