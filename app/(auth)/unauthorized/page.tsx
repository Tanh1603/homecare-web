import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle>Không có quyền truy cập</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tài khoản của bạn chưa được cấp quyền truy cập phân hệ này. Vui lòng
            liên hệ quản trị viên hoặc đăng nhập bằng tài khoản phù hợp.
          </p>
          <div className="flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/">Về trang chủ</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Đăng nhập lại</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
