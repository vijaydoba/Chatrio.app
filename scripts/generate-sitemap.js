/**
 * Auto-generates client/public/sitemap.xml
 * Also auto-updates reactSnap.include in client/package.json with ALL URLs
 * so every blog post and story gets prerendered by react-snap on build.
 * Run: node scripts/generate-sitemap.js
 * Runs automatically before every build via "prebuild" in package.json
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = "https://chatrio.app";
const TODAY = new Date().toISOString().split("T")[0];
// Stable lastmod for static + tag-hub pages. Bump only when those pages actually
// change. Using TODAY here would falsely claim every page was modified on every
// build — a signal Google distrusts. Blog posts keep their own real dates.
const SITE_LASTMOD = "2026-09-25";

/* ── Parse TypeScript source with regex ── */

function extractField(src, fieldName) {
  const re = new RegExp(`${fieldName}:\\s*["'\`]([^"'\`]+)["'\`]`, "g");
  const results = [];
  let m;
  while ((m = re.exec(src)) !== null) results.push(m[1]);
  return results;
}

const postsPath    = path.join(__dirname, "../client/src/data/posts.ts");
const pkgPath      = path.join(__dirname, "../client/package.json");

const postsSrc   = fs.readFileSync(postsPath, "utf8");

const slugs      = extractField(postsSrc, "slug");
const dates      = extractField(postsSrc, "date");
const thumbnails = extractField(postsSrc, "thumbnail");

/* ── Parse full post objects (for tag computation) ──
   Block-split on "{ slug:" then pull double-quoted fields, tolerating
   apostrophes and escaped quotes inside titles/excerpts. */
const { getQualifyingTags } = require("../client/src/data/blog-topics.rules.js");

function dq(block, field) {
  const m = block.match(new RegExp(`${field}:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  return m ? m[1].replace(/\\"/g, '"') : "";
}
const postObjects = postsSrc
  .split(/\{\s*\n\s*slug:/)
  .slice(1)
  .map((block) => ({
    title: dq(block, "title"),
    excerpt: dq(block, "excerpt"),
    category: dq(block, "category") || "Chat & Connection",
  }))
  .filter((p) => p.title);

const tagPages = getQualifyingTags(postObjects).map((tag) => ({
  loc: `/blog/tag/${tag.slug}`,
  lastmod: SITE_LASTMOD,
  changefreq: "weekly",
  priority: "0.7",
  image: null,
}));

/* ── Static pages ──
   `sitemap: false` = still prerendered (so no empty CSR shell if crawled) but
   omitted from sitemap.xml. All /blog/<category> filter views are noindex,follow
   (the /blog/tag/* hubs are the one indexable taxonomy), so they're kept out of
   the sitemap — a noindex URL in the sitemap trips GSC's "Submitted URL marked
   noindex" warning. */
const staticPages = [
  // NOTE: /friends is intentionally omitted — it's an auth-gated private user
  // page (noindex,follow), not a public landing page.
  { loc: "/",             lastmod: SITE_LASTMOD, changefreq: "weekly",  priority: "1.0" },
  { loc: "/video-chat",   lastmod: SITE_LASTMOD, changefreq: "weekly",  priority: "0.9" },
  { loc: "/blog",         lastmod: SITE_LASTMOD, changefreq: "weekly",  priority: "0.9" },
  { loc: "/blog/tags",    lastmod: SITE_LASTMOD, changefreq: "weekly",  priority: "0.6" },
  { loc: "/blog/love",          lastmod: SITE_LASTMOD, changefreq: "weekly", priority: "0.7", sitemap: false },
  { loc: "/blog/romance",       lastmod: SITE_LASTMOD, changefreq: "weekly", priority: "0.7", sitemap: false },
  { loc: "/blog/dating",        lastmod: SITE_LASTMOD, changefreq: "weekly", priority: "0.7", sitemap: false },
  { loc: "/blog/relationships", lastmod: SITE_LASTMOD, changefreq: "weekly", priority: "0.7", sitemap: false },
  { loc: "/blog/chat-and-connection", lastmod: SITE_LASTMOD, changefreq: "weekly", priority: "0.7", sitemap: false },
  { loc: "/blog/mental-health", lastmod: SITE_LASTMOD, changefreq: "weekly", priority: "0.7", sitemap: false },
  { loc: "/circles",      lastmod: SITE_LASTMOD, changefreq: "weekly",  priority: "0.8" },
  { loc: "/circles/app",  lastmod: SITE_LASTMOD, changefreq: "monthly", priority: "0.6" },
  { loc: "/blind-date",   lastmod: SITE_LASTMOD, changefreq: "weekly",  priority: "0.8" },
  { loc: "/about",        lastmod: SITE_LASTMOD, changefreq: "monthly", priority: "0.6" },
  { loc: "/editorial-standards", lastmod: SITE_LASTMOD, changefreq: "monthly", priority: "0.5" },
  { loc: "/contact",      lastmod: SITE_LASTMOD, changefreq: "monthly", priority: "0.5" },
  { loc: "/privacy",      lastmod: SITE_LASTMOD, changefreq: "yearly",  priority: "0.4" },
  { loc: "/terms",        lastmod: SITE_LASTMOD, changefreq: "yearly",  priority: "0.4" },
  { loc: "/child-safety", lastmod: SITE_LASTMOD, changefreq: "yearly",  priority: "0.4" },
];

/* ── Blog posts ── */
const postPages = slugs.map((slug, i) => ({
  loc: `/blog/${slug}`,
  lastmod: dates[i] || TODAY,
  changefreq: "monthly",
  priority: "0.8",
  image: thumbnails[i]
    ? `${BASE_URL}/${thumbnails[i].replace(/^\/+/, "")}`
    : null,
}));

/* ── Build sitemap XML ── */
function urlEntry({ loc, lastmod, changefreq, priority, image }) {
  const imageTag = image
    ? `\n    <image:image><image:loc>${image}</image:loc></image:image>`
    : "";
  return `
  <url>
    <loc>${BASE_URL}${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${imageTag}
  </url>`;
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- STATIC PAGES -->
${staticPages.filter((p) => p.sitemap !== false).map(urlEntry).join("\n")}

  <!-- BLOG POSTS -->
${postPages.map(urlEntry).join("\n")}

  <!-- BLOG TAG HUBS -->
${tagPages.map(urlEntry).join("\n")}

</urlset>
`;

const sitemapOut = path.join(__dirname, "../client/public/sitemap.xml");
fs.writeFileSync(sitemapOut, xml, "utf8");
console.log(`✅  sitemap.xml updated — ${staticPages.length} static, ${postPages.length} posts, ${tagPages.length} tag hubs (web stories retired)`);

/* ── Auto-update reactSnap.include in package.json ── */
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const snapInclude = [
  // Static pages (web stories retired — see nginx 410 for /web-stories/*)
  ...staticPages.map(p => p.loc),
  // Every blog post
  ...postPages.map(p => p.loc),
  // Blog tag hubs (must be prerendered — a CSR-only tag page = empty shell)
  ...tagPages.map(p => p.loc),
];

pkg.reactSnap.include = snapInclude;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
console.log(`✅  reactSnap.include updated — ${snapInclude.length} URLs will be prerendered`);
