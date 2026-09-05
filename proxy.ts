import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, isAllowedAdminOrigin, isValidAdminSessionToken } from "./src/lib/adminAuth";

const PUBLIC_PATHS = new Set(["/login", "/api/admin/login"]);

function isPublicAsset(pathname: string) {
  return pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/icons") || pathname.startsWith("/images");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicAsset(pathname) || pathname === "/api/health") {
    return NextResponse.next();
  }

  if (pathname === "/login" && request.headers.get("user-agent")?.includes("ELB-HealthChecker")) {
    return NextResponse.json({ ok: true });
  }

  const valid = await isValidAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);

  const origin = request.headers.get("origin");
  if (
    valid &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    !isAllowedAdminOrigin(origin)
  ) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  if (valid && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (valid) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\.).*)"],
};
