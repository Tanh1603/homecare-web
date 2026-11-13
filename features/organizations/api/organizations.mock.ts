import type {
  Organization,
  OrganizationMembership,
  RegisterOrganizationInput,
  ReviewOrganizationInput,
} from "../contracts/organization";

let mockOrgs: Organization[] = [
  {
    id: "org-1",
    name: "Điện Lạnh Bách Khoa Pro",
    taxCode: "0109283746",
    phone: "0901234567",
    email: "ops@bachkhoapro.vn",
    address: "120 Lê Thanh Nghị, Hai Bà Trưng, Hà Nội",
    status: "APPROVED",
    technicianCount: 18,
    serviceCount: 12,
    createdAt: "2026-10-01T08:00:00Z",
    updatedAt: "2026-11-05T10:30:00Z",
  },
  {
    id: "org-2",
    name: "HomeFix Sài Gòn",
    taxCode: "0318472615",
    phone: "0912987654",
    email: "contact@homefixsg.vn",
    address: "45 Nguyễn Thị Minh Khai, Quận 1, TP.HCM",
    status: "PENDING",
    technicianCount: 0,
    serviceCount: 0,
    createdAt: "2026-11-12T09:15:00Z",
    updatedAt: "2026-11-12T09:15:00Z",
  },
  {
    id: "org-3",
    name: "Vật Tư Gia Dụng An Tâm",
    taxCode: "0105566778",
    phone: "0988776655",
    email: "support@antam.vn",
    address: "88 Cầu Giấy, Hà Nội",
    status: "SUSPENDED",
    rejectionReason: "Tạm ngưng do quá hạn xác minh giấy phép kinh doanh.",
    technicianCount: 6,
    serviceCount: 4,
    createdAt: "2026-09-14T11:00:00Z",
    updatedAt: "2026-11-10T14:20:00Z",
  },
];

export const organizationsMockAdapter = {
  async listAll(): Promise<Organization[]> {
    return [...mockOrgs];
  },

  async listMyMemberships(): Promise<OrganizationMembership[]> {
    return [
      {
        organizationId: "org-1",
        organizationName: mockOrgs[0]?.name ?? "Điện Lạnh Bách Khoa Pro",
        organizationStatus: mockOrgs[0]?.status ?? "APPROVED",
        rejectionReason: mockOrgs[0]?.rejectionReason,
        memberRole: "OWNER",
      },
      {
        organizationId: "org-2",
        organizationName: mockOrgs[1]?.name ?? "HomeFix Sài Gòn",
        organizationStatus: mockOrgs[1]?.status ?? "PENDING",
        rejectionReason: mockOrgs[1]?.rejectionReason,
        memberRole: "MANAGER",
      },
    ];
  },

  async register(input: RegisterOrganizationInput): Promise<Organization> {
    const now = new Date().toISOString();
    const created: Organization = {
      id: `org-${Date.now()}`,
      ...input,
      status: "PENDING",
      technicianCount: 0,
      serviceCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    mockOrgs = [created, ...mockOrgs];
    return created;
  },

  async review(
    organizationId: string,
    input: ReviewOrganizationInput
  ): Promise<Organization> {
    const idx = mockOrgs.findIndex((o) => o.id === organizationId);
    if (idx === -1) throw new Error("Organization not found");
    const updated: Organization = {
      ...mockOrgs[idx],
      status: input.status,
      rejectionReason: input.reason ?? null,
      updatedAt: new Date().toISOString(),
    };
    mockOrgs = mockOrgs.map((o, i) => (i === idx ? updated : o));
    return updated;
  },
};
