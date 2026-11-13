import { Badge, type BadgeProps } from "./badge";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: BadgeProps["variant"] }
> = {
  APPROVED: { label: "Đã duyệt", variant: "success" },
  ACTIVE: { label: "Hoạt động", variant: "success" },
  COMPLETED: { label: "Hoàn thành", variant: "success" },
  DELIVERED: { label: "Đã giao", variant: "success" },
  PENDING: { label: "Chờ duyệt", variant: "warning" },
  IN_PROGRESS: { label: "Đang xử lý", variant: "default" },
  ASSIGNED: { label: "Đã điều phối", variant: "default" },
  REJECTED: { label: "Từ chối", variant: "destructive" },
  SUSPENDED: { label: "Tạm ngưng", variant: "destructive" },
  CANCELLED: { label: "Đã hủy", variant: "secondary" },
  EXPIRED: { label: "Hết hạn", variant: "secondary" },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    variant: "secondary" as const,
  };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
