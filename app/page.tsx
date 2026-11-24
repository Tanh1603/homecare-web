import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Home,
  LogIn,
  LogOut,
  Package,
  UsersRound,
  Wrench,
} from "lucide-react";

import { getServerAuthContext, type AuthContext } from "@/shared/auth/guards";
import { isAdminRole } from "@/shared/auth/roles";
import { organizationsServerApi } from "@/features/organizations/api/organizations.server";
import type { OrganizationMembership } from "@/features/organizations/contracts/organization";
import { GatewayApiError } from "@/shared/api/api-envelope";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/ui/error-state";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { redirect } from "next/navigation";

const HIGHLIGHTS = [
  {
    icon: UsersRound,
    title: "Quản lý đối tác",
    description: "Hồ sơ, phê duyệt và phân quyền nhanh chóng.",
  },
  {
    icon: Wrench,
    title: "Điều phối dịch vụ",
    description: "Kỹ thuật viên, lịch hẹn và đơn dịch vụ.",
  },
  {
    icon: Package,
    title: "Quản lý sản phẩm",
    description: "Dịch vụ, linh kiện và vật tư chính hãng.",
  },
] as const;

function getEntryErrorMessage(error: unknown): string {
  const status = error instanceof GatewayApiError
    ? error.status
    : typeof error === "object" && error !== null && "status" in error
      ? Number(error.status)
      : undefined;
  const errorCode =
    error instanceof GatewayApiError
      ? error.errorCode
      : typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : undefined;

  if (isExpiredSessionError(error)) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.";
  if (status === 403) return "Tài khoản hiện không có quyền xem thông tin tổ chức.";
  if (errorCode === "GATEWAY_UNAVAILABLE" || error instanceof TypeError || status === 502) {
    return "Không thể kết nối tới HomeCare. Vui lòng kiểm tra kết nối mạng rồi thử lại.";
  }
  if (status !== undefined && status >= 500) {
    return "Máy chủ HomeCare đang gặp sự cố. Thông tin tổ chức chưa thể tải lúc này.";
  }
  return "Không thể xác minh trạng thái tài khoản. Vui lòng thử lại sau.";
}

function isExpiredSessionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const status = "status" in error ? Number(error.status) : undefined;
  const code =
    error instanceof GatewayApiError
      ? error.errorCode
      : "code" in error
        ? String(error.code)
        : undefined;
  return (
    status === 401 ||
    code === "session_expired" ||
    code === "refresh_token_not_found" ||
    code === "refresh_token_already_used"
  );
}

function HomeEntryError({
  message,
  loginRequired = false,
}: {
  message: string;
  loginRequired?: boolean;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-5 py-12 sm:px-8">
      <ErrorState title="Chưa thể mở không gian HomeCare" message={message} />
      <div className="mt-4 flex justify-center gap-3">
        {loginRequired ? (
          <Button asChild>
            <Link href="/login">Đăng nhập lại</Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/">Thử lại</Link>
          </Button>
        )}
      </div>
    </main>
  );
}

export default async function HomePage() {
  let auth: AuthContext | null;
  try {
    auth = await getServerAuthContext();
  } catch (error) {
    return (
      <HomeEntryError
        message={getEntryErrorMessage(error)}
        loginRequired={isExpiredSessionError(error)}
      />
    );
  }

  if (auth && isAdminRole(auth.roles)) redirect("/admin");

  let memberships: OrganizationMembership[] | undefined;
  if (auth) {
    try {
      memberships = await organizationsServerApi.listMyMemberships();
    } catch (error) {
      const status = error instanceof GatewayApiError ? error.status : undefined;
      return (
        <div className="flex min-h-dvh flex-col bg-surface text-foreground">
          <header className="flex h-18 items-center justify-between border-b border-border/80 px-5 sm:px-8">
            <Link href="/" aria-label="Trang chủ HomeCare" className="text-xl font-bold tracking-[-0.03em]">
              <Image src="/homecare-logo.svg" alt="HomeCare" width={34} height={34} className="inline-block size-8.5 object-contain" />
              <span className="ml-2">HomeCare</span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="hidden max-w-52 truncate text-xs text-muted-foreground sm:block">{auth.email}</span>
              <ThemeToggle singleButton />
            </div>
          </header>
          <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-12 sm:px-8">
            <ErrorState title="Chưa thể xác minh tổ chức" message={getEntryErrorMessage(error)} />
            <div className="mt-4 flex justify-center gap-3">
              {status === 401 ? (
                <Button asChild><Link href="/login">Đăng nhập lại</Link></Button>
              ) : (
                <Button asChild variant="outline"><Link href="/">Thử lại</Link></Button>
              )}
              <form action={signOut}>
                <Button type="submit" variant="ghost"><LogOut aria-hidden="true" />Đăng xuất</Button>
              </form>
            </div>
          </main>
        </div>
      );
    }
    if (memberships.length > 0) redirect("/org");
  }

  async function signOut() {
    "use server";
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect("/");
  }

  if (auth) {
    return (
      <div className="flex min-h-dvh flex-col bg-surface text-foreground">
        <header className="flex h-18 items-center justify-between border-b border-border/80 px-5 sm:px-8">
          <Link href="/" aria-label="Trang chủ HomeCare" className="text-xl font-bold tracking-[-0.03em]">
            <Image src="/homecare-logo.svg" alt="HomeCare" width={34} height={34} className="inline-block size-8.5 object-contain" />
            <span className="ml-2">HomeCare</span>
          </Link>
          <div className="flex items-center gap-3">
            <span title={auth.email} className="hidden max-w-52 truncate text-xs text-muted-foreground sm:block">{auth.email}</span>
            <ThemeToggle singleButton />
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" aria-label={`Đăng xuất tài khoản ${auth.email}`}>
                <LogOut aria-hidden="true" className="size-4" />
                Đăng xuất
              </Button>
            </form>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-5 py-16 sm:px-8 lg:px-10">
          <section className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">Xin chào, {auth.email}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Đăng ký tổ chức để bắt đầu cùng HomeCare
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              Tạo hồ sơ tổ chức để quản lý dịch vụ và tham gia mạng lưới đối tác HomeCare.
            </p>
            <Button asChild size="lg" className="mt-7">
              <Link href="/register/org">Đăng ký tổ chức<ArrowRight aria-hidden="true" className="size-4" /></Link>
            </Button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface text-foreground">
      {/* Fixed Header: luôn cố định khi cuộn trang */}
      <header className="fixed inset-x-0 top-0 z-40 h-18 border-b border-border/80 bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link
            href="/"
            aria-label="Trang chủ HomeCare"
            className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
          >
            <Image
              src="/homecare-logo.svg"
              alt="HomeCare"
              width={34}
              height={34}
              priority
              className="size-8.5 object-contain"
            />
            <span className="text-xl font-bold tracking-[-0.03em] text-foreground">
              HomeCare
            </span>
          </Link>

          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <ThemeToggle singleButton />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col pt-18">
        {/* Full-bleed Hero */}
        <section className="relative flex flex-1 items-center overflow-hidden bg-surface py-12 sm:py-16 lg:min-h-135 lg:py-20">
          {/* Subtle mint wave accent at bottom-left */}
          <svg
            aria-hidden="true"
            viewBox="0 0 900 180"
            preserveAspectRatio="none"
            className="pointer-events-none absolute bottom-0 left-0 z-0 h-28 w-[72%] max-w-205 text-accent"
          >
            <path
              d="M0 110 C 180 180, 420 40, 900 165 L 900 180 L 0 180 Z"
              fill="currentColor"
            />
          </svg>

          {/* Desktop full-bleed right technician image with seamless left fade */}
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[56%] lg:block">
            <Image
              src="/images/homecare-service-hero.jpg"
              alt="Kỹ thuật viên HomeCare bảo dưỡng máy lạnh tại nhà"
              fill
              priority
              unoptimized
              sizes="56vw"
              className="object-cover object-[center_22%]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-r from-surface via-surface/75 via-22% to-transparent"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-surface/70 to-transparent"
            />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-foreground">
                <Home className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Nền tảng dịch vụ gia đình</span>
              </div>

              <h1 className="mt-6 text-[clamp(2.15rem,3.6vw,3.15rem)] font-bold leading-[1.15] tracking-[-0.03em] text-foreground">
                Kết nối đối tác,
                <span className="mt-1 block">
                  vận hành dịch vụ{" "}
                  <span className="relative inline-block whitespace-nowrap text-[#16A34A] dark:text-[#22C55E]">
                    tại nhà
                    {/* Top-right burst rays */}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 28 24"
                      fill="none"
                      className="pointer-events-none absolute -right-6 -top-3 h-5 w-6 text-[#16A34A] dark:text-[#22C55E]"
                    >
                      <path
                        d="M5 14L9 5M14 14L20 9M17 20L25 19"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Curved underline */}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 180 12"
                      fill="none"
                      className="pointer-events-none absolute -bottom-1.5 left-0 w-full text-[#16A34A] dark:text-[#22C55E]"
                    >
                      <path
                        d="M3 8.5C48 3 125 2.5 177 6.5"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </span>
              </h1>

              <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
                Quản lý đối tác, kỹ thuật viên, dịch vụ và sản phẩm trên một nền
                tảng duy nhất.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-11 gap-2 px-5 text-sm font-semibold"
                >
                  <Link href="/register/org">
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    Đăng ký đối tác
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-11 gap-2 px-5 text-sm font-semibold"
                >
                  <Link href="/login">
                    <LogIn
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                    />
                    Đăng nhập
                  </Link>
                </Button>
              </div>
            </div>

            {/* Mobile hero image */}
            <div className="relative mt-8 h-65 overflow-hidden rounded-2xl border border-border sm:h-85 lg:hidden">
              <Image
                src="/images/homecare-service-hero.jpg"
                alt="Kỹ thuật viên HomeCare bảo dưỡng máy lạnh tại nhà"
                fill
                priority
                unoptimized
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>
          </div>
        </section>

        {/* Bottom Highlights Strip */}
        <section className="relative z-10 border-t border-border/80 bg-surface">
          <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-7 sm:grid-cols-3 sm:px-8 lg:px-10">
            {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                  <Icon
                    aria-hidden="true"
                    className="h-5 w-5"
                    strokeWidth={1.9}
                  />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h2 className="text-sm font-semibold text-foreground">
                    {title}
                  </h2>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
