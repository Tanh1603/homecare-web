import { afterEach, describe, expect, it, vi } from "vitest";
import { organizationsHttpAdapter } from "./organizations.http";

const MOCK_ORG = {
  id: "org-1",
  name: "Test Org",
  type: "SERVICE",
  status: "APPROVED",
  version: 4,
};

describe("organizationsHttpAdapter If-Match ETag format", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends quoted v-prefixed If-Match on upgradeLegalEntity", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ success: true, data: MOCK_ORG })
    );
    vi.stubGlobal("fetch", fetchMock);

    await organizationsHttpAdapter.upgradeLegalEntity(
      "org-1",
      {
        targetLegalEntityType: "COMPANY",
        taxCode: "0123456789",
        identityEvidenceRefs: "doc-1",
      },
      3
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gateway/organizations/org-1/upgrade-legal-entity",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "If-Match": '"v3"',
        }),
      })
    );
  });

  it("sends quoted v-prefixed If-Match on resubmit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ success: true, data: MOCK_ORG })
    );
    vi.stubGlobal("fetch", fetchMock);

    await organizationsHttpAdapter.resubmit(
      "org-1",
      {
        name: "Test Org",
        legalEntityType: "INDIVIDUAL",
        phone: "0901234567",
        city: "Ho Chi Minh",
        address: "123 Main",
        identityEvidenceRefs: "doc-1",
      },
      3
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gateway/organizations/org-1/resubmit",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "If-Match": '"v3"',
        }),
      })
    );
  });
});
