import { tryGetKV } from "../lib/kv.js";
import { getIndex } from "../lib/articles.js";

export const onRequestGet = async () => {
  const kv = tryGetKV();
  const list = kv ? await getIndex(kv) : [];
  return new Response(JSON.stringify({ articles: list }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
};
