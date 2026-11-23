import { unwrapApiResponse, type ApiResponse } from "@/shared/api/api-envelope";
import type { AdminUserItem } from "./admin.adapter";

export const adminHttpApi = {
  async suspendUser(userId: string): Promise<AdminUserItem> {
    const res = await fetch(
      `/api/gateway/admin/users/${encodeURIComponent(userId)}/suspend`,
      {
        method: "POST",
        headers: { "x-homecare-scope": "personal" },
      }
    );
    const json = (await res.json()) as ApiResponse<AdminUserItem>;
    return unwrapApiResponse(json);
  },

  async reactivateUser(userId: string): Promise<AdminUserItem> {
    const res = await fetch(
      `/api/gateway/admin/users/${encodeURIComponent(userId)}/reactivate`,
      {
        method: "POST",
        headers: { "x-homecare-scope": "personal" },
      }
    );
    const json = (await res.json()) as ApiResponse<AdminUserItem>;
    return unwrapApiResponse(json);
  },
};
