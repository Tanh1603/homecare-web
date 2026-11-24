import { unwrapApiResponse, type ApiResponse } from "@/shared/api/api-envelope";
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
    const res = await fetch(
      `/api/gateway/admin/users/${encodeURIComponent(userId)}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-homecare-scope": "personal",
        },
        body: JSON.stringify({
          status: "SUSPENDED",
          reason: reason.trim(),
        }),
      }
    );
    const json = (await res.json()) as ApiResponse<UserStatusResult>;
    return unwrapApiResponse(json);
  },

  async reactivateUser(userId: string): Promise<UserStatusResult> {
    const res = await fetch(
      `/api/gateway/admin/users/${encodeURIComponent(userId)}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-homecare-scope": "personal",
        },
        body: JSON.stringify({ status: "ACTIVE" }),
      }
    );
    const json = (await res.json()) as ApiResponse<UserStatusResult>;
    return unwrapApiResponse(json);
  },
};
