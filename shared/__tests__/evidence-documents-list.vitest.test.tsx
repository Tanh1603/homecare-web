import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EvidenceDocumentsList } from "@/shared/ui/evidence-documents-list";

afterEach(cleanup);

describe("EvidenceDocumentsList", () => {
  it("keeps every legal document in a visible vertical list when there are many", () => {
    const documents = Array.from({ length: 6 }, (_, index) => ({
      documentType: `LEGAL_DOCUMENT_${index + 1}`,
      fileName: `legal-evidence-${index + 1}.pdf`,
      objectKey: `organizations/org-1/legal-evidence-${index + 1}.pdf`,
      bucket: "organization-evidence",
      contentType: "application/pdf",
    }));

    render(
      <EvidenceDocumentsList
        value={JSON.stringify(documents)}
        organizationId="org-1"
      />
    );

    const list = screen.getByRole("list", {
      name: "Danh sách tài liệu đã tải lên",
    });

    expect(list).toHaveClass("flex-col");
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    for (const document of documents) {
      expect(
        screen.getByRole("button", { name: `Xem ${document.fileName}` })
      ).toBeInTheDocument();
    }
  });
});
