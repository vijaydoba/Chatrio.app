/**
 * Generates PNG hero banner images for ALL 155 blog posts.
 * Uses Puppeteer (already installed via react-snap).
 *
 * Run:    node scripts/generate-all-banners.js
 * Output: client/public/images/hero-{slug}.png  (1200×630 each)
 *
 * Also updates every thumbnail: field in posts.ts automatically.
 */

const puppeteer = require("../client/node_modules/puppeteer");
const path      = require("path");
const fs        = require("fs");

const POSTS_TS  = path.resolve(__dirname, "../client/src/data/posts.ts");
const OUT_DIR   = path.resolve(__dirname, "../client/public/images");
const LOGO_PATH = path.resolve(__dirname, "../client/build/branding/chatrio-64.png");
const CONCURRENCY = 4; // parallel browser pages

// ── Category → gradient colours ──────────────────────────────────────────────
const COLORS = {
  "Chat & Connection": { from: "#7c3aed", to: "#06b6d4", orb: "rgba(124,58,237,.22)", badge: "#a78bfa", border: "rgba(167,139,250,.3)" },
  "Love":              { from: "#e11d48", to: "#ec4899", orb: "rgba(225,29,72,.20)",   badge: "#fda4af", border: "rgba(253,164,175,.3)" },
  "Romance":           { from: "#db2777", to: "#9333ea", orb: "rgba(219,39,119,.20)",  badge: "#f9a8d4", border: "rgba(249,168,212,.3)" },
  "Dating":            { from: "#ea580c", to: "#f59e0b", orb: "rgba(234,88,12,.20)",   badge: "#fdba74", border: "rgba(253,186,116,.3)" },
  "Relationships":     { from: "#4338ca", to: "#7c3aed", orb: "rgba(67,56,202,.22)",   badge: "#a5b4fc", border: "rgba(165,180,252,.3)" },
  "Mental Health":     { from: "#0d9488", to: "#06b6d4", orb: "rgba(13,148,136,.22)",  badge: "#5eead4", border: "rgba(94,234,212,.3)" },
};
const DEFAULT_COLORS = COLORS["Chat & Connection"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function splitTitle(title) {
  // Split at first colon
  const ci = title.indexOf(":");
  if (ci > 0 && ci < title.length - 1) {
    return [title.slice(0, ci + 1), title.slice(ci + 2).trim()];
  }
  // Split at em/en dash
  for (const sep of [" — ", " – ", " - "]) {
    const di = title.indexOf(sep);
    if (di > 8) return [title.slice(0, di), title.slice(di + sep.length).trim()];
  }
  // Split at midpoint word
  const words = title.split(" ");
  const mid   = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

function readMins(excerpt) {
  const words = (excerpt || "").split(/\s+/).length;
  return Math.max(3, Math.min(15, Math.round((words * 10) / 250)));
}

function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch { return d; }
}

// ── Parse posts.ts ─────────────────────────────────────────────────────────────
function parsePosts(src) {
  const posts = [];
  // Each post: starts with { slug: and ends with category: "...", }
  const re = /\{\s*\n\s*slug:\s*"([^"]+)"([\s\S]*?)category:\s*"([^"]+)",?\s*\n\s*\}/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const [, slug, body, category] = m;

    // title — single line or next-line
    const titleM = body.match(/title:\s*(?:\n\s*)?"((?:[^"\\]|\\.)*)"/);
    // excerpt — single line, next-line double-quote, or backtick
    const excerptM =
      body.match(/excerpt:\s*\n\s*`([\s\S]*?)`/) ||
      body.match(/excerpt:\s*(?:\n\s*)?"((?:[^"\\]|\\.)*)"/) ;
    const dateM = body.match(/date:\s*"([^"]+)"/);

    if (!slug || !titleM) continue;

    posts.push({
      slug,
      title:    titleM[1].replace(/\\"/g, '"'),
      excerpt:  (excerptM ? excerptM[1] : "").replace(/\s+/g, " ").trim().replace(/\\"/g, '"'),
      date:     dateM ? dateM[1] : "2026-06-30",
      category: category.trim(),
    });
  }
  return posts;
}

// ── Build banner HTML ─────────────────────────────────────────────────────────
function bannerHtml(post, logoB64) {
  const c          = COLORS[post.category] || DEFAULT_COLORS;
  const [l1, l2]   = splitTitle(post.title);
  const mins       = readMins(post.excerpt);
  const date       = fmtDate(post.date);
  const excerpt    = post.excerpt.length > 185 ? post.excerpt.slice(0, 182) + "…" : post.excerpt;
  const titleSize  = l1.length > 32 ? "20px" : l1.length > 24 ? "22px" : "24px";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}body{background:#111}
.b{width:600px;height:315px;background:#0b0f14;position:relative;overflow:hidden;
  display:flex;flex-direction:column;justify-content:space-between;
  padding:30px 38px 26px;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.ab{position:absolute;top:0;left:0;right:0;height:3px;
  background:linear-gradient(90deg,${c.from},${c.to});z-index:3}
.o1{position:absolute;border-radius:50%;width:320px;height:320px;
  background:${c.orb};top:-120px;right:-80px;filter:blur(60px)}
.o2{position:absolute;border-radius:50%;width:180px;height:180px;
  background:rgba(6,182,212,.10);bottom:-60px;left:30px;filter:blur(55px)}
.gd{position:absolute;inset:0;
  background-image:linear-gradient(rgba(255,255,255,.024) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(255,255,255,.024) 1px,transparent 1px);
  background-size:40px 40px}
.tr{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2}
.lr{display:flex;align-items:center;gap:7px}
.lr img{width:22px;height:22px;border-radius:5px}
.si{font-size:13px;font-weight:700;color:rgba(231,237,245,.78)}
.bg{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;
  padding:4px 11px;border-radius:999px;border:1px solid ${c.border};color:${c.badge}}
.ta{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;
  justify-content:center;padding:8px 0 6px}
.pt{font-size:${titleSize};font-weight:800;line-height:1.26;color:#f0f4f8;letter-spacing:-.3px}
.g{background:linear-gradient(135deg,${c.badge},${c.to});
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.ex{font-size:11.5px;line-height:1.6;color:#8fa5bc;margin-top:7px;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bot{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2}
.mt{font-size:10.5px;color:#5d6e82}
.btn{font-size:11.5px;font-weight:700;padding:7px 18px;border-radius:999px;border:none;
  color:#fff;background:linear-gradient(135deg,${c.from},${c.to});letter-spacing:.3px;cursor:pointer}
</style></head><body>
<div class="b">
  <div class="ab"></div><div class="o1"></div><div class="o2"></div><div class="gd"></div>
  <div class="tr">
    <div class="lr">
      <img src="data:image/png;base64,${logoB64}" alt="">
      <span class="si">chatrio.app</span>
    </div>
    <span class="bg">${esc(post.category)}</span>
  </div>
  <div class="ta">
    <div class="pt">
      <span class="g">${esc(l1)}</span>${l2 ? "<br>" + esc(l2) : ""}
    </div>
    <div class="ex">${esc(excerpt)}</div>
  </div>
  <div class="bot">
    <span class="mt">${date} · ${mins} min read</span>
    <button class="btn">Read Article →</button>
  </div>
</div>
</body></html>`;
}

// ── Screenshot chunk on a single reused page ──────────────────────────────────
async function processChunk(posts, logoB64, browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 700, height: 400, deviceScaleFactor: 2 });

  for (const post of posts) {
    const outPath = path.join(OUT_DIR, `hero-${post.slug}.png`);
    try {
      await page.setContent(bannerHtml(post, logoB64), { waitUntil: "domcontentloaded" });
      const el = await page.$(".b");
      await el.screenshot({ path: outPath, type: "png" });
      process.stdout.write(`  ✓  ${post.slug}\n`);
    } catch (err) {
      process.stdout.write(`  ✗  ${post.slug}: ${err.message}\n`);
    }
  }
  await page.close();
}

// ── Update all thumbnails in posts.ts ────────────────────────────────────────
function updateThumbnails(src, posts) {
  let out = src;
  for (const post of posts) {
    // Replace thumbnail inside this post's block
    // Pattern: after the post's slug appears, find the next thumbnail: "..." within 600 chars
    const escapedSlug = post.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      `(slug:\\s*"${escapedSlug}"[\\s\\S]{1,600}?thumbnail:\\s*)"[^"]+"`,
      "g"
    );
    out = out.replace(re, `$1"/images/hero-${post.slug}.png"`);
  }
  return out;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const SLUG_FILTER = process.env.SLUG_FILTER
  ? process.env.SLUG_FILTER.split(",").map(s => s.trim())
  : null;

async function run() {
  const src   = fs.readFileSync(POSTS_TS, "utf-8");
  let posts = parsePosts(src);
  console.log(`\nParsed ${posts.length} posts from posts.ts`);
  if (SLUG_FILTER) {
    posts = posts.filter(p => SLUG_FILTER.includes(p.slug));
    console.log(`Filtered to ${posts.length} posts via SLUG_FILTER`);
  }

  if (posts.length === 0) {
    console.error("No posts parsed — check the regex.");
    process.exit(1);
  }

  const logoB64 = fs.readFileSync(LOGO_PATH).toString("base64");

  console.log("Launching browser (4 parallel pages)...\n");
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    headless: true,
  });

  // Split into equal chunks for parallel processing
  const chunks = Array.from({ length: CONCURRENCY }, (_, i) =>
    posts.filter((_, j) => j % CONCURRENCY === i)
  );

  await Promise.all(chunks.map(chunk => processChunk(chunk, logoB64, browser)));
  await browser.close();

  // Update posts.ts
  console.log("\nUpdating thumbnail paths in posts.ts...");
  const updated = updateThumbnails(src, posts);
  fs.writeFileSync(POSTS_TS, updated);

  // Verify
  const missing = posts.filter(
    p => !fs.existsSync(path.join(OUT_DIR, `hero-${p.slug}.png`))
  );
  if (missing.length) {
    console.warn(`\n⚠ Missing banners (${missing.length}):`);
    missing.forEach(p => console.warn("  -", p.slug));
  }

  console.log(`\n✅  Done — ${posts.length - missing.length}/${posts.length} banners saved`);
  console.log(`    Output: client/public/images/hero-*.png`);
  console.log(`    posts.ts thumbnails updated ✓`);
}

run().catch(err => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
