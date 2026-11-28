"use client";

import * as React from "react";
import { Eye } from "lucide-react";
import type { OrgWarrantyItem } from "../api/org-ops.adapter";
import { Button } from "@/shared/ui/button";
import { ContextInspector } from "@/shared/ui/context-inspector";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { StatusBadge } from "@/shared/ui/status-badge";
import { formatDate, formatShortId } from "@/shared/lib/utils";

function formatWarrantySource(source?: string): string {
  switch (source) {
    case "INSTALLATION_COMPLETED":
      return "Hoàn tất lắp đặt";
    case "ORDER_LINE_DELIVERED":
      return "Giao hàng đơn hàng";
    case "ORDER_AUTO_ACTIVATED":
      return "Tự động từ đơn hàng";
    case "MANUAL":
      return "Tạo thủ công";
    default:
      return source || "—";
  }
}

function formatManufacturerRegistrationStatus(status?: string | null): string {
  switch (status) {
    case "VERIFIED":
      return "Đã xác minh hãng";
    case "EXTERNAL_REQUIRED":
      return "Cần đăng ký hãng ngoài";
    case "NOT_VERIFIED":
    case null:
    case undefined:
      return "Chưa xác minh hãng";
    default:
      return status;
  }
}

export function OrgWarrantiesTable({
  initialWarranties,
}: {
  initialWarranties: OrgWarrantyItem[];
}) {
  const [selected, setSelected] = React.useState<OrgWarrantyItem | null>(null);

  const columns = React.useMemo<DataTableColumn<OrgWarrantyItem>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Mã BH",
        cell: ({ row }) => (
          <span className="font-mono text-xs" title={row.original.id}>
            #{formatShortId(row.original.id)}
          </span>
        ),
      },
      {
        accessorKey: "deviceOrPart",
        header: "Thiết bị / Nội dung bảo hành",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.deviceOrPart}</span>
        ),
      },
      {
        accessorKey: "customerName",
        header: "Khách hàng / Nguồn",
        cell: ({ row }) => (
          <div className="text-muted-foreground">
            <div>{row.original.customerName}</div>
            <div className="text-xs">{formatWarrantySource(row.original.source)}</div>
          </div>
        ),
      },
      {
        accessorKey: "manufacturerRegistrationStatus",
        header: "Đăng ký hãng",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatManufacturerRegistrationStatus(
              row.original.manufacturerRegistrationStatus
            )}
          </span>
        ),
      },
      {
        accessorKey: "startsOn",
        header: "Bắt đầu",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.startsOn ? formatDate(row.original.startsOn) : "—"}
          </span>
        ),
      },
      {
        accessorKey: "expiresAt",
        header: "Hết hạn",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.expiresAt ? formatDate(row.original.expiresAt) : "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: () => <div className="text-right">Chi tiết</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelected(row.original)}
            >
              <Eye className="h-3.5 w-3.5" />
              Xem
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      <DataTable
        hideSearch
        serverSide
        data={initialWarranties}
        columns={columns}
        emptyMessage="Chưa có phiếu bảo hành nào."
      />

      <ContextInspector
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={`Chi tiết phiếu bảo hành #${formatShortId(selected?.id ?? "")}`}
        subtitle="Thông tin phạm vi bảo hành và thời hạn hiệu lực."
      >
        {selected ? (
          <div className="space-y-3.5 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Chủ sở hữu</p>
              <p className="font-medium">{selected.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đơn vị bảo hành</p>
              <p className="font-medium">{selected.providerName ?? "—"}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Nguồn kích hoạt</p>
                <p className="font-medium">{formatWarrantySource(selected.source)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Đăng ký hãng</p>
                <p className="font-medium">
                  {formatManufacturerRegistrationStatus(selected.manufacturerRegistrationStatus)}
                </p>
              </div>
            </div>
            {selected.triggerEvidenceRef ? (
              <div>
                <p className="text-xs text-muted-foreground">Mã minh chứng kích hoạt</p>
                <p className="font-mono text-xs font-medium">{selected.triggerEvidenceRef}</p>
              </div>
            ) : null}
            <div>
              <p className="text-xs text-muted-foreground">Phạm vi / Ghi chú</p>
              <p className="font-medium">
                {selected.coverageSummary ||
                  selected.notes ||
                  selected.deviceOrPart}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Bắt đầu</p>
                <p className="font-medium">
                  {selected.startsOn ? formatDate(selected.startsOn) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hết hạn</p>
                <p className="font-medium">
                  {selected.expiresAt ? formatDate(selected.expiresAt) : "—"}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </ContextInspector>
    </>
  );
}
