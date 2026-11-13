import Link from "next/link";
import { ArrowRight, Building2, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-xs">
            <Wrench className="h-3.5 w-3.5 text-primary" />
            HomeCare Operations Platform
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            HomeCare Web Portals
          </h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
            Cổng quản trị hệ thống và vận hành dành cho đối tác dịch vụ gia đình,
            kỹ thuật viên và linh kiện chính hãng.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle>Admin Portal</CardTitle>
              <CardDescription>
                Quản trị người dùng, phê duyệt hồ sơ đối tác Organization, danh mục
                thiết bị/dịch vụ/linh kiện và nội dung hệ thống.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/admin">
                  Mở Admin Portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-success-bg text-success">
                <Building2 className="h-5 w-5" />
              </div>
              <CardTitle>Organization Portal</CardTitle>
              <CardDescription>
                Vận hành dịch vụ, điều phối kỹ thuật viên, xử lý booking, đơn hàng
                linh kiện và kích hoạt bảo hành điện tử.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href="/org">
                  Mở Organization Portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/register/org">Đăng ký trở thành đối tác</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-primary hover:underline"
          >
            Đăng nhập bằng tài khoản HomeCare (Supabase Auth) →
          </Link>
        </div>
      </div>
    </div>
  );
}
