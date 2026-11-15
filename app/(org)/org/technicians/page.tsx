import { redirect } from "next/navigation";
import { Star, Users } from "lucide-react";
import { requireOrgContext } from "@/shared/auth/guards";
import { orgOpsApi } from "@/features/org-ops/api/org-ops.adapter";
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

export default async function OrgTechniciansPage() {
  const ctx = await requireOrgContext();
  if (ctx.activeOrganization.organizationStatus !== "APPROVED") {
    redirect("/org/status");
  }

  const technicians = await orgOpsApi.listTechnicians(
    ctx.activeOrganization.organizationId
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đội ngũ Kỹ thuật viên"
        description="Quản lý kỹ thuật viên và chuyên môn thuộc tổ chức của bạn."
      />
      {technicians.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Chưa có kỹ thuật viên"
          description="Tổ chức hiện chưa có kỹ thuật viên nào được gắn trên Provider Service."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Họ tên</TableHead>
                <TableHead>Profile ID</TableHead>
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
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {t.phone}
                  </TableCell>
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
      )}
    </div>
  );
}
