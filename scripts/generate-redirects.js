/**
 * Auto-generates ../nginx-blog-redirects.conf from POST_REDIRECTS in
 * client/src/data/posts.ts.
 *
 * WHY: consolidated / renamed blog posts are redirected client-side by a
 * <Navigate> in BlogPost.tsx — but that returns HTTP 200 to crawlers. The old
 * slugs are no longer prerendered, so nginx's `try_files ... =404` answers them
 * with a bare 404. That is exactly the "Not found (404)" pile-up flagged in
 * Search Console. Emitting real 301s at the nginx layer turns those into
 * permanent redirects and consolidates their ranking signals onto the keeper.
 *
 * Run:   node scripts/generate-redirects.js   (also runs via client "prebuild")
 * Apply: paste the generated block into the chatrio.app server{} in
 *        /etc/nginx/sites-available/chatrio on the VPS (that's where the blog
 *        301s already live), BEFORE the generic
 *        `location /blog/ { try_files ... =404; }` rule, then:
 *          sudo nginx -t && sudo systemctl reload nginx
 */
const fs = require("fs");
const path = require("path");

const postsPath = path.join(__dirname, "../client/src/data/posts.ts");
const outPath = path.join(__dirname, "../nginx-blog-redirects.conf");

const src = fs.readFileSync(postsPath, "utf8");

// Live keeper slugs — used to sanity-check that no redirect points at a 404.
const slugs = new Set([...src.matchAll(/\bslug:\s*"([^"]+)"/g)].map((m) => m[1]));

// Parse the POST_REDIRECTS object literal.
const block = src.match(/POST_REDIRECTS[^{]*\{([\s\S]*?)\n\};/);
if (!block) {
  console.error("❌  Could not find POST_REDIRECTS in posts.ts");
  process.exit(1);
}
const pairs = [...block[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)].map((m) => ({
  from: m[1],
  to: m[2],
}));

// Some redirects point at a slug that is itself a redirect key (old →
// consolidated-dupe → keeper). Resolve the chain so we emit a DIRECT 301 to the
// final keeper — crawlers never hit a 301→301 chain, which Google penalizes.
const redirectMap = Object.fromEntries(pairs.map((p) => [p.from, p.to]));
function resolve(slug, seen = new Set()) {
  if (seen.has(slug)) return slug; // cycle guard
  seen.add(slug);
  return redirectMap[slug] ? resolve(redirectMap[slug], seen) : slug;
}

// Slugs are [a-z0-9-] so nothing needs escaping, but guard the regex anyway.
const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

let warnings = 0;
const lines = pairs.map(({ from, to }) => {
  const target = resolve(to);
  if (!slugs.has(target)) {
    console.warn(`⚠️  redirect target is not a live slug: ${from} → ${target}`);
    warnings++;
  }
  return `location ~ ^/blog/${reEscape(from)}/?$ { return 301 /blog/${target}; }`;
});

const conf = `# ─── AUTO-GENERATED — do not edit by hand ───────────────────────────────────
# Source: client/src/data/posts.ts (POST_REDIRECTS)
# Regenerate: node scripts/generate-redirects.js  (also runs on client prebuild)
#
# Real 301s for consolidated / renamed blog posts. Without these the old slugs
# 404 for crawlers (BlogPost.tsx's <Navigate> only redirects JS clients).
# Paste into the chatrio.app server{} in /etc/nginx/sites-available/chatrio
# BEFORE the generic
#   location /blog/ { try_files $uri $uri/ =404; }
# rule, then:  sudo nginx -t && sudo systemctl reload nginx
#
# ${pairs.length} redirects.

${lines.join("\n")}
`;

fs.writeFileSync(outPath, conf, "utf8");
console.log(
  `✅  nginx-blog-redirects.conf updated — ${pairs.length} 301s` +
    (warnings ? `, ${warnings} warning(s)` : "")
);
