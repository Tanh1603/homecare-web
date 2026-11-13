export interface OrgBookingItem {
  id: string;
  customerName: string;
  serviceName: string;
  technicianName: string | null;
  scheduledAt: string;
  totalAmount: number;
  status: "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
}

export interface OrgOrderItem {
  id: string;
  buyerName: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  status: "PENDING" | "IN_PROGRESS" | "DELIVERED" | "CANCELLED";
  warrantyActivated: boolean;
}

export interface OrgTechnicianItem {
  id: string;
  fullName: string;
  phone: string;
  specialty: string;
  rating: number;
  status: "ACTIVE" | "SUSPENDED";
}

export interface OrgWarrantyItem {
  id: string;
  deviceOrPart: string;
  customerName: string;
  expiresAt: string;
  status: "ACTIVE" | "EXPIRED";
}

export const orgOpsApi = {
  async listBookings(organizationId: string): Promise<OrgBookingItem[]> {
    void organizationId;
    return [
      {
        id: "BK-2026-101",
        customerName: "Phạm Thu Hà",
        serviceName: "Vệ sinh điều hòa treo tường",
        technicianName: "Lê Hoàng Nam",
        scheduledAt: "2026-11-13T14:00:00Z",
        totalAmount: 250000,
        status: "ASSIGNED",
      },
      {
        id: "BK-2026-102",
        customerName: "Đỗ Quang Minh",
        serviceName: "Sửa bo mạch máy giặt Inverter",
        technicianName: null,
        scheduledAt: "2026-11-14T09:30:00Z",
        totalAmount: 650000,
        status: "PENDING",
      },
      {
        id: "BK-2026-098",
        customerName: "Vũ Thị Lan",
        serviceName: "Nạp gas R32 điều hòa",
        technicianName: "Nguyễn Đức Thắng",
        scheduledAt: "2026-11-12T15:00:00Z",
        totalAmount: 420000,
        status: "COMPLETED",
      },
    ];
  },

  async listOrders(organizationId: string): Promise<OrgOrderItem[]> {
    void organizationId;
    return [
      {
        id: "ORD-8821",
        buyerName: "Phạm Thu Hà",
        productName: "Tụ điện máy nén 35uF chính hãng",
        quantity: 2,
        totalAmount: 370000,
        status: "DELIVERED",
        warrantyActivated: true,
      },
      {
        id: "ORD-8822",
        buyerName: "Trần Quốc Bảo",
        productName: "Van cấp nước máy giặt Samsung",
        quantity: 1,
        totalAmount: 290000,
        status: "IN_PROGRESS",
        warrantyActivated: false,
      },
    ];
  },

  async listTechnicians(organizationId: string): Promise<OrgTechnicianItem[]> {
    void organizationId;
    return [
      {
        id: "tech-1",
        fullName: "Lê Hoàng Nam",
        phone: "0912345678",
        specialty: "Điều hòa & Tủ lạnh",
        rating: 4.9,
        status: "ACTIVE",
      },
      {
        id: "tech-2",
        fullName: "Nguyễn Đức Thắng",
        phone: "0987654321",
        specialty: "Máy giặt & Máy sấy",
        rating: 4.8,
        status: "ACTIVE",
      },
    ];
  },

  async listWarranties(organizationId: string): Promise<OrgWarrantyItem[]> {
    void organizationId;
    return [
      {
        id: "WR-501",
        deviceOrPart: "Tụ điện máy nén 35uF chính hãng",
        customerName: "Phạm Thu Hà",
        expiresAt: "2027-11-12T00:00:00Z",
        status: "ACTIVE",
      },
    ];
  },
};
