import test from "node:test";
import assert from "node:assert/strict";
import { shouldAttachOrganizationHeader } from "../api/org-header-policy.ts";

test("omits X-Organization-Id on personal-only and admin routes", () => {
  assert.equal(shouldAttachOrganizationHeader("GET", "/organizations/my"), false);
  assert.equal(shouldAttachOrganizationHeader("POST", "/organizations"), false);
  assert.equal(shouldAttachOrganizationHeader("GET", "/organizations/123"), false);
  assert.equal(shouldAttachOrganizationHeader("GET", "/admin/organizations"), false);
  assert.equal(shouldAttachOrganizationHeader("PATCH", "/admin/users/u1/status"), false);
  assert.equal(shouldAttachOrganizationHeader("GET", "/notifications?page=1"), false);
  assert.equal(shouldAttachOrganizationHeader("POST", "/bookings"), false);
  assert.equal(shouldAttachOrganizationHeader("POST", "/orders"), false);
  assert.equal(shouldAttachOrganizationHeader("POST", "/orders/o1/payment-attempts"), false);
  assert.equal(shouldAttachOrganizationHeader("POST", "/orders/o1/lines/l1/returns"), false);
  assert.equal(shouldAttachOrganizationHeader("GET", "/technicians/me"), false);
  assert.equal(shouldAttachOrganizationHeader("GET", "/households"), false);
  assert.equal(shouldAttachOrganizationHeader("DELETE", "/service-reviews/r1"), false);
});

test("attaches X-Organization-Id on org-scoped routes unless explicitScope=personal", () => {
  assert.equal(shouldAttachOrganizationHeader("PATCH", "/organizations/current"), true);
  assert.equal(shouldAttachOrganizationHeader("GET", "/organizations/current/members"), true);
  assert.equal(shouldAttachOrganizationHeader("GET", "/organizations/org-1/technicians/calendar"), true);
  assert.equal(shouldAttachOrganizationHeader("POST", "/organizations/org-1/technicians/schedule-requests/r1/review"), true);
  assert.equal(shouldAttachOrganizationHeader("GET", "/organizations/org-1/technicians/calendar", "personal"), false);
  assert.equal(shouldAttachOrganizationHeader("GET", "/bookings?size=20"), true);
  assert.equal(shouldAttachOrganizationHeader("POST", "/bookings/b1/assign"), true);
  assert.equal(shouldAttachOrganizationHeader("GET", "/merchant/returns"), true);
  assert.equal(shouldAttachOrganizationHeader("PATCH", "/services/s1"), true);
  assert.equal(
    shouldAttachOrganizationHeader("PATCH", "/services/s1", "personal"),
    false
  );
  assert.equal(
    shouldAttachOrganizationHeader("GET", "/services?includeInactive=true", "organization"),
    true
  );
});
