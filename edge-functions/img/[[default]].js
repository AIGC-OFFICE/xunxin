import { ALL_IMAGE_SLOTS, imageKey } from "../lib/paths.js";
import { tryGetKV } from "../lib/kv.js";

// Serves /img/<slot>. If the admin uploaded a replacement, return that from KV.
// Otherwise fall back to the bundled static asset at /assets/images/<slot>.
export const onRequestGet = async (context) => {
  const { request, params } = context;
  const segs = Array.isArray(params.default) ? params.default : [params.default];
  const slot = segs.join("/");

  if (!ALL_IMAGE_SLOTS.has(slot)) {
    return new Response("Not found", { status: 404 });
  }

  const kv = tryGetKV();
  if (kv) {
    const buf = await kv.get(imageKey(slot), { type: "arrayBuffer" });
    if (buf) {
      return new Response(buf, {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=300, must-revalidate",
        },
      });
    }
  }

  // Fall back to the bundled static asset
  const fallbackUrl = new URL(`/assets/images/${slot}`, request.url);
  return fetch(fallbackUrl);
};
