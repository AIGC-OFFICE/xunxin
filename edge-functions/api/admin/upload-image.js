import { json, bad, requireAuth } from "../../lib/auth.js";
import { isValidSlot, imageKey, HERO_SLOTS, BUSINESS_CATEGORIES, BUSINESS_SLOTS, IMAGE_KEY_PREFIX } from "../../lib/paths.js";
import { getKV, tryGetKV } from "../../lib/kv.js";

// EdgeOne Edge Functions cap the request body at 1 MB.
// Client-side compression in admin.js keeps uploads well under this.
const MAX_BYTES = 950 * 1024;

export const onRequestGet = async (context) => {
  const auth = await requireAuth(context);
  if (!auth.ok) return auth.response;

  const overrides = {};
  const kv = tryGetKV();
  if (kv) {
    let cursor;
    do {
      const page = await kv.list({ prefix: IMAGE_KEY_PREFIX, limit: 256, cursor });
      for (const k of page.keys || []) {
        const slot = String(k.name || k.key || k).slice(IMAGE_KEY_PREFIX.length);
        overrides[slot] = { key: k.name || k.key || k };
      }
      cursor = page.cursor;
      if (page.complete) break;
    } while (cursor);
  }

  return json({
    heroSlots: HERO_SLOTS,
    businessCategories: BUSINESS_CATEGORIES,
    businessSlots: BUSINESS_SLOTS,
    overrides,
  });
};

export const onRequestPost = async (context) => {
  const auth = await requireAuth(context);
  if (!auth.ok) return auth.response;

  const { request } = context;
  const url = new URL(request.url);
  const slot = url.searchParams.get("slot");
  if (!slot || !isValidSlot(slot)) return bad("Invalid or missing slot");

  // Client compresses to webp and posts the raw bytes (no multipart) to stay under 1 MB.
  const body = await request.arrayBuffer();
  if (!body || body.byteLength === 0) return bad("Empty body");
  if (body.byteLength > MAX_BYTES) return bad(`File too large (max ${MAX_BYTES} bytes)`);

  const kv = getKV();
  await kv.put(imageKey(slot), body);

  return json({ ok: true, slot, size: body.byteLength });
};

export const onRequestDelete = async (context) => {
  const auth = await requireAuth(context);
  if (!auth.ok) return auth.response;

  const url = new URL(context.request.url);
  const slot = url.searchParams.get("slot");
  if (!slot || !isValidSlot(slot)) return bad("Invalid or missing slot");

  const kv = getKV();
  await kv.delete(imageKey(slot));
  return json({ ok: true, slot });
};
