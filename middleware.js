import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me"
);

const PUBLIC = ["/login", "/api/auth/login"];
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // CSRF: for state-changing API calls, require the Origin to match the host.
  if (pathname.startsWith("/api/") && MUTATING.has(req.method)) {
    const origin = req.headers.get("origin");
    if (origin) {
      let sameHost = false;
      try {
        sameHost = new URL(origin).host === req.headers.get("host");
      } catch {}
      if (!sameHost) {
        return NextResponse.json({ error: "Bad origin" }, { status: 403 });
      }
    }
  }

  if (
    PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("nm_session")?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, secret);
      valid = true;
    } catch {}
  }

  if (valid) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
