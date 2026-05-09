import { createSession, buildCookie, json, bad } from "../lib/auth.js";

export const onRequestPost = async ({ request, env }) => {
  if (!env.ADMIN_PASSWORD) {
    return json({ error: "ADMIN_PASSWORD not configured" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Invalid JSON");
  }

  const password = body && typeof body.password === "string" ? body.password : "";
  if (password.length === 0) return bad("Password required");

  const a = password;
  const b = env.ADMIN_PASSWORD;
  if (a.length !== b.length) {
    return json({ error: "Wrong password" }, { status: 401 });
  }
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  if (r !== 0) return json({ error: "Wrong password" }, { status: 401 });

  const token = await createSession(env);
  return json({ ok: true }, { headers: { "Set-Cookie": buildCookie(token) } });
};

export const onRequest = () => json({ error: "Method not allowed" }, { status: 405 });
