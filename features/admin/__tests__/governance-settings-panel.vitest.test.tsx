import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GovernanceSettingsPanel } from "@/features/admin/components/governance-settings-panel";
import { organizationsHttpAdapter } from "@/features/organizations/api/organizations.http";

vi.mock("@/features/organizations/api/organizations.http", () => ({
  organizationsHttpAdapter: {
    listGovernanceSettings: vi.fn(),
    updateGovernanceSetting: vi.fn(),
  },
}));

describe("GovernanceSettingsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads known and dynamic future settings, filters by search, and saves modified values", async () => {
    vi.mocked(organizationsHttpAdapter.listGovernanceSettings).mockResolvedValue([
      {
        settingKey: "inspection_fee_soft_warning_vnd",
        settingValue: "500000",
        updatedBy: "SYSTEM_SEED",
      },
      {
        settingKey: "organization_max_resubmit_count",
        settingValue: "3",
        updatedBy: "SYSTEM_SEED",
      },
      {
        settingKey: "quotation_default_ttl_hours",
        settingValue: "48",
        updatedBy: "admin-1",
      },
    ]);
    vi.mocked(organizationsHttpAdapter.updateGovernanceSetting).mockResolvedValue({
      settingKey: "organization_max_resubmit_count",
      settingValue: "5",
    });

    render(<GovernanceSettingsPanel />);

    // Known setting + dynamic future setting both render
    const resubmitInput = await screen.findByLabelText(
      /Số lần nộp lại tối đa/i
    );
    expect(
      await screen.findByText("quotation_default_ttl_hours")
    ).toBeTruthy();

    fireEvent.change(resubmitInput, { target: { value: "5" } });
    const saveButtons = screen.getAllByRole("button", { name: "Lưu" });
    // Sorted alphabetically: [0]=inspection_fee..., [1]=organization_max_resubmit_count, [2]=quotation_default_ttl_hours
    fireEvent.click(saveButtons[1]);

    await waitFor(() => {
      expect(organizationsHttpAdapter.updateGovernanceSetting).toHaveBeenCalledWith(
        "organization_max_resubmit_count",
        "5"
      );
    });

    // Search filter narrows to matching key
    fireEvent.change(screen.getByLabelText("Tìm tham số cấu hình"), {
      target: { value: "quotation_default" },
    });
    expect(screen.queryByText("inspection_fee_soft_warning_vnd")).toBeNull();
    expect(screen.getByText("quotation_default_ttl_hours")).toBeTruthy();
  });
});
