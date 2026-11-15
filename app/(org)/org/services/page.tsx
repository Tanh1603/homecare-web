import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { requireOrgContext } from "@/shared/auth/guards";
import { adminApi } from "@/features/admin/api/admin.adapter";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { EmptyState } from "@/shared/ui/empty-state";
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

export default async function OrgServicesPage() {
  const ctx = await requireOrgContext();
  if (ctx.activeOrganization.organizationStatus !== "APPROVED") {
    redirect("/org/status");
  }

  const services = (await adminApi.listCatalog()).filter(
    (c) => c.type === "SERVICE"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dịch vụ cung cấp"
        description="Danh sách dịch vụ sửa chữa & bảo dưỡng hiện có trên Provider Service."
      />
      {services.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Chưa có dịch vụ nào"
          description="Danh sách dịch vụ sẽ tự động hiển thị khi Provider Service cung cấp dữ liệu (/api/v1/services)."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên dịch vụ</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead>Thời lượng dự kiến</TableHead>
                <TableHead>Giá niêm yết</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.category}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.durationMinutes ? `${s.durationMinutes} phút` : "—"}
                  </TableCell>
                  <TableCell>
                    {s.basePrice ? formatVnd(s.basePrice) : "Liên hệ"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
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
