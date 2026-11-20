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
  LEGAL_ENTITY_TYPES,
  LEGAL_ENTITY_TYPE_LABELS,
  ORGANIZATION_TYPES,
  ORGANIZATION_TYPE_LABELS,
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

test("ORGANIZATION_TYPES and LEGAL_ENTITY_TYPES are separated with labels", () => {
  assert.deepEqual([...ORGANIZATION_TYPES], ["SERVICE", "COMMERCE", "BOTH"]);
  assert.deepEqual(
    [...LEGAL_ENTITY_TYPES],
    ["COMPANY", "HOUSEHOLD_BUSINESS", "INDIVIDUAL"]
  );
  assert.equal(LEGAL_ENTITY_TYPE_LABELS.COMPANY, "Công ty / Doanh nghiệp");
  assert.equal(LEGAL_ENTITY_TYPE_LABELS.HOUSEHOLD_BUSINESS, "Hộ kinh doanh");
  assert.equal(LEGAL_ENTITY_TYPE_LABELS.INDIVIDUAL, "Cá nhân hành nghề");
  assert.ok(ORGANIZATION_TYPE_LABELS.SERVICE.length > 0);
  assert.ok(ORGANIZATION_TYPE_LABELS.COMMERCE.length > 0);
  assert.ok(ORGANIZATION_TYPE_LABELS.BOTH.length > 0);
});

test("normalizeOrganization and normalizeMembership align Spring Boot fields", () => {
  const org = normalizeOrganization({
    id: "org-100",
    name: "Điện Lạnh Thành Đạt",
    type: "COMMERCE",
    legalEntityType: "COMPANY",
    status: "REJECTED",
    rejectReason: "Thiếu MST",
    phone: "0909123456",
    city: "Hà Nội",
    createdAt: "2026-11-15T00:00:00Z",
    updatedAt: "2026-11-15T00:00:00Z",
  });
  assert.equal(org.type, "COMMERCE");
  assert.equal(org.legalEntityType, "COMPANY");
  assert.equal(org.city, "Hà Nội");
  assert.equal(org.rejectReason, "Thiếu MST");
  assert.equal(org.rejectionReason, "Thiếu MST");

  const legacyOrg = normalizeOrganization({
    id: "org-legacy",
    name: "Legacy Org",
    type: "COMPANY" as unknown as "SERVICE",
    legalEntityType: null,
    status: "APPROVED",
    phone: "0909123456",
    city: "Hà Nội",
    createdAt: "2026-11-15T00:00:00Z",
    updatedAt: "2026-11-15T00:00:00Z",
  });
  assert.equal(legacyOrg.type, "SERVICE");
  assert.equal(legacyOrg.legalEntityType, null);

  const membership = normalizeMembership({
    organizationId: "org-100",
    organizationName: "Điện Lạnh Thành Đạt",
    type: "BOTH",
    legalEntityType: "HOUSEHOLD_BUSINESS",
    organizationStatus: "APPROVED",
    role: "ORG_OWNER",
    memberStatus: "ACTIVE",
  });
  assert.equal(membership.type, "BOTH");
  assert.equal(membership.legalEntityType, "HOUSEHOLD_BUSINESS");
  assert.equal(membership.role, "ORG_OWNER");
  assert.equal(membership.memberRole, "ORG_OWNER");

  const legacyMembership = normalizeMembership({
    organizationId: "org-legacy",
    organizationName: "Legacy Org",
    organizationStatus: "APPROVED",
    role: "ORG_STAFF",
  });
  assert.equal(legacyMembership.type, "SERVICE");
  assert.equal(legacyMembership.legalEntityType, null);
});

test("registerOrganizationSchema validates separated capability type, legalEntityType, and city", () => {
  const valid = registerOrganizationSchema.safeParse({
    name: "Trung Tâm Sửa Chữa An Phát",
    type: "SERVICE",
    legalEntityType: "HOUSEHOLD_BUSINESS",
    taxCode: "",
    phone: "0912345678",
    city: "Đà Nẵng",
    address: "15 Nguyễn Văn Linh, Hải Châu",
    description: "Chuyên điều hòa & máy giặt",
  });
  assert.equal(valid.success, true);

  const invalidLegalAsCapability = registerOrganizationSchema.safeParse({
    name: "Trung Tâm Sửa Chữa An Phát",
    type: "COMPANY",
    legalEntityType: "COMPANY",
    phone: "0912345678",
    city: "Đà Nẵng",
    address: "15 Nguyễn Văn Linh, Hải Châu",
  });
  assert.equal(invalidLegalAsCapability.success, false);

  const invalidCapabilityAsLegal = registerOrganizationSchema.safeParse({
    name: "Trung Tâm Sửa Chữa An Phát",
    type: "BOTH",
    legalEntityType: "SERVICE",
    phone: "0912345678",
    city: "Đà Nẵng",
    address: "15 Nguyễn Văn Linh, Hải Châu",
  });
  assert.equal(invalidCapabilityAsLegal.success, false);

  const missingCity = registerOrganizationSchema.safeParse({
    name: "Trung Tâm Sửa Chữa An Phát",
    type: "COMMERCE",
    legalEntityType: "COMPANY",
    phone: "0912345678",
    city: "",
    address: "15 Nguyễn Văn Linh, Hải Châu",
  });
  assert.equal(missingCity.success, false);
});
