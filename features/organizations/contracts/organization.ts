import { z } from "zod";
import type { UploadedMediaRef } from "../../../shared/api/media-upload";

export const ORGANIZATION_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "BANNED",
] as const;

export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export const ORGANIZATION_TYPES = ["SERVICE", "COMMERCE", "BOTH"] as const;
export const V01_REGISTERABLE_ORGANIZATION_TYPES = ["SERVICE"] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  SERVICE: "Cung cấp dịch vụ",
  COMMERCE: "Bán hàng & Linh kiện",
  BOTH: "Dịch vụ & Bán hàng",
};

export const LEGAL_ENTITY_TYPES = [
  "COMPANY",
  "HOUSEHOLD_BUSINESS",
  "INDIVIDUAL",
] as const;

export type LegalEntityType = (typeof LEGAL_ENTITY_TYPES)[number];

export const LEGAL_ENTITY_TYPE_LABELS: Record<LegalEntityType, string> = {
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
  legalEntityType?: LegalEntityType | null;
  status: OrganizationStatus;
  rejectReason?: string | null;
  rejectionReason?: string | null;
  resubmitCount?: number;
  identityVerified?: boolean;
  identityEvidenceRefs?: string | null;
  pendingLegalEntityUpgrade?: LegalEntityType | null;
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
  legalEntityType?: LegalEntityType | null;
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
  fullName?: string | null;
  email?: string | null;
  role: OrganizationMemberRole;
  status: string;
  joinedAt: string;
}

function toOrganizationType(value: unknown): OrganizationType {
  return typeof value === "string" &&
    (ORGANIZATION_TYPES as readonly string[]).includes(value)
    ? (value as OrganizationType)
    : "SERVICE";
}

function toLegalEntityType(value: unknown): LegalEntityType | null {
  return typeof value === "string" &&
    (LEGAL_ENTITY_TYPES as readonly string[]).includes(value)
    ? (value as LegalEntityType)
    : null;
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
    type: toOrganizationType(raw.type),
    legalEntityType: toLegalEntityType(raw.legalEntityType),
    status: (raw.status as OrganizationStatus) || "PENDING",
    rejectReason,
    rejectionReason: rejectReason,
    resubmitCount:
      typeof raw.resubmitCount === "number" ? raw.resubmitCount : undefined,
    identityVerified:
      typeof raw.identityVerified === "boolean"
        ? raw.identityVerified
        : undefined,
    identityEvidenceRefs:
      (raw.identityEvidenceRefs as string | null | undefined) ?? null,
    pendingLegalEntityUpgrade: toLegalEntityType(raw.pendingLegalEntityUpgrade),
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
    type: toOrganizationType(raw.type),
    legalEntityType: toLegalEntityType(raw.legalEntityType),
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

export type OrganizationEvidenceRef = UploadedMediaRef;

export const LEGAL_ENTITY_EVIDENCE_GUIDE: Record<LegalEntityType, string> = {
  COMPANY: "Giấy chứng nhận đăng ký doanh nghiệp / Mã số thuế (PDF hoặc ảnh).",
  HOUSEHOLD_BUSINESS: "Giấy đăng ký hộ kinh doanh và CCCD chủ hộ (PDF hoặc ảnh).",
  INDIVIDUAL: "CCCD/CMND hoặc chứng chỉ hành nghề cá nhân (PDF hoặc ảnh).",
};

export const TAX_CODE_FIELD_CONFIG: Record<
  LegalEntityType,
  {
    label: string;
    required: boolean;
    placeholder: string;
    hint: string;
  }
> = {
  COMPANY: {
    label: "Mã số thuế doanh nghiệp",
    required: true,
    placeholder: "0109283746 (10 chữ số)",
    hint: "Bắt buộc 10 chữ số theo đăng ký doanh nghiệp.",
  },
  HOUSEHOLD_BUSINESS: {
    label: "Số định danh cá nhân (chủ hộ)",
    required: true,
    placeholder: "001090012345 (12 chữ số)",
    hint: "Từ 01/07/2025, hộ kinh doanh dùng số định danh cá nhân 12 chữ số của người đại diện.",
  },
  INDIVIDUAL: {
    label: "Mã số thuế / Số định danh cá nhân",
    required: false,
    placeholder: "Tùy chọn (10 hoặc 12 chữ số)",
    hint: "Tùy chọn với cá nhân; nếu nhập phải gồm 10 hoặc 12 chữ số.",
  },
};

export const VN_PHONE_REGEX = /^(0|\+84)(2\d{8,9}|[35789]\d{8})$/;
export const COMPANY_TAX_CODE_REGEX = /^\d{10}$/;
export const HOUSEHOLD_PERSONAL_ID_REGEX = /^\d{12}$/;
export const INDIVIDUAL_TAX_OR_ID_REGEX = /^(\d{10}|\d{12})$/;

export function normalizeVietnamesePhone(raw: string): string {
  return raw.replace(/[\s.-]+/g, "");
}

function validateTaxCodeByEntityType(
  legalEntityType: LegalEntityType,
  rawTaxCode: string | undefined,
  ctx: z.RefinementCtx
) {
  const taxCode = (rawTaxCode ?? "").trim();
  if (legalEntityType === "COMPANY") {
    if (!COMPANY_TAX_CODE_REGEX.test(taxCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["taxCode"],
        message: "Doanh nghiệp bắt buộc nhập mã số thuế gồm 10 chữ số",
      });
    }
    return;
  }
  if (legalEntityType === "HOUSEHOLD_BUSINESS") {
    if (!HOUSEHOLD_PERSONAL_ID_REGEX.test(taxCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["taxCode"],
        message: "Hộ kinh doanh bắt buộc nhập số định danh cá nhân gồm 12 chữ số",
      });
    }
    return;
  }
  if (taxCode.length > 0 && !INDIVIDUAL_TAX_OR_ID_REGEX.test(taxCode)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["taxCode"],
      message: "Nếu nhập, mã số thuế / số định danh cá nhân phải gồm 10 hoặc 12 chữ số",
    });
  }
}

const baseOrganizationObjectSchema = z.object({
  name: z.string().trim().min(2, "Tên tổ chức tối thiểu 2 ký tự"),
  type: z.enum(ORGANIZATION_TYPES, {
    error: "Vui lòng chọn lĩnh vực hoạt động",
  }),
  legalEntityType: z.enum(LEGAL_ENTITY_TYPES, {
    error: "Vui lòng chọn loại hình pháp lý",
  }),
  taxCode: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .transform(normalizeVietnamesePhone)
    .refine(
      (val) => VN_PHONE_REGEX.test(val),
      "Số điện thoại Việt Nam không hợp lệ (VD: 0901234567 hoặc 02838221234)"
    ),
  city: z.string().trim().min(2, "Vui lòng nhập tỉnh/thành phố"),
  address: z.string().trim().min(5, "Địa chỉ tối thiểu 5 ký tự"),
  description: z.string().trim().optional(),
  identityEvidenceRefs: z
    .string()
    .trim()
    .min(1, "Vui lòng tải lên ít nhất 1 tài liệu chứng minh pháp lý"),
});

export const registerOrganizationSchema = baseOrganizationObjectSchema.superRefine(
  (data, ctx) => validateTaxCodeByEntityType(data.legalEntityType, data.taxCode, ctx)
);

export type RegisterOrganizationInput = z.infer<
  typeof registerOrganizationSchema
>;

export const resubmitOrganizationSchema = baseOrganizationObjectSchema
  .omit({ type: true })
  .superRefine((data, ctx) =>
    validateTaxCodeByEntityType(data.legalEntityType, data.taxCode, ctx)
  );

export type ResubmitOrganizationInput = z.infer<
  typeof resubmitOrganizationSchema
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

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Tên tổ chức tối thiểu 2 ký tự"),
  phone: z
    .string()
    .trim()
    .transform((value) => normalizeVietnamesePhone(value))
    .refine(
      (value) => VN_PHONE_REGEX.test(value),
      "Số điện thoại Việt Nam không hợp lệ (VD: 0901234567 hoặc +84901234567)"
    ),
  city: z.string().trim().min(2, "Vui lòng nhập tỉnh/thành phố"),
  address: z.string().trim().min(5, "Địa chỉ tối thiểu 5 ký tự"),
  description: z.string().trim().optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
