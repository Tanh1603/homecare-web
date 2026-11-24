export const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  AC_CLEANING_MAINTENANCE: "Vệ sinh & Bảo dưỡng máy lạnh",
  AC_REPAIR_INSTALL: "Sửa chữa & Lắp đặt máy lạnh",
  ELECTRICAL_REPAIR: "Sửa chữa điện dân dụng",
  PLUMBING: "Sửa chữa ống nước & Thiết bị vệ sinh",
  APPLIANCE_REPAIR: "Sửa chữa thiết bị gia dụng",
  WATER_HEATER_GAS: "Máy nước nóng & Thiết bị gas",
};

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  SMALL_PART: "Linh kiện nhỏ",
  MAJOR_PART: "Linh kiện chính",
  SUPPLY: "Vật tư tiêu hao",
  TOOL: "Dụng cụ",
  LARGE_APPLIANCE: "Thiết bị lớn",
};

export const PRICE_TYPE_LABELS: Record<string, string> = {
  FIXED: "Giá niêm yết",
  QUOTE_REQUIRED: "Báo giá sau khảo sát",
};

export const COVERAGE_LEVEL_LABELS: Record<string, string> = {
  PROVINCE: "Tỉnh / Thành phố",
  WARD: "Phường / Xã",
};

export const ORG_STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  SUSPENDED: "Tạm ngưng",
  BANNED: "Cấm vĩnh viễn",
};

export function formatServiceCategory(code: string): string {
  return SERVICE_CATEGORY_LABELS[code] ?? code;
}

export function formatProductType(code?: string | null): string {
  if (!code) return "—";
  return PRODUCT_TYPE_LABELS[code] ?? code;
}

export function formatPriceType(code?: string | null): string {
  if (!code) return "Giá niêm yết";
  return PRICE_TYPE_LABELS[code] ?? code;
}

export function formatCoverageLevel(level?: string | null): string {
  if (!level) return "—";
  return COVERAGE_LEVEL_LABELS[level] ?? level;
}

export function formatShortCode(id: string): string {
  const cleaned = id.replace(/-/g, "").toUpperCase();
  return cleaned.slice(0, 8);
}

export function formatOrgClassification(
  typeLabel: string,
  legalEntityLabel?: string | null
): string {
  return legalEntityLabel ? `${typeLabel} · ${legalEntityLabel}` : typeLabel;
}
