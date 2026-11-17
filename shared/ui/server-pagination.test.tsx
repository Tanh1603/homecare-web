import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ServerPagination } from "./server-pagination";

describe("ServerPagination", () => {
  it("keeps filters when moving between pages and disables boundary actions", () => {
    render(
      <ServerPagination
        page={2}
        totalPages={4}
        totalItems={73}
        basePath="/org/returns"
        searchParams={{ status: "REQUESTED" }}
      />
    );

    expect(screen.getByText(/Trang/).parentElement?.textContent).toContain(
      "Trang 2 / 4 (73 bản ghi)"
    );
    expect(screen.getByRole("link", { name: "Trước" }).getAttribute("href"))
      .toBe("/org/returns?status=REQUESTED&page=1");
    expect(screen.getByRole("link", { name: "Sau" }).getAttribute("href"))
      .toBe("/org/returns?status=REQUESTED&page=3");
  });
});
