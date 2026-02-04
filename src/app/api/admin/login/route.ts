import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'admin_session';

export async function POST(req: Request) {
  const { username, password } = await req
    .json()
    .catch(() => ({ username: '', password: '' }));

  const ADMIN_USER = process.env.ADMIN_USER ?? '';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
  const AUTH_SECRET = process.env.AUTH_SECRET ?? '';

  if (!ADMIN_USER || !ADMIN_PASSWORD || !AUTH_SECRET) {
    return NextResponse.json(
      { ok: false, message: 'Server config missing' },
      { status: 500 }
    );
  }

  if (username !== ADMIN_USER || password !== ADMIN_PASSWORD) {
    return NextResponse.json(
      { ok: false, message: 'Bad credentials' },
      { status: 401 }
    );
  }

  // session 7 jours
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = JSON.stringify({ u: username, exp });
  const payloadB64 = base64UrlEncodeString(payload);

  const sig = await hmacSha256Base64Url(payloadB64, AUTH_SECRET);
  const token = `${payloadB64}.${sig}`;

  const res = NextResponse.json({ ok: true });

  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true, // en local http ça passe quand même souvent, sinon mets conditionnel
    sameSite: 'lax',
    path: '/',
    expires: new Date(exp),
  });

  return res;
}

function base64UrlEncodeString(str: string) {
  const b64 = btoa(str);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmacSha256Base64Url(message: string, secret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return base64UrlEncodeBytes(new Uint8Array(sig));
}

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
