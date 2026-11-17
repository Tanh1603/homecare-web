"use client";

import * as React from "react";
import { Eye } from "lucide-react";
import type { OrgWarrantyItem } from "../api/org-ops.adapter";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
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
                  {w.customerName}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {w.startsOn ? formatDate(w.startsOn) : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(w.expiresAt)}
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

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Chi tiết phiếu bảo hành #{formatShortId(selected?.id ?? "")}
            </DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Chủ sở hữu</p>
                <p className="font-medium">{selected.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Đơn vị bảo hành</p>
                <p className="font-medium">{selected.providerName ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phạm vi / Ghi chú</p>
                <p className="font-medium">
                  {selected.coverageSummary || selected.notes || selected.deviceOrPart}
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
                  <p className="font-medium">{formatDate(selected.expiresAt)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
