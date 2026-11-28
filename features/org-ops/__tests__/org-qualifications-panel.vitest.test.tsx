import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { browserHttpClient } from "@/shared/api/http-client";
import { OrgQualificationsPanel } from "../components/org-qualifications-panel";

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

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

    const requestSpy = vi
      .spyOn(browserHttpClient, "request")
      .mockImplementation(async (config) => {
        const url = String(config.url ?? "");
        const method = String(config.method ?? "GET").toUpperCase();
        if (url === "/providers/current/qualifications" && method === "GET") {
          return {
            status: 200,
            data: {
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
            },
          };
        }
        if (
          url === "/providers/current/qualifications/AC_REPAIR_INSTALL" &&
          method === "DELETE"
        ) {
          return { status: 204, data: null };
        }
        if (url.startsWith("/organizations/org-1/evidence") && method === "DELETE") {
          return { status: 204, data: null };
        }
        return { status: 200, data: { success: true, data: null } };
      });

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/evidence/signed-url")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { signedUrl: "https://cdn.example.com/signed-cert-1.png" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: true, data: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    renderWithQuery(<OrgQualificationsPanel organizationId="org-1" />);

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
      expect(requestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/providers/current/qualifications/AC_REPAIR_INSTALL",
          method: "DELETE",
        })
      );
      expect(requestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("/organizations/org-1/evidence?objectKey="),
          method: "DELETE",
        })
      );
    });
  });
});
