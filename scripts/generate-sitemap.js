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

/* ── Parse TypeScript source with regex ── */

function extractField(src, fieldName) {
  const re = new RegExp(`${fieldName}:\\s*["'\`]([^"'\`]+)["'\`]`, "g");
  const results = [];
  let m;
  while ((m = re.exec(src)) !== null) results.push(m[1]);
  return results;
}

const postsPath    = path.join(__dirname, "../client/src/data/posts.ts");
const storiesPath  = path.join(__dirname, "../client/src/data/stories.ts");
const pkgPath      = path.join(__dirname, "../client/package.json");

const postsSrc   = fs.readFileSync(postsPath, "utf8");
const storiesSrc = fs.readFileSync(storiesPath, "utf8");

const slugs      = extractField(postsSrc, "slug");
const dates      = extractField(postsSrc, "date");
const thumbnails = extractField(postsSrc, "thumbnail");
const storyIds   = extractField(storiesSrc, "id");

/* ── Static pages ── */
const staticPages = [
  { loc: "/",             lastmod: TODAY, changefreq: "weekly",  priority: "1.0" },
  { loc: "/blog",         lastmod: TODAY, changefreq: "weekly",  priority: "0.9" },
  { loc: "/web-stories",  lastmod: TODAY, changefreq: "weekly",  priority: "0.8" },
  { loc: "/blog/love",    lastmod: TODAY, changefreq: "weekly",  priority: "0.7" },
  { loc: "/blog/romance", lastmod: TODAY, changefreq: "weekly",  priority: "0.7" },
  { loc: "/blog/dating",  lastmod: TODAY, changefreq: "weekly",  priority: "0.7" },
  { loc: "/circles",      lastmod: TODAY, changefreq: "weekly",  priority: "0.8" },
  { loc: "/about",        lastmod: TODAY, changefreq: "monthly", priority: "0.6" },
  { loc: "/contact",      lastmod: TODAY, changefreq: "monthly", priority: "0.5" },
  { loc: "/privacy",      lastmod: TODAY, changefreq: "yearly",  priority: "0.4" },
  { loc: "/terms",        lastmod: TODAY, changefreq: "yearly",  priority: "0.4" },
];

/* ── Blog posts ── */
const postPages = slugs.map((slug, i) => ({
  loc: `/blog/${slug}`,
  lastmod: dates[i] || TODAY,
  changefreq: "monthly",
  priority: "0.8",
  image: thumbnails[i] ? `${BASE_URL}/${thumbnails[i]}` : null,
}));

/* ── Google Web Story pages (AMP) ── */
const webStoryPages = storyIds.map((id) => ({
  loc: `/web-stories/${id}/`,
  lastmod: TODAY,
  changefreq: "monthly",
  priority: "0.8",
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
${staticPages.map(urlEntry).join("\n")}

  <!-- BLOG POSTS -->
${postPages.map(urlEntry).join("\n")}

  <!-- GOOGLE WEB STORIES (AMP) — /stories/ React routes excluded: canonical points here -->
${webStoryPages.map(urlEntry).join("\n")}

</urlset>
`;

const sitemapOut = path.join(__dirname, "../client/public/sitemap.xml");
fs.writeFileSync(sitemapOut, xml, "utf8");
console.log(`✅  sitemap.xml updated — ${staticPages.length} static, ${postPages.length} posts, ${webStoryPages.length} web stories (React /stories/ routes excluded from sitemap)`);

/* ── Auto-update reactSnap.include in package.json ── */
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const snapInclude = [
  // Static pages (includes /web-stories; /stories/* is retired — see nginx 301s)
  ...staticPages.map(p => p.loc),
  // Every blog post
  ...postPages.map(p => p.loc),
];

pkg.reactSnap.include = snapInclude;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
console.log(`✅  reactSnap.include updated — ${snapInclude.length} URLs will be prerendered (stories excluded — covered by AMP)`);
