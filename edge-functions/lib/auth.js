// Cookie-based session for the admin panel.
// EdgeOne KV is accessed via the bound global variable (e.g. XUNXIN_KV).
// Secrets and config are read from `context.env`.

const COOKIE_NAME = "xunxin_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

const enc = new TextEncoder();
const dec = new TextDecoder();

function bytesToBase64Url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return bytesToBase64Url(new Uint8Array(sig));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function getSecret(env) {
  const s = env.SESSION_SECRET || env.ADMIN_PASSWORD;
  if (!s) throw new Error("SESSION_SECRET or ADMIN_PASSWORD must be set");
  return s;
}

export async function createSession(env) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = bytesToBase64Url(enc.encode(JSON.stringify({ exp, sub: "admin" })));
  const sig = await hmac(getSecret(env), payload);
  return `${payload}.${sig}`;
}

export async function verifySession(token, env) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  let expected;
  try {
    expected = await hmac(getSecret(env), payload);
  } catch {
    return null;
  }
  if (!timingSafeEqual(expected, sig)) return null;
  let data;
  try {
    data = JSON.parse(dec.decode(base64UrlToBytes(payload)));
  } catch {
    return null;
  }
  if (!data || data.exp < Math.floor(Date.now() / 1000)) return null;
  return data;
}

export function readCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export function buildCookie(token, { clear = false } = {}) {
  const maxAge = clear ? 0 : SESSION_TTL_SECONDS;
  const value = clear ? "" : encodeURIComponent(token);
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export const COOKIE = COOKIE_NAME;

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });
}

export function unauthorized(msg = "Unauthorized") {
  return json({ error: msg }, { status: 401 });
}

export function bad(msg) {
  return json({ error: msg }, { status: 400 });
}

// Helper used by every protected handler in lieu of _middleware.js
export async function requireAuth(context) {
  const token = readCookie(context.request, COOKIE_NAME);
  const session = await verifySession(token, context.env);
  if (!session) return { ok: false, response: unauthorized() };
  return { ok: true, session };
}
