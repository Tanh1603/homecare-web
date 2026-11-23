import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { extractRolesFromJwt, isAdminRole } from "@/shared/auth/roles";

const PROTECTED_PREFIXES = ["/admin", "/org"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function resolveSafeNext(nextParam: string | null): string | null {
  if (!nextParam || !nextParam.startsWith("/") || nextParam.startsWith("//")) {
    return null;
  }
  return nextParam;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    if (isProtectedPath(request.nextUrl.pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    user &&
    (pathname === "/login" ||
      pathname === "/register/org" ||
      pathname === "/admin" ||
      pathname.startsWith("/admin/"))
  ) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const jwtRoles = extractRolesFromJwt(session?.access_token);
    const appRoles = Array.isArray(user.app_metadata?.roles)
      ? (user.app_metadata.roles as string[])
      : [];
    const roles = Array.from(new Set([...jwtRoles, ...appRoles]));
    const admin = isAdminRole(roles);

    if ((pathname === "/admin" || pathname.startsWith("/admin/")) && !admin) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    if (pathname === "/login") {
      const safeNext = resolveSafeNext(request.nextUrl.searchParams.get("next"));
      const targetPath =
        safeNext &&
        (!(safeNext === "/admin" || safeNext.startsWith("/admin/")) || admin)
          ? safeNext
          : admin
            ? "/admin"
            : "/org";
      return NextResponse.redirect(new URL(targetPath, request.url));
    }

    if (pathname === "/register/org" && admin) {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = "/admin";
      adminUrl.search = "";
      return NextResponse.redirect(adminUrl);
    }
  }

  return response;
}
