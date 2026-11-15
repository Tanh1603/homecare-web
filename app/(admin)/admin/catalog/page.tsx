import { FolderTree } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.adapter";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
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
        title="Danh mục Dịch vụ & Sản phẩm"
        description="Danh mục dịch vụ bảo trì và linh kiện thực tế đang cung cấp trên HomeCare API."
      />
      {catalog.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="Chưa có dữ liệu danh mục"
          description="Kiểm tra kết nối API Gateway (/api/v1/services, /api/v1/products) hoặc khởi tạo dữ liệu dịch vụ và sản phẩm."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loại</TableHead>
                <TableHead>Tên danh mục</TableHead>
                <TableHead>Nhóm</TableHead>
                <TableHead>Đơn vị cung cấp</TableHead>
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
                  <TableCell className="text-muted-foreground">
                    {item.providerName ?? "—"}
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
      )}
    </div>
  );
}
