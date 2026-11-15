import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

const WORKFLOW_STEPS = [
  {
    icon: Building2,
    title: "Đăng ký đối tác",
    detail: "Tổ chức gửi hồ sơ pháp lý và khu vực hoạt động qua cổng đối tác.",
  },
  {
    icon: ClipboardCheck,
    title: "Admin xét duyệt",
    detail: "Quản trị viên đối chiếu thông tin và phê duyệt trạng thái APPROVED.",
  },
  {
    icon: ShieldCheck,
    title: "Đồng bộ phân quyền",
    detail: "Hệ thống tự động cấp quyền ORGANIZATION trên Supabase RBAC.",
  },
  {
    icon: SlidersHorizontal,
    title: "Vận hành trực tiếp",
    detail: "Điều phối kỹ thuật viên, xử lý booking, đơn hàng và bảo hành.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      <header className="border-b border-border bg-card/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Wrench className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              HomeCare Platform
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/register/org">Đăng ký đối tác</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">Đăng nhập</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16 space-y-12">
        <section className="max-w-3xl space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
            HomeCare Operations & Partner Portals
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
            Cổng quản trị và vận hành tập trung kết nối trực tiếp tới hệ thống
            microservices HomeCare API và xác thực Supabase Auth.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button asChild size="lg">
              <Link href="/org">
                Vào Organization Portal
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/admin">
                Vào Admin Portal
                <ShieldCheck className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col justify-between transition-shadow duration-150 hover:shadow-md">
            <CardHeader className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <CardTitle className="text-lg">Admin Portal</CardTitle>
                <CardDescription className="leading-relaxed">
                  Phê duyệt hồ sơ đối tác Organization, giám sát danh sách tài
                  khoản người dùng Supabase, kỹ thuật viên và danh mục dịch vụ —
                  linh kiện toàn nền tảng.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  Xét duyệt / từ chối / tạm ngưng hồ sơ Organization
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  Theo dõi người dùng, kỹ thuật viên và danh mục chuẩn
                </li>
              </ul>
              <Button asChild className="w-full">
                <Link href="/admin">
                  Mở Admin Portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between transition-shadow duration-150 hover:shadow-md">
            <CardHeader className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-bg text-success">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <CardTitle className="text-lg">Organization Portal</CardTitle>
                <CardDescription className="leading-relaxed">
                  Không gian vận hành đa tổ chức dành cho trung tâm bảo hành và
                  đơn vị cung ứng dịch vụ gia đình, vật tư chính hãng.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  Chuyển đổi nhanh giữa nhiều tổ chức trực thuộc
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  Quản lý booking, đơn hàng, kỹ thuật viên, bảo hành & thành viên
                </li>
              </ul>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild className="flex-1">
                  <Link href="/org">
                    Mở Organization Portal
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/register/org">Đăng ký đối tác</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground">
            Quy trình kích hoạt đối tác trên hệ thống
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span>{step.title}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span>HomeCare Services & Commerce Ecosystem</span>
          <span>API Gateway: /api/v1 · Auth: Supabase JWT</span>
        </div>
      </footer>
    </div>
  );
}
