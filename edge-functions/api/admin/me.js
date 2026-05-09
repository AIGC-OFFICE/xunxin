import { json, requireAuth } from "../../lib/auth.js";

export const onRequestGet = async (context) => {
  const auth = await requireAuth(context);
  if (!auth.ok) return auth.response;
  return json({ ok: true, session: auth.session });
};
