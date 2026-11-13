export interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  role: "CUSTOMER" | "TECHNICIAN" | "ORGANIZATION" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
}

export interface CatalogItem {
  id: string;
  type: "DEVICE" | "SERVICE" | "PRODUCT";
  name: string;
  category: string;
  basePrice?: number;
  status: "ACTIVE" | "SUSPENDED";
}

const MOCK_USERS: AdminUserItem[] = [
  {
    id: "u-1",
    fullName: "Nguyễn Văn An",
    email: "an.nguyen@homecare.vn",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "2026-09-01T08:00:00Z",
  },
  {
    id: "u-2",
    fullName: "Trần Minh Tuấn",
    email: "ops@bachkhoapro.vn",
    role: "ORGANIZATION",
    status: "ACTIVE",
    createdAt: "2026-10-02T09:30:00Z",
  },
  {
    id: "u-3",
    fullName: "Lê Hoàng Nam",
    email: "nam.tech@bachkhoapro.vn",
    role: "TECHNICIAN",
    status: "ACTIVE",
    createdAt: "2026-10-12T14:00:00Z",
  },
  {
    id: "u-4",
    fullName: "Phạm Thu Hà",
    email: "ha.pham@gmail.com",
    role: "CUSTOMER",
    status: "ACTIVE",
    createdAt: "2026-11-01T10:15:00Z",
  },
];

const MOCK_CATALOG: CatalogItem[] = [
  {
    id: "cat-1",
    type: "SERVICE",
    name: "Vệ sinh & bảo dưỡng điều hòa treo tường",
    category: "Điện lạnh",
    basePrice: 250000,
    status: "ACTIVE",
  },
  {
    id: "cat-2",
    type: "DEVICE",
    name: "Máy giặt cửa ngang Inverter",
    category: "Thiết bị giặt",
    status: "ACTIVE",
  },
  {
    id: "cat-3",
    type: "PRODUCT",
    name: "Tụ điện máy nén 35uF chính hãng",
    category: "Linh kiện điều hòa",
    basePrice: 185000,
    status: "ACTIVE",
  },
];

export const adminApi = {
  async listUsers(): Promise<AdminUserItem[]> {
    return MOCK_USERS;
  },
  async listCatalog(): Promise<CatalogItem[]> {
    return MOCK_CATALOG;
  },
};
