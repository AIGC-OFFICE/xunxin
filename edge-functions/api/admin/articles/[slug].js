import { json, bad, requireAuth } from "../../../lib/auth.js";
import { isValidSlug, RESERVED_SLUGS } from "../../../lib/paths.js";
import { getKV } from "../../../lib/kv.js";
import {
  getArticle,
  putArticle,
  deleteArticle,
  getIndex,
  putIndex,
  validateArticleInput,
  buildArticle,
  articleSummary,
} from "../../../lib/articles.js";

export const onRequestGet = async (context) => {
  const auth = await requireAuth(context);
  if (!auth.ok) return auth.response;

  const slug = context.params.slug;
  if (!isValidSlug(slug)) return bad("Invalid slug");
  const kv = getKV();
  const a = await getArticle(kv, slug);
  if (!a) return json({ error: "Not found" }, { status: 404 });
  return json({ article: a });
};

export const onRequestPut = async (context) => {
  const auth = await requireAuth(context);
  if (!auth.ok) return auth.response;

  const slug = context.params.slug;
  if (!isValidSlug(slug)) return bad("Invalid slug");
  if (RESERVED_SLUGS.has(slug)) return bad("Slug is reserved");

  const kv = getKV();
  const existing = await getArticle(kv, slug);
  if (!existing) return json({ error: "Not found" }, { status: 404 });

  let body;
  try {
    body = await context.request.json();
  } catch {
    return bad("Invalid JSON");
  }

  const { errors, out } = validateArticleInput(body, { isUpdate: true });
  if (errors.length) return json({ errors }, { status: 400 });

  const article = buildArticle({ existing, input: out });
  await putArticle(kv, article);

  const list = await getIndex(kv);
  const idx = list.findIndex((x) => x.slug === slug);
  const summary = articleSummary(article);
  if (idx === -1) list.unshift(summary);
  else list[idx] = summary;
  await putIndex(kv, list);

  return json({ ok: true, article });
};

export const onRequestDelete = async (context) => {
  const auth = await requireAuth(context);
  if (!auth.ok) return auth.response;

  const slug = context.params.slug;
  if (!isValidSlug(slug)) return bad("Invalid slug");
  if (RESERVED_SLUGS.has(slug)) return bad("Slug is reserved");

  const kv = getKV();
  await deleteArticle(kv, slug);
  const list = await getIndex(kv);
  const next = list.filter((x) => x.slug !== slug);
  await putIndex(kv, next);
  return json({ ok: true });
};
