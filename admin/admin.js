// ============================================================
// 循鑫管理后台前端
// ============================================================

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
    images: null,
    activeBizCategory: null,
    articles: [],
    categoryPresets: [],
    coverOptions: [],
    editing: null,
};

// ---------------- Toast ----------------
let toastTimer;
function toast(msg, type = "info") {
    const el = $("#toast");
    el.textContent = msg;
    el.className = `toast-msg ${type}`;
    el.classList.remove("d-none");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add("d-none"), 3200);
}

// ---------------- API 包装 ----------------
async function api(path, opts = {}) {
    const init = { credentials: "same-origin", ...opts };
    if (opts.body && !(opts.body instanceof FormData) && typeof opts.body !== "string") {
        init.headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
        init.body = JSON.stringify(opts.body);
    }
    const res = await fetch(path, init);
    let data = null;
    try {
        data = await res.json();
    } catch {
        // ignore
    }
    if (!res.ok) {
        const msg = (data && (data.error || (data.errors && data.errors.join(", ")))) || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}

// ---------------- 登录流程 ----------------
async function checkAuth() {
    try {
        await api("/api/admin/me");
        showApp();
    } catch (e) {
        if (e.status === 401) showLogin();
        else {
            toast("无法连接服务：" + e.message, "error");
            showLogin();
        }
    }
}

function showLogin() {
    $("#loginView").classList.remove("d-none");
    $("#appView").classList.add("d-none");
    $("#loginPassword").focus();
}

function showApp() {
    $("#loginView").classList.add("d-none");
    $("#appView").classList.remove("d-none");
    loadImages();
    loadArticles();
}

$("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pwd = $("#loginPassword").value;
    const errBox = $("#loginError");
    errBox.classList.add("d-none");
    try {
        await api("/api/login", { method: "POST", body: { password: pwd } });
        $("#loginPassword").value = "";
        showApp();
    } catch (err) {
        errBox.textContent = err.message || "登录失败";
        errBox.classList.remove("d-none");
    }
});

$("#logoutBtn").addEventListener("click", async () => {
    try {
        await api("/api/logout", { method: "POST" });
    } catch {
        // ignore
    }
    showLogin();
});

// ---------------- 标签切换 ----------------
$$(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        $$(".tab-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        $$(".tab-panel").forEach((p) => p.classList.add("d-none"));
        $(`#tab-${btn.dataset.tab}`).classList.remove("d-none");
    });
});

// ---------------- 图片管理 ----------------
async function loadImages() {
    try {
        const data = await api("/api/admin/upload-image");
        state.images = data;
        if (!state.activeBizCategory && data.businessCategories.length) {
            state.activeBizCategory = data.businessCategories[0].key;
        }
        renderHeroGrid();
        renderBusinessNav();
        renderBusinessGrid();
    } catch (e) {
        toast("加载图片配置失败：" + e.message, "error");
    }
}

function renderHeroGrid() {
    const grid = $("#heroGrid");
    grid.innerHTML = "";
    state.images.heroSlots.forEach((slot, idx) => {
        grid.appendChild(makeImageCard(slot, `Hero 图 ${idx + 1}`));
    });
}

function renderBusinessNav() {
    const nav = $("#businessNav");
    nav.innerHTML = "";
    state.images.businessCategories.forEach((cat) => {
        const btn = document.createElement("button");
        btn.textContent = cat.label;
        btn.dataset.cat = cat.key;
        if (cat.key === state.activeBizCategory) btn.classList.add("active");
        btn.addEventListener("click", () => {
            state.activeBizCategory = cat.key;
            $$("#businessNav button").forEach((b) => b.classList.toggle("active", b.dataset.cat === cat.key));
            renderBusinessGrid();
        });
        nav.appendChild(btn);
    });
}

function renderBusinessGrid() {
    const grid = $("#businessGrid");
    grid.innerHTML = "";
    const slots = state.images.businessSlots.filter((s) =>
        s.startsWith(`business/${state.activeBizCategory}-`)
    );
    slots.forEach((slot, idx) => {
        grid.appendChild(makeImageCard(slot, `图 ${idx + 1}`));
    });
}

function makeImageCard(slot, label) {
    const card = document.createElement("div");
    card.className = "image-card";
    card.dataset.slot = slot;
    const isOverridden = state.images.overrides && state.images.overrides[slot];
    const cacheBust = `?v=${Date.now()}`;
    card.innerHTML = `
        <div class="img-wrap">
            <img src="/img/${slot}${cacheBust}" alt="${slot}" loading="lazy">
        </div>
        <div class="meta">
            <span class="slot-name" title="${slot}">${label}</span>
            ${isOverridden ? '<span class="badge-overridden">已替换</span>' : ""}
        </div>
        <div class="actions">
            <button class="btn btn-sm btn-success btn-upload"><i class="fas fa-upload me-1"></i>替换</button>
            ${isOverridden ? '<button class="btn btn-sm btn-outline-secondary btn-revert"><i class="fas fa-undo me-1"></i>恢复</button>' : ""}
        </div>
    `;

    const upload = card.querySelector(".btn-upload");
    upload.addEventListener("click", (e) => {
        e.stopPropagation();
        triggerFilePick(slot, card);
    });
    card.addEventListener("click", () => triggerFilePick(slot, card));

    const revert = card.querySelector(".btn-revert");
    if (revert) {
        revert.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (!confirm("恢复为系统默认图片？已上传的版本会被删除。")) return;
            try {
                await api(`/api/admin/upload-image?slot=${encodeURIComponent(slot)}`, { method: "DELETE" });
                toast("已恢复默认图片", "success");
                await loadImages();
            } catch (err) {
                toast("恢复失败：" + err.message, "error");
            }
        });
    }

    // 拖拽上传
    card.addEventListener("dragover", (e) => {
        e.preventDefault();
        card.classList.add("dragover");
    });
    card.addEventListener("dragleave", () => card.classList.remove("dragover"));
    card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("dragover");
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) uploadImage(slot, file, card);
    });

    return card;
}

function triggerFilePick(slot, card) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/webp,image/jpeg,image/png,image/avif";
    input.addEventListener("change", () => {
        if (input.files && input.files[0]) uploadImage(slot, input.files[0], card);
    });
    input.click();
}

// Compress an image File to a webp Blob within size budget.
// EdgeOne caps request body at 1 MB; we aim for 900 KB to leave headroom.
async function compressToWebp(file, { maxWidth = 1920, maxHeight = 1280, targetBytes = 900 * 1024 } = {}) {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const w = Math.round(bitmap.width * ratio);
    const h = Math.round(bitmap.height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close && bitmap.close();

    let quality = 0.85;
    let blob = await new Promise((res) => canvas.toBlob(res, "image/webp", quality));
    while (blob && blob.size > targetBytes && quality > 0.4) {
        quality -= 0.1;
        blob = await new Promise((res) => canvas.toBlob(res, "image/webp", quality));
    }
    if (!blob) throw new Error("浏览器不支持 webp 压缩");
    if (blob.size > targetBytes) throw new Error("压缩后仍超过 900 KB，请改用更小的原图");
    return blob;
}

async function uploadImage(slot, file, card) {
    card.classList.add("busy");
    try {
        const blob = await compressToWebp(file);
        const res = await fetch(`/api/admin/upload-image?slot=${encodeURIComponent(slot)}`, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "image/webp" },
            body: blob,
        });
        let data = null;
        try { data = await res.json(); } catch { /* ignore */ }
        if (!res.ok) {
            throw new Error((data && data.error) || `HTTP ${res.status}`);
        }
        toast("上传成功", "success");
        await loadImages();
    } catch (err) {
        toast("上传失败：" + err.message, "error");
    } finally {
        card.classList.remove("busy");
    }
}

// ---------------- 文章管理 ----------------
async function loadArticles() {
    try {
        const data = await api("/api/admin/articles");
        state.articles = data.articles || [];
        state.categoryPresets = data.categoryPresets || [];
        state.coverOptions = data.coverOptions || [];
        renderArticles();
    } catch (e) {
        toast("加载文章列表失败：" + e.message, "error");
    }
}

function renderArticles() {
    const list = $("#articleList");
    list.innerHTML = "";
    if (state.articles.length === 0) {
        list.innerHTML = `
            <div class="article-empty">
                <i class="far fa-newspaper fa-2x mb-3 d-block"></i>
                还没有发布过新文章。点击右上角"发布新文章"开始。
            </div>
        `;
        return;
    }

    state.articles.forEach((a) => {
        const row = document.createElement("div");
        row.className = "article-row";
        const coverUrl = (a.coverImage || "").startsWith("/") ? a.coverImage : "/" + a.coverImage;
        row.innerHTML = `
            <img class="cover" src="${coverUrl}" alt="${escapeHtml(a.title)}" loading="lazy">
            <div>
                <div class="title">${escapeHtml(a.title)}</div>
                <div class="meta">
                    <span><i class="fas fa-tag me-1"></i>${escapeHtml(a.category)}</span>
                    <span><i class="far fa-calendar-alt me-1"></i>${(a.publishedAt || "").slice(0, 10)}</span>
                    <span><i class="far fa-clock me-1"></i>${a.readMinutes || 6} 分钟</span>
                    <a href="/post/${a.slug}" target="_blank" class="text-success"><i class="fas fa-external-link-alt me-1"></i>查看</a>
                </div>
            </div>
            <div class="actions">
                <button class="btn btn-sm btn-outline-success btn-edit"><i class="fas fa-pen me-1"></i>编辑</button>
                <button class="btn btn-sm btn-outline-danger btn-delete"><i class="fas fa-trash"></i></button>
            </div>
        `;
        row.querySelector(".btn-edit").addEventListener("click", () => openEditor(a.slug));
        row.querySelector(".btn-delete").addEventListener("click", () => deleteArticle(a.slug, a.title));
        list.appendChild(row);
    });
}

async function deleteArticle(slug, title) {
    if (!confirm(`确定删除文章「${title}」？此操作不可撤销。`)) return;
    try {
        await api(`/api/admin/articles/${encodeURIComponent(slug)}`, { method: "DELETE" });
        toast("已删除", "success");
        await loadArticles();
    } catch (e) {
        toast("删除失败：" + e.message, "error");
    }
}

// ---------------- 编辑器 ----------------
$("#newArticleBtn").addEventListener("click", () => openEditor(null));
$("#editorClose").addEventListener("click", closeEditor);
$("#editorPreviewBtn").addEventListener("click", refreshPreview);
$("#editorSaveBtn").addEventListener("click", saveArticle);
$("#f-bodyMarkdown").addEventListener("input", debouncePreview);
$("#f-title").addEventListener("input", autoSlug);

let previewTimer;
function debouncePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(refreshPreview, 250);
}

function autoSlug() {
    if (state.editing) return; // don't auto-slug while editing existing
    const slugField = $("#f-slug");
    if (slugField.dataset.touched === "1") return;
    const title = $("#f-title").value.trim();
    slugField.value = slugify(title);
}

$("#f-slug").addEventListener("input", () => {
    $("#f-slug").dataset.touched = "1";
});

function slugify(s) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9一-龥\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/[一-龥]/g, "")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}

async function openEditor(slug) {
    populateCategorySelect();
    populateCoverPicker();

    if (slug) {
        try {
            const data = await api(`/api/admin/articles/${encodeURIComponent(slug)}`);
            state.editing = data.article;
            fillEditor(data.article);
            $("#editorTitle").textContent = "编辑文章";
        } catch (e) {
            toast("加载文章失败：" + e.message, "error");
            return;
        }
    } else {
        state.editing = null;
        clearEditor();
        $("#editorTitle").textContent = "发布新文章";
    }

    $("#editorOverlay").classList.remove("d-none");
    document.body.style.overflow = "hidden";
    refreshPreview();
}

function closeEditor() {
    $("#editorOverlay").classList.add("d-none");
    document.body.style.overflow = "";
    state.editing = null;
}

function clearEditor() {
    ["f-title", "f-slug", "f-subtitle", "f-readMinutes", "f-metaDescription", "f-metaKeywords", "f-bodyMarkdown"].forEach((id) => {
        $("#" + id).value = "";
    });
    $("#f-slug").dataset.touched = "";
    $("#f-slug").disabled = false;
    $("#f-publishedAt").value = new Date().toISOString().slice(0, 10);
    $("#f-category").value = state.categoryPresets[0]?.label || "";
    selectCover(state.coverOptions[0]);
    $("#preview").innerHTML = "";
}

function fillEditor(a) {
    $("#f-title").value = a.title || "";
    $("#f-slug").value = a.slug || "";
    $("#f-slug").disabled = true; // slug is immutable
    $("#f-subtitle").value = a.subtitle || "";
    $("#f-readMinutes").value = a.readMinutes || "";
    $("#f-publishedAt").value = (a.publishedAt || "").slice(0, 10);
    $("#f-category").value = a.category || "";
    $("#f-metaDescription").value = a.metaDescription || "";
    $("#f-metaKeywords").value = a.metaKeywords || "";
    $("#f-bodyMarkdown").value = a.bodyMarkdown || "";
    selectCover(a.coverImage);
}

function populateCategorySelect() {
    const sel = $("#f-category");
    sel.innerHTML = state.categoryPresets
        .map((c) => `<option value="${c.label}">${c.label}</option>`)
        .join("");
}

function populateCoverPicker() {
    const wrap = $("#coverPicker");
    wrap.innerHTML = "";
    state.coverOptions.forEach((src) => {
        const div = document.createElement("div");
        div.className = "pick";
        div.dataset.src = src;
        const url = src.startsWith("/") ? src : "/" + src;
        div.innerHTML = `<img src="${url}" alt="" loading="lazy">`;
        div.addEventListener("click", () => selectCover(src));
        wrap.appendChild(div);
    });
}

function selectCover(src) {
    $$("#coverPicker .pick").forEach((p) => {
        p.classList.toggle("active", p.dataset.src === src);
    });
}

function getSelectedCover() {
    const active = $("#coverPicker .pick.active");
    return active ? active.dataset.src : null;
}

function collectForm() {
    const data = {
        title: $("#f-title").value.trim(),
        subtitle: $("#f-subtitle").value.trim(),
        category: $("#f-category").value,
        coverImage: getSelectedCover(),
        publishedAt: $("#f-publishedAt").value,
        metaDescription: $("#f-metaDescription").value.trim(),
        metaKeywords: $("#f-metaKeywords").value.trim(),
        bodyMarkdown: $("#f-bodyMarkdown").value,
    };
    const rm = parseInt($("#f-readMinutes").value, 10);
    if (rm && rm > 0) data.readMinutes = rm;
    if (!state.editing) data.slug = $("#f-slug").value.trim();
    return data;
}

async function saveArticle() {
    const data = collectForm();
    const errors = [];
    if (!data.title) errors.push("标题");
    if (!state.editing && !data.slug) errors.push("URL slug");
    if (!data.category) errors.push("分类");
    if (!data.coverImage) errors.push("封面图");
    if (!data.bodyMarkdown.trim()) errors.push("正文");
    if (errors.length) {
        toast("缺少必填项：" + errors.join("、"), "error");
        return;
    }
    if (!state.editing && !/^[a-z0-9](?:[a-z0-9-]{1,80}[a-z0-9])?$/.test(data.slug)) {
        toast("URL slug 只能包含英文小写字母、数字和连字符", "error");
        return;
    }

    $("#editorSaveBtn").disabled = true;
    $("#editorStatus").textContent = "保存中…";
    try {
        if (state.editing) {
            await api(`/api/admin/articles/${encodeURIComponent(state.editing.slug)}`, {
                method: "PUT",
                body: data,
            });
            toast("保存成功", "success");
        } else {
            await api("/api/admin/articles", { method: "POST", body: data });
            toast("发布成功", "success");
        }
        closeEditor();
        await loadArticles();
    } catch (e) {
        toast(e.message || "保存失败", "error");
    } finally {
        $("#editorSaveBtn").disabled = false;
        $("#editorStatus").textContent = "";
    }
}

// ---------------- Markdown 预览（前端简版） ----------------
function refreshPreview() {
    const md = $("#f-bodyMarkdown").value;
    $("#preview").innerHTML = clientMarkdown(md);
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function clientMarkdown(md) {
    if (!md) return '<p class="text-muted">在左侧编辑后点击"预览刷新"看效果</p>';
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    const out = [];
    let i = 0;

    const inline = (s) => {
        s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`);
        s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        s = s.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
        s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) =>
            /^(https?:|mailto:|\/|#)/.test(u) ? `<a href="${u}" target="_blank">${t}</a>` : t
        );
        return s;
    };

    while (i < lines.length) {
        const line = lines[i];
        const h = /^(#{1,4})\s+(.+)$/.exec(line);
        if (h) {
            const level = h[1].length + 1;
            out.push(`<h${level}>${inline(escapeHtml(h[2]))}</h${level}>`);
            i++;
            continue;
        }
        if (/^---+\s*$/.test(line)) { out.push("<hr>"); i++; continue; }
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
        if (line.trim() === "") { i++; continue; }
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
        if (buf.length) out.push(`<p>${inline(escapeHtml(buf.join(" ")))}</p>`);
    }
    return out.join("\n");
}

// ---------------- 启动 ----------------
checkAuth();
