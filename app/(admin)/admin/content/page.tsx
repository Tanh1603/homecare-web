import { CheckCircle2, Server } from "lucide-react";
import { organizationsServerApi } from "@/features/organizations/api/organizations.server";
import { adminApi } from "@/features/admin/api/admin.adapter";
import { PageHeader } from "@/shared/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export default async function AdminContentPage() {
  const [orgs, catalog] = await Promise.all([
    organizationsServerApi.listAll(),
    adminApi.listCatalog(),
  ]);

  const serviceCount = catalog.filter((c) => c.type === "SERVICE").length;
  const productCount = catalog.filter((c) => c.type === "PRODUCT").length;
  const approvedOrgs = orgs.filter((o) => o.status === "APPROVED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nội dung & Dữ liệu hệ thống"
        description="Tổng quan cấu hình tích hợp thực tế giữa Web Portal, API Gateway và Supabase."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Trạng thái kết nối API</CardTitle>
            <Server className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Gateway Base URL</span>
              <code className="rounded bg-muted px-2 py-0.5 text-xs">
                {process.env.NEXT_PUBLIC_API_BASE_URL ||
                  "http://localhost:8080/api/v1"}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Chế độ dữ liệu</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-success">
                <CheckCircle2 className="h-4 w-4" />
                Live API (Không dùng Mock)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Dữ liệu vận hành đang đồng bộ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Đối tác đã phê duyệt
              </span>
              <span className="font-semibold tabular-nums">
                {approvedOrgs} / {orgs.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Dịch vụ đang mở</span>
              <span className="font-semibold tabular-nums">{serviceCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Linh kiện thương mại</span>
              <span className="font-semibold tabular-nums">{productCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
