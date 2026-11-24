import { toast } from "sonner";
import type { Organization } from "@/features/organizations/contracts/organization";
import { organizationsApi } from "@/features/organizations/api";
import { ORG_STATUS_LABELS } from "./admin-labels";

export async function approveOrganizationAction(
  org: Organization
): Promise<Organization | null> {
  try {
    const updated = await organizationsApi.review(org.id, {
      status: "APPROVED",
    });
    toast.success(
      `Đã cập nhật trạng thái ${org.name} → ${ORG_STATUS_LABELS.APPROVED}`
    );
    return updated;
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Thao tác thất bại");
    return null;
  }
}

export async function reactivateOrganizationAction(
  org: Organization
): Promise<Organization | null> {
  try {
    const updated = await organizationsApi.reactivate(org.id);
    toast.success(`Đã kích hoạt lại "${org.name}"`);
    return updated;
  } catch (err) {
    toast.error(
      err instanceof Error ? err.message : "Không thể kích hoạt lại tổ chức"
    );
    return null;
  }
}
