import { adminApi } from "@/features/admin/api/admin.adapter";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { formatVnd } from "@/shared/lib/utils";

export default async function AdminCatalogPage() {
  const catalog = await adminApi.listCatalog();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh mục Thiết bị, Dịch vụ & Sản phẩm"
        description="Quản lý taxonomy chuẩn dùng chung cho Mobile và Organization Portal."
      />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loại</TableHead>
              <TableHead>Tên danh mục</TableHead>
              <TableHead>Nhóm</TableHead>
              <TableHead>Giá tham chiếu</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalog.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Badge variant="outline">{item.type}</Badge>
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {item.category}
                </TableCell>
                <TableCell>
                  {item.basePrice ? formatVnd(item.basePrice) : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
