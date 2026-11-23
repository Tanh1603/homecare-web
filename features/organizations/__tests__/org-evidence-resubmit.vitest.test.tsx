import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { registerOrganizationSchema } from "@/features/organizations/contracts/organization";
import { OrgEvidenceUploader } from "@/features/organizations/components/org-evidence-uploader";
import { OrgResubmitForm } from "@/features/organizations/components/org-resubmit-form";
import { organizationsApi } from "@/features/organizations/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Organization evidence presign upload & resubmit", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("requires identityEvidenceRefs in registerOrganizationSchema", () => {
    const missing = registerOrganizationSchema.safeParse({
      name: "Dien Lanh Pro",
      type: "SERVICE",
      legalEntityType: "COMPANY",
      taxCode: "0109283746",
      phone: "0901234567",
      city: "TP. HCM",
      address: "123 Nguyen Trai",
      description: "Sua chua",
      identityEvidenceRefs: "",
    });
    expect(missing.success).toBe(false);

    const valid = registerOrganizationSchema.safeParse({
      name: "Dien Lanh Pro",
      type: "SERVICE",
      legalEntityType: "COMPANY",
      taxCode: "0109283746",
      phone: "0901234567",
      city: "TP. HCM",
      address: "123 Nguyen Trai",
      description: "Sua chua",
      identityEvidenceRefs: JSON.stringify([
        {
          documentType: "COMPANY",
          fileName: "dkkd.pdf",
          objectKey: "organizations/u1/dkkd.pdf",
          bucket: "organization-evidence",
        },
      ]),
    });
    expect(valid.success).toBe(true);
  });

  it("uploads file via presigned URL and updates value in OrgEvidenceUploader", async () => {
    const uploadSpy = vi
      .spyOn(organizationsApi, "uploadEvidenceFile")
      .mockResolvedValue({
        documentType: "COMPANY",
        fileName: "gpkd.pdf",
        objectKey: "organizations/u1/gpkd.pdf",
        bucket: "organization-evidence",
        contentType: "application/pdf",
      });

    const onChange = vi.fn();
    render(
      <OrgEvidenceUploader
        legalEntityType="COMPANY"
        value=""
        onChange={onChange}
      />
    );

    const input = screen.getByLabelText("Chọn tài liệu chứng minh pháp lý");
    const file = new File(["pdf-bytes"], "gpkd.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledWith(file, "COMPANY");
      expect(onChange).toHaveBeenCalledTimes(1);
    });
    expect(onChange.mock.calls[0][0]).toContain("organizations/u1/gpkd.pdf");
  });

  it("submits updated organization & evidence via OrgResubmitForm", async () => {
    const resubmitSpy = vi
      .spyOn(organizationsApi, "resubmit")
      .mockResolvedValue({
        id: "org-1",
        name: "Dien Lanh Pro Updated",
        type: "SERVICE",
        legalEntityType: "COMPANY",
        status: "PENDING",
        phone: "0901234567",
        city: "TP. HCM",
        address: "123 Nguyen Trai",
        createdAt: "2026-11-23T00:00:00Z",
        updatedAt: "2026-11-23T00:00:00Z",
      });

    const existingRefs = JSON.stringify([
      {
        documentType: "COMPANY",
        fileName: "gpkd-moi.pdf",
        objectKey: "organizations/u1/gpkd-moi.pdf",
        bucket: "organization-evidence",
      },
    ]);

    render(
      <OrgResubmitForm
        organization={{
          id: "org-1",
          name: "Dien Lanh Pro",
          type: "SERVICE",
          legalEntityType: "COMPANY",
          status: "REJECTED",
          resubmitCount: 1,
          taxCode: "0109283746",
          phone: "0901234567",
          city: "TP. HCM",
          address: "123 Nguyen Trai",
          description: "Mo ta",
          identityEvidenceRefs: existingRefs,
          version: 2,
          createdAt: "2026-11-23T00:00:00Z",
          updatedAt: "2026-11-23T00:00:00Z",
        }}
      />
    );

    expect(screen.getByText("gpkd-moi.pdf")).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Tên tổ chức/i), {
      target: { value: "Dien Lanh Pro Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Nộp lại hồ sơ" }));

    await waitFor(() => {
      expect(resubmitSpy).toHaveBeenCalledWith(
        "org-1",
        expect.objectContaining({
          name: "Dien Lanh Pro Updated",
          identityEvidenceRefs: existingRefs,
        }),
        2
      );
    });
  });
});
