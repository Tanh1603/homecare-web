import { orgOpsApi } from "@/features/org-ops/api/org-ops.adapter";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Card } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

export default async function AdminTechniciansPage() {
  const technicians = await orgOpsApi.listTechnicians("all");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Kỹ thuật viên"
        description="Giám sát kỹ thuật viên thuộc các tổ chức đối tác trên toàn nền tảng."
      />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kỹ thuật viên</TableHead>
              <TableHead>Số điện thoại</TableHead>
              <TableHead>Chuyên môn</TableHead>
              <TableHead>Đánh giá</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {technicians.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.fullName}</TableCell>
                <TableCell>{t.phone}</TableCell>
                <TableCell>{t.specialty}</TableCell>
                <TableCell>{t.rating.toFixed(1)} ★</TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
