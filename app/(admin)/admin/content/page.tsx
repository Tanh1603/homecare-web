import { PageHeader } from "@/shared/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export default function AdminContentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nội dung & Dữ liệu hệ thống"
        description="Quản lý bài viết hướng dẫn bảo trì, banner và thông báo hệ thống."
      />
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base & Banners</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Module đang sử dụng Mock Adapter. Khi backend bổ sung endpoint
            `/api/v1/admin/content`, chỉ cần nối HTTP Adapter vào
            `features/admin/`.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
