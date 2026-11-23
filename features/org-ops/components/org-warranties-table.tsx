"use client";

import * as React from "react";
import { Eye } from "lucide-react";
import type { OrgWarrantyItem } from "../api/org-ops.adapter";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ContextInspector } from "@/shared/ui/context-inspector";
import { StatusBadge } from "@/shared/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
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

  return (
    <>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã BH</TableHead>
              <TableHead>Thiết bị / Nội dung bảo hành</TableHead>
              <TableHead>Khách hàng / Nguồn</TableHead>
              <TableHead>Đăng ký hãng</TableHead>
              <TableHead>Bắt đầu</TableHead>
              <TableHead>Hết hạn</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialWarranties.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-mono text-xs" title={w.id}>
                  #{formatShortId(w.id)}
                </TableCell>
                <TableCell className="font-medium">{w.deviceOrPart}</TableCell>
                <TableCell className="text-muted-foreground">
                  <div>{w.customerName}</div>
                  <div className="text-xs">{formatWarrantySource(w.source)}</div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatManufacturerRegistrationStatus(w.manufacturerRegistrationStatus)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {w.startsOn ? formatDate(w.startsOn) : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {w.expiresAt ? formatDate(w.expiresAt) : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={w.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelected(w)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Xem
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

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
