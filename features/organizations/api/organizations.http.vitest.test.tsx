import { afterEach, describe, expect, it, vi } from "vitest";
import { browserHttpClient } from "@/shared/api/http-client";
import { organizationsHttpAdapter } from "./organizations.http";

const MOCK_ORG = {
  id: "org-1",
  name: "Test Org",
  type: "SERVICE",
  status: "APPROVED",
  version: 4,
};

describe("organizationsHttpAdapter If-Match ETag format", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends quoted v-prefixed If-Match on upgradeLegalEntity", async () => {
    const requestSpy = vi
      .spyOn(browserHttpClient, "request")
      .mockResolvedValue({
        status: 200,
        data: { success: true, data: MOCK_ORG },
      });

    await organizationsHttpAdapter.upgradeLegalEntity(
      "org-1",
      {
        targetLegalEntityType: "COMPANY",
        taxCode: "0123456789",
        identityEvidenceRefs: "doc-1",
      },
      3
    );

    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/organizations/org-1/upgrade-legal-entity",
        method: "POST",
        headers: expect.objectContaining({
          "If-Match": '"v3"',
        }),
      })
    );
  });

  it("sends quoted v-prefixed If-Match on resubmit", async () => {
    const requestSpy = vi
      .spyOn(browserHttpClient, "request")
      .mockResolvedValue({
        status: 200,
        data: { success: true, data: MOCK_ORG },
      });

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

    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/organizations/org-1/resubmit",
        method: "PUT",
        headers: expect.objectContaining({
          "If-Match": '"v3"',
        }),
      })
    );
  });
});
