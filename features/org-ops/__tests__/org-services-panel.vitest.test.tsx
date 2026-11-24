import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OrgServicesPanel } from "../components/org-services-panel";
import type { OrgServiceItem } from "../api/org-ops.adapter";
import { orgOpsHttpApi } from "../api/org-ops.http";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("../api/org-ops.http", () => ({
  orgOpsHttpApi: {
    createService: vi.fn(),
    updateService: vi.fn(),
    replaceServiceCoverage: vi.fn(),
    deleteService: vi.fn(),
  },
}));

const sampleService: OrgServiceItem = {
  id: "svc-1",
  providerId: "prov-1",
  providerName: "Điện Lạnh Demo",
  name: "Sửa máy lạnh inverter",
  category: "AC_REPAIR_INSTALL",
  description: "Kiểm tra block và nạp gas",
  basePrice: 350000,
  priceType: "FIXED",
  inspectionFee: 0,
  estimatedDurationMinutes: 60,
  active: false,
  status: "INACTIVE",
};

describe("OrgServicesPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Vietnamese category label in table and syncs NativeSelect, warranty range, and qualification alert in drawer", () => {
    render(
      <OrgServicesPanel
        organizationId="org-1"
        initialServices={[sampleService]}
      />
    );

    expect(
      screen.getByText("Sửa chữa & Lắp đặt máy lạnh")
    ).toBeInTheDocument();
    expect(screen.getByText("Cần chứng chỉ")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Thêm dịch vụ/i }));

    const catSelect = screen.getByLabelText(/Danh mục/i) as HTMLSelectElement;
    expect(catSelect.tagName).toBe("SELECT");
    expect(catSelect.value).toBe("AC_CLEANING_MAINTENANCE");

    const warrantyInput = screen.getByLabelText(
      /Bảo hành tay nghề/i
    ) as HTMLInputElement;
    expect(warrantyInput.min).toBe("0");
    expect(warrantyInput.max).toBe("30");

    // Switch to high-risk category ELECTRICAL_REPAIR (min 7, max 90, requires qualification)
    fireEvent.change(warrantyInput, { target: { value: "0" } });
    fireEvent.change(catSelect, { target: { value: "ELECTRICAL_REPAIR" } });

    expect(warrantyInput.min).toBe("7");
    expect(warrantyInput.max).toBe("90");
    expect(warrantyInput.value).toBe("7");
    expect(
      screen.getByText(/thuộc nhóm rủi ro cao/i)
    ).toBeInTheDocument();
  });

  it("requires at least 1 coverage area before activating and calls replaceServiceCoverage on save", async () => {
    const createMock = vi.mocked(orgOpsHttpApi.createService);
    const replaceCovMock = vi.mocked(orgOpsHttpApi.replaceServiceCoverage);
    const updateMock = vi.mocked(orgOpsHttpApi.updateService);
    createMock.mockResolvedValue({
      ...sampleService,
      id: "svc-new",
      category: "PLUMBING",
      active: false,
      status: "INACTIVE",
    });
    replaceCovMock.mockResolvedValue([
      { locationCode: "Phường Bến Nghé", level: "WARD", active: true },
    ]);
    updateMock.mockResolvedValue({
      ...sampleService,
      id: "svc-new",
      category: "PLUMBING",
      active: true,
      status: "ACTIVE",
    });

    render(<OrgServicesPanel organizationId="org-1" initialServices={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Thêm dịch vụ/i }));

    fireEvent.change(screen.getByLabelText(/Tên dịch vụ/i), {
      target: { value: "Sửa ống nước gia đình" },
    });
    fireEvent.change(screen.getByLabelText(/Danh mục/i), {
      target: { value: "PLUMBING" },
    });
    fireEvent.change(screen.getByLabelText(/Trạng thái hiển thị/i), {
      target: { value: "ACTIVE" },
    });

    // Submitting active=true with 0 coverage areas must fail client validation
    fireEvent.click(screen.getByRole("button", { name: /Tạo dịch vụ/i }));
    expect(
      await screen.findByText(/Cần ít nhất 1 khu vực phục vụ/i)
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();

    // Add a WARD coverage area and submit
    fireEvent.change(screen.getByLabelText(/Cấp khu vực phục vụ/i), {
      target: { value: "WARD" },
    });
    fireEvent.change(screen.getByLabelText(/Thêm khu vực phục vụ/i), {
      target: { value: "Phường Bến Nghé" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Thêm khu vực/i }));
    fireEvent.click(screen.getByRole("button", { name: /Tạo dịch vụ/i }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        "org-1",
        expect.objectContaining({ category: "PLUMBING", active: false })
      );
      expect(replaceCovMock).toHaveBeenCalledWith("org-1", "svc-new", [
        { locationCode: "Phường Bến Nghé", level: "WARD", active: true },
      ]);
      expect(updateMock).toHaveBeenCalledWith(
        "org-1",
        "svc-new",
        expect.objectContaining({ category: "PLUMBING", active: true })
      );
    });
  });
});
