import { json, bad, requireAuth } from "../../lib/auth.js";
import { isValidSlug, RESERVED_SLUGS } from "../../lib/paths.js";
import { getKV } from "../../lib/kv.js";
import {
  getIndex,
  putIndex,
  getArticle,
  putArticle,
  validateArticleInput,
  buildArticle,
  articleSummary,
  CATEGORY_PRESETS,
  COVER_OPTIONS,
} from "../../lib/articles.js";

export const onRequestGet = async (context) => {
  const auth = await requireAuth(context);
  if (!auth.ok) return auth.response;

  const kv = getKV();
  const list = await getIndex(kv);
  return json({
    articles: list,
    categoryPresets: CATEGORY_PRESETS,
    coverOptions: COVER_OPTIONS,
  });
};

export const onRequestPost = async (context) => {
  const auth = await requireAuth(context);
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = await context.request.json();
  } catch {
    return bad("Invalid JSON");
  }

  const { errors, out } = validateArticleInput(body, { isUpdate: false });
  if (errors.length) return json({ errors }, { status: 400 });

  if (!isValidSlug(out.slug)) return bad("Invalid slug");
  if (RESERVED_SLUGS.has(out.slug)) return bad("Slug is reserved");

  const kv = getKV();
  const existing = await getArticle(kv, out.slug);
  if (existing) return json({ error: "Slug already exists" }, { status: 409 });

  const article = buildArticle({ existing: null, input: out });
  await putArticle(kv, article);

  const list = await getIndex(kv);
  list.unshift(articleSummary(article));
  await putIndex(kv, list);

  return json({ ok: true, article });
};
