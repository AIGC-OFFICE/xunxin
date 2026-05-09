import { tryGetKV } from "../lib/kv.js";
import { isValidSlug, RESERVED_SLUGS } from "../lib/paths.js";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderArticleHtml(a, siteUrl) {
  const title = escapeHtml(a.title);
  const subtitle = escapeHtml(a.subtitle || "");
  const desc = escapeHtml(a.metaDescription || a.subtitle || a.title);
  const keywords = escapeHtml(a.metaKeywords || "");
  const cover = a.coverImage || "/img/business/metal-recycling-1.webp";
  const coverPath = cover.startsWith("/") ? cover : `/${cover}`;
  const coverAbs = cover.startsWith("http") ? cover : `${siteUrl}${coverPath}`;
  const slug = escapeHtml(a.slug);
  const category = escapeHtml(a.category || "行业洞察");
  const categoryColor = escapeHtml(a.categoryColor || "bg-secondary");
  const date = escapeHtml((a.publishedAt || "").slice(0, 10));
  const readMins = Number(a.readMinutes) || 6;
  const updated = escapeHtml(a.updatedAt || a.publishedAt || "");
  const articleUrl = `${siteUrl}/post/${slug}`;
  const body = a.bodyHtml || "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.metaDescription || a.subtitle || a.title,
    image: coverAbs,
    datePublished: a.publishedAt || updated,
    dateModified: updated,
    author: {
      "@type": "Organization",
      name: "循鑫（天津）再生资源有限公司",
      url: siteUrl + "/",
    },
    publisher: {
      "@type": "Organization",
      name: "循鑫（天津）再生资源有限公司",
      logo: {
        "@type": "ImageObject",
        url: siteUrl + "/assets/images/logo/横向logo.svg",
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: siteUrl + "/" },
      { "@type": "ListItem", position: 2, name: "行业洞察", item: siteUrl + "/#insights" },
      { "@type": "ListItem", position: 3, name: a.title },
    ],
  };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | 循鑫（天津）再生资源</title>
    <meta name="description" content="${desc}">
    <meta name="keywords" content="${keywords}">
    <meta name="robots" content="index,follow">
    <meta name="author" content="循鑫（天津）再生资源有限公司">
    <link rel="canonical" href="${articleUrl}">
    <link rel="icon" type="image/svg+xml" href="/assets/images/logo/横向logo.svg">
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/articles/article.css" rel="stylesheet">

    <meta property="og:type" content="article">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:image" content="${coverAbs}">
    <meta property="og:locale" content="zh_CN">
    <meta property="article:published_time" content="${escapeHtml(a.publishedAt || updated)}">
    <meta property="article:section" content="${category}">
    <meta property="article:author" content="循鑫（天津）再生资源有限公司">
    <meta name="twitter:card" content="summary_large_image">

    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
</head>
<body>
    <header class="article-topbar">
        <div class="container d-flex align-items-center justify-content-between">
            <a class="navbar-brand d-flex align-items-center" href="/index.html">
                <img src="/assets/images/logo/横向logo.svg" alt="循鑫再生资源" style="height:40px;">
            </a>
            <nav class="d-none d-md-flex align-items-center gap-3">
                <a href="/#insights" class="text-decoration-none text-muted">← 返回行业洞察</a>
                <a href="/#contact" class="btn btn-success btn-sm">联系采购</a>
            </nav>
        </div>
    </header>

    <main class="article-page">
        <div class="container">
            <nav aria-label="breadcrumb" class="article-breadcrumb">
                <ol class="breadcrumb">
                    <li class="breadcrumb-item"><a href="/">首页</a></li>
                    <li class="breadcrumb-item"><a href="/#insights">行业洞察</a></li>
                    <li class="breadcrumb-item active" aria-current="page">${title}</li>
                </ol>
            </nav>

            <header class="article-header">
                <span class="badge ${categoryColor} mb-3">${category}</span>
                <h1 class="article-title">${title}</h1>
                ${subtitle ? `<p class="article-subtitle">${subtitle}</p>` : ""}
                <div class="article-meta">
                    <span><i class="far fa-calendar-alt me-1"></i>${date}</span>
                    <span class="ms-3"><i class="far fa-clock me-1"></i>${readMins} 分钟阅读</span>
                </div>
            </header>

            <figure class="article-cover">
                <img src="${coverPath}" alt="${title}" loading="eager">
            </figure>

            <article class="article-body">
                ${body}
            </article>

            <hr class="my-5">

            <section class="article-cta text-center">
                <h3 class="mb-3">需要专业再生资源采购评估？</h3>
                <p class="text-muted mb-4">循鑫面向天津及全国 B2B 客户，提供合规、定价、回收一站式服务。</p>
                <a href="/#contact" class="btn btn-success btn-lg">
                    <i class="fas fa-envelope-open-text me-2"></i>联系我们
                </a>
            </section>
        </div>
    </main>

    <footer class="article-footer">
        <div class="container text-center text-muted small py-4">
            © 循鑫（天津）再生资源有限公司
        </div>
    </footer>
</body>
</html>`;
}

export const onRequestGet = async (context) => {
  const { params, env, request } = context;
  const slug = String(params.slug).replace(/\.html?$/i, "");

  if (!isValidSlug(slug) || RESERVED_SLUGS.has(slug)) {
    return new Response("Not found", { status: 404 });
  }

  const kv = tryGetKV();
  if (!kv) return new Response("Not found", { status: 404 });

  const a = await kv.get(`article:${slug}`, { type: "json" });
  if (!a) return new Response("Not found", { status: 404 });

  const siteUrl = (env && env.SITE_URL) || new URL(request.url).origin;
  return new Response(renderArticleHtml(a, siteUrl), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
};
