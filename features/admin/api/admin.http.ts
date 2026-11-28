import { gatewayHeaders, requestGateway } from "@/shared/api/http-client";
import type { CategoryQualificationItem } from "@/features/org-ops/api/org-ops.http";
import type { AdminUserItem } from "./admin.adapter";

export interface UserStatusResult {
  id: string;
  status: AdminUserItem["status"];
}

export const adminHttpApi = {
  async suspendUser(
    userId: string,
    reason: string
  ): Promise<UserStatusResult> {
    return requestGateway<UserStatusResult>({
      url: `/admin/users/${encodeURIComponent(userId)}/status`,
      method: "PATCH",
      headers: gatewayHeaders({ personal: true }),
      data: {
        status: "SUSPENDED",
        reason: reason.trim(),
      },
    });
  },

  async reactivateUser(userId: string): Promise<UserStatusResult> {
    return requestGateway<UserStatusResult>({
      url: `/admin/users/${encodeURIComponent(userId)}/status`,
      method: "PATCH",
      headers: gatewayHeaders({ personal: true }),
      data: { status: "ACTIVE" },
    });
  },

  async adminListProviderQualifications(
    organizationId: string
  ): Promise<CategoryQualificationItem[]> {
    return requestGateway<CategoryQualificationItem[]>({
      url: `/admin/providers/${encodeURIComponent(organizationId)}/qualifications`,
      method: "GET",
      headers: gatewayHeaders({ personal: true }),
    });
  },

  async adminVerifyProviderQualification(
    organizationId: string,
    category: string,
    payload: {
      decision: "VERIFIED" | "REJECTED" | "REVOKED";
      reason?: string;
    }
  ): Promise<CategoryQualificationItem> {
    return requestGateway<CategoryQualificationItem>({
      url: `/admin/providers/${encodeURIComponent(organizationId)}/qualifications/${encodeURIComponent(category)}/verify`,
      method: "POST",
      headers: gatewayHeaders({ personal: true }),
      data: {
        decision: payload.decision,
        reason: payload.reason?.trim() || undefined,
      },
    });
  },
};
