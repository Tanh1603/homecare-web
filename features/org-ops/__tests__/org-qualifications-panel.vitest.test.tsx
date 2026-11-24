import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OrgQualificationsPanel } from "../components/org-qualifications-panel";

describe("OrgQualificationsPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("loads saved qualification files with signed image preview and deletes last file via BE endpoints", async () => {
    const initialRefs = JSON.stringify([
      {
        documentType: "AC_REPAIR_INSTALL",
        fileName: "chung-chi-dien-lanh.png",
        objectKey: "organizations/user-1/cert-1.png",
        bucket: "organization-evidence",
        contentType: "image/png",
      },
    ]);

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/providers/current/qualifications") && (!init || !init.method || init.method === "GET")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "q-1",
                providerId: "p-1",
                category: "AC_REPAIR_INSTALL",
                status: "UNVERIFIED",
                evidenceRefs: initialRefs,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/evidence/signed-url")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { signedUrl: "https://cdn.example.com/signed-cert-1.png" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/providers/current/qualifications/AC_REPAIR_INSTALL") && init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      if (url.includes("/organizations/org-1/evidence") && init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      return new Response(JSON.stringify({ success: true, data: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<OrgQualificationsPanel organizationId="org-1" />);

    expect(
      await screen.findByText("chung-chi-dien-lanh.png")
    ).toBeInTheDocument();

    await waitFor(() => {
      const img = screen.getByAltText("chung-chi-dien-lanh.png") as HTMLImageElement;
      expect(img.src).toContain("https://cdn.example.com/signed-cert-1.png");
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Xóa tệp chung-chi-dien-lanh.png" })
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/gateway/providers/current/qualifications/AC_REPAIR_INSTALL",
        expect.objectContaining({ method: "DELETE" })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/gateway/organizations/org-1/evidence?objectKey="),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });
});
