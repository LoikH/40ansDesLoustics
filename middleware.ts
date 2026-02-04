import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // protège /admin + /api/admin
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  const user = process.env.ADMIN_USER ?? "admin";
  const pass = process.env.ADMIN_PASSWORD ?? "";

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return unauthorized();

  try {
    const base64 = auth.slice("Basic ".length).trim();
    const decoded = atob(base64); // ✅ Edge compatible (Vercel)
    const i = decoded.indexOf(":");
    const u = i >= 0 ? decoded.slice(0, i) : "";
    const p = i >= 0 ? decoded.slice(i + 1) : "";

    if (u === user && p === pass) return NextResponse.next();
    return unauthorized();
  } catch {
    return unauthorized();
  }
}

function unauthorized() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
