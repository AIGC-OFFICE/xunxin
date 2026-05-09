import { ARTICLE_INDEX_KEY, ARTICLE_KEY_PREFIX, isValidSlug, RESERVED_SLUGS } from "./paths.js";

export const CATEGORY_PRESETS = [
  { label: "技术指南", color: "bg-success" },
  { label: "安全规范", color: "bg-warning text-dark" },
  { label: "合规指南", color: "bg-info" },
  { label: "趋势分析", color: "bg-primary" },
  { label: "市场观察", color: "bg-secondary" },
  { label: "案例分析", color: "bg-dark" },
];

// Cover paths use the /img/ route so that admin-uploaded overrides apply automatically.
export const COVER_OPTIONS = [
  "/img/business/metal-recycling-1.webp",
  "/img/business/metal-recycling-2.webp",
  "/img/business/metal-recycling-3.webp",
  "/img/business/appliance-recycling-1.webp",
  "/img/business/appliance-recycling-2.webp",
  "/img/business/appliance-recycling-3.webp",
  "/img/business/jewelry-recycling-1.webp",
  "/img/business/jewelry-recycling-2.webp",
  "/img/business/jewelry-recycling-3.webp",
  "/img/business/machinery-recycling-1.webp",
  "/img/business/machinery-recycling-2.webp",
  "/img/business/machinery-recycling-3.webp",
  "/img/business/renewable-recycling-1.webp",
  "/img/business/renewable-recycling-2.webp",
  "/img/business/renewable-recycling-3.webp",
  "/img/business/steel-demolition-1.webp",
  "/img/business/steel-demolition-2.webp",
  "/img/business/steel-demolition-3.webp",
  "/img/hero/hero-1.webp",
  "/img/hero/hero-2.webp",
  "/img/hero/hero-3.webp",
];

export function articleKey(slug) {
  return `${ARTICLE_KEY_PREFIX}${slug}`;
}

// `kv` is the EdgeOne-bound KV namespace (passed as a global variable from the
// caller's scope, since EdgeOne KV bindings are global-named, not env-attached).
export async function getIndex(kv) {
  if (!kv) return [];
  const arr = await kv.get(ARTICLE_INDEX_KEY, { type: "json" });
  return Array.isArray(arr) ? arr : [];
}

export async function putIndex(kv, list) {
  await kv.put(ARTICLE_INDEX_KEY, JSON.stringify(list));
}

export async function getArticle(kv, slug) {
  if (!kv || !isValidSlug(slug)) return null;
  return await kv.get(articleKey(slug), { type: "json" });
}

export async function putArticle(kv, article) {
  await kv.put(articleKey(article.slug), JSON.stringify(article));
}

export async function deleteArticle(kv, slug) {
  await kv.delete(articleKey(slug));
}

export function validateArticleInput(input, { isUpdate = false } = {}) {
  const errors = [];
  const out = {};
  if (!input || typeof input !== "object") {
    errors.push("body must be an object");
    return { errors, out };
  }

  if (!isUpdate) {
    if (!isValidSlug(input.slug)) errors.push("slug must match [a-z0-9-]");
    if (RESERVED_SLUGS.has(input.slug)) errors.push("slug is reserved");
    out.slug = input.slug;
  }

  const required = ["title", "category", "coverImage", "bodyMarkdown"];
  for (const k of required) {
    if (typeof input[k] !== "string" || input[k].trim().length === 0) {
      errors.push(`${k} is required`);
    } else {
      out[k] = input[k].trim();
    }
  }

  for (const k of ["subtitle", "categoryColor", "metaDescription", "metaKeywords"]) {
    if (typeof input[k] === "string") out[k] = input[k].trim();
  }

  if (typeof input.readMinutes === "number" && input.readMinutes >= 1 && input.readMinutes <= 60) {
    out.readMinutes = Math.round(input.readMinutes);
  }

  if (typeof input.publishedAt === "string" && /^\d{4}-\d{2}-\d{2}/.test(input.publishedAt)) {
    out.publishedAt = input.publishedAt;
  }

  return { errors, out };
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(s) {
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, url) => {
    const safeUrl = /^(https?:|mailto:|\/|#)/.test(url) ? url : "#";
    return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
  });
  return s;
}

export function markdownToHtml(md) {
  if (typeof md !== "string") return "";
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;

  const flushParagraph = (buf) => {
    if (buf.length === 0) return;
    out.push(`<p>${inline(escapeHtml(buf.join(" ")))}</p>`);
  };

  while (i < lines.length) {
    const line = lines[i];

    const h = /^(#{1,4})\s+(.+)$/.exec(line);
    if (h) {
      const level = h[1].length + 1;
      out.push(`<h${level}>${inline(escapeHtml(h[2].trim()))}</h${level}>`);
      i++;
      continue;
    }

    if (/^---+\s*$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${inline(escapeHtml(buf.join(" ")))}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      out.push(`<ul>${items.map((x) => `<li>${inline(escapeHtml(x))}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      out.push(`<ol>${items.map((x) => `<li>${inline(escapeHtml(x))}</li>`).join("")}</ol>`);
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{1,4}\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i])
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    flushParagraph(buf);
  }

  return out.join("\n");
}

export function buildArticle({ existing, input }) {
  const now = new Date().toISOString();
  const slug = existing ? existing.slug : input.slug;
  const merged = { ...existing, ...input, slug };
  if (!merged.publishedAt) merged.publishedAt = now;
  if (!merged.readMinutes) {
    const words = (merged.bodyMarkdown || "").length / 2.5;
    merged.readMinutes = Math.max(3, Math.min(20, Math.round(words / 250)));
  }
  if (!merged.subtitle) merged.subtitle = "";
  if (!merged.categoryColor) {
    const preset = CATEGORY_PRESETS.find((p) => p.label === merged.category);
    merged.categoryColor = preset ? preset.color : "bg-secondary";
  }
  if (!merged.metaDescription) {
    merged.metaDescription = (merged.bodyMarkdown || "").slice(0, 140).replace(/\n+/g, " ");
  }
  merged.bodyHtml = markdownToHtml(merged.bodyMarkdown);
  merged.updatedAt = now;
  return merged;
}

export function articleSummary(a) {
  return {
    slug: a.slug,
    title: a.title,
    subtitle: a.subtitle || "",
    category: a.category,
    categoryColor: a.categoryColor || "bg-secondary",
    coverImage: a.coverImage,
    readMinutes: a.readMinutes,
    publishedAt: a.publishedAt,
    updatedAt: a.updatedAt,
    metaDescription: a.metaDescription || "",
  };
}
