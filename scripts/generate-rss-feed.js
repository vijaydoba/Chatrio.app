/**
 * Auto-generates client/public/rss.xml from client/src/data/posts.ts.
 * Run: node scripts/generate-rss-feed.js
 * Runs automatically before every build via "prebuild" in package.json.
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = "https://chatrio.app";
const FEED_TITLE = "Chatrio Blog";
const FEED_DESCRIPTION =
  "Chat tips, dating & relationship advice, and modern chat/dating slang from Chatrio — free anonymous chat with strangers.";
const MAX_ITEMS = 30;

const postsPath = path.join(__dirname, "../client/src/data/posts.ts");
const postsSrc = fs.readFileSync(postsPath, "utf8");

function dq(block, field) {
  const m = block.match(new RegExp(`${field}:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  return m ? m[1].replace(/\\"/g, '"') : "";
}

const posts = postsSrc
  .split(/\{\s*\n\s*slug:/)
  .slice(1)
  .map((block) => ({
    slug: dq("slug:" + block, "slug"),
    title: dq(block, "title"),
    excerpt: dq(block, "excerpt"),
    date: dq(block, "date"),
  }))
  .filter((p) => p.slug && p.title && p.date)
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, MAX_ITEMS);

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function rfc822(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toUTCString();
}

const items = posts
  .map(
    (p) => `
  <item>
    <title>${esc(p.title)}</title>
    <link>${BASE_URL}/blog/${p.slug}</link>
    <guid isPermaLink="true">${BASE_URL}/blog/${p.slug}</guid>
    <pubDate>${rfc822(p.date)}</pubDate>
    <description>${esc(p.excerpt)}</description>
  </item>`
  )
  .join("");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${esc(FEED_TITLE)}</title>
  <link>${BASE_URL}/blog</link>
  <description>${esc(FEED_DESCRIPTION)}</description>
  <language>en-us</language>
  <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />${items}
</channel>
</rss>
`;

const out = path.join(__dirname, "../client/public/rss.xml");
fs.writeFileSync(out, xml, "utf8");
console.log(`✅  rss.xml updated — ${posts.length} posts`);
