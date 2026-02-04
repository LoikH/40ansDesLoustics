import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "admin_session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Tout ce qui n'est pas admin => laisse passer
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  // Autorise la page login + l'endpoint login/logout
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/api/admin/login") ||
    pathname.startsWith("/api/admin/logout")
  ) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return NextResponse.json({ error: "AUTH_SECRET missing" }, { status: 500 });

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const ok = token ? await verifySession(token, secret) : false;

  if (ok) return NextResponse.next();

  // Redirect vers login
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

async function verifySession(token: string, secret: string) {
  // token = base64url(payload).base64url(sig)
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payloadB64, sigB64] = parts;
  const payloadJson = safeBase64UrlDecode(payloadB64);
  if (!payloadJson) return false;

  let payload: { u: string; exp: number };
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    return false;
  }

  if (!payload?.u || !payload?.exp) return false;
  if (Date.now() > payload.exp) return false;

  const expectedSig = await hmacSha256Base64Url(payloadB64, secret);
  return timingSafeEqual(sigB64, expectedSig);
}

function safeBase64UrlDecode(b64url: string) {
  try {
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
    return atob(b64);
  } catch {
    return null;
  }
}

async function hmacSha256Base64Url(message: string, secret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return base64UrlEncode(new Uint8Array(sig));
}

function base64UrlEncode(bytes: Uint8Array) {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

// mini timing-safe (Edge-friendly)
function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

