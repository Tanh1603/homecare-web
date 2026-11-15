import { z } from "zod";

export const ORGANIZATION_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const;

export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export const ORGANIZATION_TYPES = [
  "COMPANY",
  "HOUSEHOLD_BUSINESS",
  "INDIVIDUAL",
] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  COMPANY: "Công ty / Doanh nghiệp",
  HOUSEHOLD_BUSINESS: "Hộ kinh doanh",
  INDIVIDUAL: "Cá nhân hành nghề",
};

export const ORG_ROLES = ["ORG_OWNER", "ORG_ADMIN", "ORG_STAFF"] as const;

export type OrganizationMemberRole =
  | (typeof ORG_ROLES)[number]
  | "OWNER"
  | "MANAGER"
  | "DISPATCHER";

const ORG_ROLE_LABELS: Record<string, string> = {
  ORG_OWNER: "Chủ sở hữu",
  OWNER: "Chủ sở hữu",
  ORG_ADMIN: "Quản trị viên",
  MANAGER: "Quản trị viên",
  ORG_STAFF: "Nhân viên vận hành",
  DISPATCHER: "Nhân viên vận hành",
};

export function formatOrgRoleLabel(role: string): string {
  return ORG_ROLE_LABELS[role] ?? role;
}

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  rejectReason?: string | null;
  rejectionReason?: string | null;
  taxCode?: string | null;
  phone: string;
  city: string;
  address?: string | null;
  description?: string | null;
  ownerUserId?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  type?: OrganizationType;
  organizationStatus: OrganizationStatus;
  rejectReason?: string | null;
  rejectionReason?: string | null;
  role: OrganizationMemberRole;
  memberRole: OrganizationMemberRole;
  memberStatus?: string;
  joinedAt?: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
  status: string;
  joinedAt: string;
}

export function normalizeOrganization(
  raw: Partial<Organization> & Record<string, unknown>
): Organization {
  const rejectReason =
    (raw.rejectReason as string | null | undefined) ??
    (raw.rejectionReason as string | null | undefined) ??
    null;

  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    type: (raw.type as OrganizationType) || "COMPANY",
    status: (raw.status as OrganizationStatus) || "PENDING",
    rejectReason,
    rejectionReason: rejectReason,
    taxCode: (raw.taxCode as string | null | undefined) ?? null,
    phone: String(raw.phone ?? ""),
    city: String(raw.city ?? ""),
    address: (raw.address as string | null | undefined) ?? null,
    description: (raw.description as string | null | undefined) ?? null,
    ownerUserId: raw.ownerUserId ? String(raw.ownerUserId) : undefined,
    version: typeof raw.version === "number" ? raw.version : undefined,
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
  };
}

export function normalizeMembership(
  raw: Partial<OrganizationMembership> & Record<string, unknown>
): OrganizationMembership {
  const rejectReason =
    (raw.rejectReason as string | null | undefined) ??
    (raw.rejectionReason as string | null | undefined) ??
    null;
  const resolvedRole =
    (raw.role as OrganizationMemberRole | undefined) ??
    (raw.memberRole as OrganizationMemberRole | undefined) ??
    "ORG_STAFF";

  return {
    organizationId: String(raw.organizationId ?? ""),
    organizationName: String(raw.organizationName ?? ""),
    type: (raw.type as OrganizationType | undefined) ?? "COMPANY",
    organizationStatus:
      (raw.organizationStatus as OrganizationStatus) || "PENDING",
    rejectReason,
    rejectionReason: rejectReason,
    role: resolvedRole,
    memberRole: resolvedRole,
    memberStatus: raw.memberStatus ? String(raw.memberStatus) : undefined,
    joinedAt: raw.joinedAt ? String(raw.joinedAt) : undefined,
  };
}

export const registerOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Tên tổ chức tối thiểu 2 ký tự"),
  type: z.enum(ORGANIZATION_TYPES, {
    error: "Vui lòng chọn loại hình tổ chức",
  }),
  taxCode: z
    .string()
    .trim()
    .refine(
      (val) => val.length === 0 || val.length >= 10,
      "Mã số thuế tối thiểu 10 ký tự"
    )
    .optional(),
  phone: z.string().trim().min(9, "Số điện thoại không hợp lệ"),
  city: z.string().trim().min(2, "Vui lòng nhập tỉnh/thành phố"),
  address: z.string().trim().min(5, "Địa chỉ tối thiểu 5 ký tự"),
  description: z.string().trim().optional(),
});

export type RegisterOrganizationInput = z.infer<
  typeof registerOrganizationSchema
>;

export const reviewOrganizationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
  reason: z.string().trim().optional(),
});

export type ReviewOrganizationInput = z.infer<typeof reviewOrganizationSchema>;

export const addOrganizationMemberSchema = z.object({
  userId: z.string().trim().min(1, "Vui lòng nhập User ID (Supabase UUID)"),
  role: z.enum(ORG_ROLES),
});

export type AddOrganizationMemberInput = z.infer<
  typeof addOrganizationMemberSchema
>;
