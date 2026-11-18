import { Star, Wrench } from "lucide-react";
import { orgOpsApi } from "@/features/org-ops/api/org-ops.adapter";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { EmptyState } from "@/shared/ui/empty-state";
import { Card } from "@/shared/ui/card";
import { ServerPagination } from "@/shared/ui/server-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

export default async function AdminTechniciansPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { items: technicians, pagination } =
    await orgOpsApi.listTechniciansPage("all", page, 20, true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Kỹ thuật viên"
        description="Giám sát kỹ thuật viên thuộc các tổ chức đối tác trên toàn nền tảng (bao gồm tạm ngưng)."
      />
      {technicians.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Chưa có kỹ thuật viên nào"
          description="Danh sách kỹ thuật viên được lấy trực tiếp từ Provider Service (/api/v1/technicians)."
        />
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kỹ thuật viên</TableHead>
                  <TableHead>Chuyên môn</TableHead>
                  <TableHead>Kinh nghiệm</TableHead>
                  <TableHead>Đánh giá</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {technicians.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.fullName}</TableCell>
                    <TableCell>{t.specialty}</TableCell>
                    <TableCell>
                      {t.experienceYears !== undefined
                        ? `${t.experienceYears} năm`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 font-medium">
                        {t.rating.toFixed(1)}
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <ServerPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            basePath="/admin/technicians"
          />
        </>
      )}
    </div>
  );
}
