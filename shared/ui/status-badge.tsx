import { Badge, type BadgeProps } from "./badge";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: BadgeProps["variant"] }
> = {
  APPROVED: { label: "Đã duyệt", variant: "success" },
  ACTIVE: { label: "Hoạt động", variant: "success" },
  COMPLETED: { label: "Hoàn thành", variant: "success" },
  DELIVERED: { label: "Đã giao", variant: "success" },
  CONFIRMED: { label: "Đã xác nhận", variant: "success" },
  PAID: { label: "Đã thanh toán", variant: "success" },
  PENDING: { label: "Chờ duyệt", variant: "warning" },
  AWAITING_PAYMENT: { label: "Chờ thanh toán", variant: "warning" },
  UNPAID: { label: "Chưa thanh toán", variant: "warning" },
  IN_PROGRESS: { label: "Đang xử lý", variant: "default" },
  ASSIGNED: { label: "Đã điều phối", variant: "default" },
  ALLOCATED: { label: "Đã phân bổ", variant: "default" },
  AVAILABLE: { label: "Sẵn sàng", variant: "success" },
  BUSY: { label: "Đang bận", variant: "warning" },
  OFFLINE: { label: "Ngoại tuyến", variant: "secondary" },
  INACTIVE: { label: "Ngừng hoạt động", variant: "secondary" },
  REJECTED: { label: "Từ chối", variant: "destructive" },
  SUSPENDED: { label: "Tạm ngưng", variant: "destructive" },
  BANNED: { label: "Cấm vĩnh viễn", variant: "destructive" },
  CANCELLED: { label: "Đã hủy", variant: "secondary" },
  EXPIRED: { label: "Hết hạn", variant: "secondary" },
  APPROVED_PENDING_MANUAL_REFUND: {
    label: "Chờ hoàn tiền thủ công",
    variant: "warning",
  },
  REFUND_SUBMITTED: { label: "Đang xử lý hoàn tiền", variant: "default" },
  REFUNDED: { label: "Đã hoàn tiền", variant: "success" },
  REFUND_FAILED: { label: "Hoàn tiền thất bại", variant: "destructive" },
  MANUAL_REVIEW: { label: "Cần kiểm tra thủ công", variant: "warning" },
};

const DOMAIN_STATUS_CONFIG: Record<
  "booking" | "return",
  Record<string, { label: string; variant: BadgeProps["variant"] }>
> = {
  booking: {
    REQUESTED: { label: "Đang tìm thợ", variant: "warning" },
  },
  return: {
    REQUESTED: { label: "Chờ duyệt hoàn tiền", variant: "warning" },
  },
};

export function StatusBadge({
  status,
  domain,
}: {
  status: string;
  domain?: "booking" | "return";
}) {
  const normalized = status.toUpperCase();
  const cfg = (domain && DOMAIN_STATUS_CONFIG[domain][normalized]) ?? STATUS_CONFIG[normalized] ?? {
    label: status,
    variant: "secondary" as const,
  };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
