import { describe, expect, it } from "vitest";
import { mapBooking, mapOrder } from "./org-ops.adapter";

describe("org-ops address snapshot mapping", () => {
  it("maps booking addressSnapshot when present and keeps legacy fallback", () => {
    const withSnapshot = mapBooking({
      id: "b-1",
      requesterProfileId: "cust-1",
      requesterName: "Nguyen Van A",
      serviceName: "Sua dieu hoa",
      assignedTechnicianName: null,
      preferredStart: "2026-11-20T09:00:00Z",
      createdAt: "2026-11-19T10:00:00Z",
      address: "10 Hai Ba Trung, Phường Tân Định, Thành phố Hồ Chí Minh",
      addressSnapshot: {
        addressId: "addr-1",
        recipientName: "Nguyen Van A",
        phoneNumber: "0901234567",
        wardCode: "26734",
        wardName: "Phường Tân Định",
        provinceCode: "79",
        provinceName: "Thành phố Hồ Chí Minh",
      },
      quotedPrice: 300000,
      status: "REQUESTED",
    });

    expect(withSnapshot.addressSnapshot?.wardName).toBe("Phường Tân Định");
    expect(withSnapshot.addressSnapshot?.recipientName).toBe("Nguyen Van A");

    const legacy = mapBooking({
      id: "b-2",
      requesterProfileId: "cust-2",
      serviceName: "Bao duong",
      assignedTechnicianName: null,
      preferredStart: null,
      createdAt: "2026-11-19T10:00:00Z",
      address: "Legacy 123 Le Loi",
      quotedPrice: 200000,
      status: "REQUESTED",
    });

    expect(legacy.address).toBe("Legacy 123 Le Loi");
    expect(legacy.addressSnapshot).toBeNull();
  });

  it("maps order shippingAddressSnapshot when present", () => {
    const mapped = mapOrder({
      id: "ord-1",
      buyerProfileId: "buyer-1",
      buyerName: "Tran Thi B",
      shippingAddress: "45 Nguyen Hue, Phường Bến Nghé, Thành phố Hồ Chí Minh",
      shippingAddressSnapshot: {
        addressId: "addr-2",
        recipientName: "Tran Thi B",
        phoneNumber: "0909998888",
        wardName: "Phường Bến Nghé",
        provinceName: "Thành phố Hồ Chí Minh",
      },
      totalAmount: 200000,
      status: "PAID",
      paymentStatus: "PAID",
      lines: [],
    });

    expect(mapped.shippingAddressSnapshot?.provinceName).toBe("Thành phố Hồ Chí Minh");
    expect(mapped.shippingAddressSnapshot?.phoneNumber).toBe("0909998888");
  });
});
