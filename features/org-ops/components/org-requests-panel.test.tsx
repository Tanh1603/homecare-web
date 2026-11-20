import { describe, expect, it } from "vitest";
import { calculateQuotationPreview } from "./org-requests-panel";

describe("OrgRequestsPanel quotation arithmetic", () => {
  it("deducts 100% of paid inspection fee up to itemsTotal and never goes negative", () => {
    const preview = calculateQuotationPreview(
      [
        { type: "LABOR", description: "Thay đoạn ống", quantity: 1, unitPrice: 400000 },
        { type: "MATERIAL", description: "Ống PPR", quantity: 2, unitPrice: 50000 },
      ],
      150000,
      true
    );
    expect(preview.itemsTotal).toBe(500000);
    expect(preview.inspectionFeeCredit).toBe(150000);
    expect(preview.totalDueAfterCredit).toBe(350000);

    const capped = calculateQuotationPreview(
      [{ type: "LABOR", description: "Kiểm tra nhẹ", quantity: 1, unitPrice: 100000 }],
      150000,
      true
    );
    expect(capped.inspectionFeeCredit).toBe(100000);
    expect(capped.totalDueAfterCredit).toBe(0);
  });
});
