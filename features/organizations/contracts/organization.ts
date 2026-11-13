import { z } from "zod";

export const ORGANIZATION_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const;

export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export type OrganizationMemberRole = "OWNER" | "MANAGER" | "DISPATCHER";

export interface Organization {
  id: string;
  name: string;
  taxCode: string;
  phone: string;
  email: string;
  address: string;
  status: OrganizationStatus;
  rejectionReason?: string | null;
  technicianCount: number;
  serviceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  organizationStatus: OrganizationStatus;
  rejectionReason?: string | null;
  memberRole: OrganizationMemberRole;
}

export const registerOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Tên tổ chức tối thiểu 2 ký tự"),
  taxCode: z.string().trim().min(10, "Mã số thuế tối thiểu 10 ký tự"),
  phone: z.string().trim().min(9, "Số điện thoại không hợp lệ"),
  email: z.string().trim().email("Email không hợp lệ"),
  address: z.string().trim().min(5, "Địa chỉ tối thiểu 5 ký tự"),
});

export type RegisterOrganizationInput = z.infer<
  typeof registerOrganizationSchema
>;

export const reviewOrganizationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
  reason: z.string().trim().optional(),
});

export type ReviewOrganizationInput = z.infer<typeof reviewOrganizationSchema>;
