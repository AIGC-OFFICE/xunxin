import { buildCookie, json } from "../lib/auth.js";

export const onRequestPost = async () =>
  json({ ok: true }, { headers: { "Set-Cookie": buildCookie("", { clear: true }) } });

export const onRequest = () => json({ error: "Method not allowed" }, { status: 405 });
