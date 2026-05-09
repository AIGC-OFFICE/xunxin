export const HERO_SLOTS = ["hero/hero-1.webp", "hero/hero-2.webp", "hero/hero-3.webp"];

export const BUSINESS_CATEGORIES = [
  { key: "metal-recycling", label: "生产性废旧金属回收" },
  { key: "appliance-recycling", label: "企业 IT 资产合规报废" },
  { key: "jewelry-recycling", label: "工业贵金属材料提取回收" },
  { key: "machinery-recycling", label: "废旧机械回收" },
  { key: "renewable-recycling", label: "再生资源回收" },
  { key: "steel-demolition", label: "钢结构拆除与回收" },
];

export const BUSINESS_SLOTS = BUSINESS_CATEGORIES.flatMap((c) =>
  [1, 2, 3].map((i) => `business/${c.key}-${i}.webp`)
);

export const ALL_IMAGE_SLOTS = new Set([...HERO_SLOTS, ...BUSINESS_SLOTS]);

export function isValidSlot(slot) {
  return ALL_IMAGE_SLOTS.has(slot);
}

// KV key conventions inside the single namespace
export const IMAGE_KEY_PREFIX = "image:"; // image:hero/hero-1.webp -> raw bytes (re-encoded webp)
export const ARTICLE_KEY_PREFIX = "article:"; // article:<slug> -> JSON
export const ARTICLE_INDEX_KEY = "articles:index"; // JSON list of summaries

export function imageKey(slot) {
  return `${IMAGE_KEY_PREFIX}${slot}`;
}

export const ARTICLE_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,80}[a-z0-9])?$/;

export function isValidSlug(s) {
  return typeof s === "string" && ARTICLE_SLUG_RE.test(s);
}

// Reserved slugs — these are static HTML files in /articles and cannot be used by new posts
export const RESERVED_SLUGS = new Set([
  "metal-purity-identification-guide",
  "demolition-safety-risk-management",
  "enterprise-waste-compliance-guide",
  "2026-scrap-metal-price-trends",
]);
