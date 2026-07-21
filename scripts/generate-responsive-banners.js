/**
 * Generate responsive banner sizes for different viewports:
 * - hero-{slug}.png      → 1200×630 (original, for full blog header)
 * - hero-{slug}-sm.png   → 400×210  (card thumbnail, mobile)
 * - hero-{slug}-md.png   → 600×315  (card thumbnail, tablet)
 * - hero-{slug}-lg.png   → 800×420  (card thumbnail, desktop)
 *
 * Run:    node scripts/generate-responsive-banners.js
 * Output: client/public/images/hero-{slug}-*.png
 */

const puppeteer = require("../client/node_modules/puppeteer");
const path      = require("path");
const fs        = require("fs");

const POSTS_TS  = path.resolve(__dirname, "../client/src/data/posts.ts");
const OUT_DIR   = path.resolve(__dirname, "../client/public/images");
const LOGO_PATH = path.resolve(__dirname, "../client/build/branding/chatrio-64.png");

const SIZES = [
  { name: "sm", w: 400, h: 210, scale: 1 },  // mobile card
  { name: "md", w: 600, h: 315, scale: 1 },  // tablet card
  { name: "lg", w: 800, h: 420, scale: 1 },  // desktop card
];

function parsePosts(src) {
  const posts = [];
  const re = /\{\s*\n\s*slug:\s*"([^"]+)"([\s\S]*?)category:\s*"([^"]+)",?\s*\n\s*\}/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const [, slug, body, category] = m;
    const titleM = body.match(/title:\s*(?:\n\s*)?"((?:[^"\\]|\\.)*)"/) || [];
    const excerptM =
      body.match(/excerpt:\s*\n\s*`([\s\S]*?)`/) ||
      body.match(/excerpt:\s*(?:\n\s*)?"((?:[^"\\]|\\.)*)"/) ||
      [];
    const dateM = body.match(/date:\s*"([^"]+)"/) || [];

    if (!slug || !titleM[1]) continue;

    posts.push({
      slug,
      title: titleM[1].replace(/\\"/g, '"'),
      excerpt: (excerptM[1] || "").replace(/\s+/g, " ").trim().replace(/\\"/g, '"'),
      date: dateM[1] || "2026-06-30",
      category: category.trim(),
    });
  }
  return posts;
}

const COLORS = {
  "Chat & Connection": { from: "#7c3aed", to: "#06b6d4", orb: "rgba(124,58,237,.22)", badge: "#a78bfa" },
  "Love":              { from: "#e11d48", to: "#ec4899", orb: "rgba(225,29,72,.20)",   badge: "#fda4af" },
  "Romance":           { from: "#db2777", to: "#9333ea", orb: "rgba(219,39,119,.20)",  badge: "#f9a8d4" },
  "Dating":            { from: "#ea580c", to: "#f59e0b", orb: "rgba(234,88,12,.20)",   badge: "#fdba74" },
  "Relationships":     { from: "#4338ca", to: "#7c3aed", orb: "rgba(67,56,202,.22)",   badge: "#a5b4fc" },
  "Mental Health":     { from: "#0d9488", to: "#06b6d4", orb: "rgba(13,148,136,.22)",  badge: "#5eead4" },
};
const DEFAULT_COLORS = COLORS["Chat & Connection"];

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function splitTitle(title) {
  const ci = title.indexOf(":");
  if (ci > 0 && ci < title.length - 1) {
    return [title.slice(0, ci + 1), title.slice(ci + 2).trim()];
  }
  for (const sep of [" — ", " – ", " - "]) {
    const di = title.indexOf(sep);
    if (di > 8) return [title.slice(0, di), title.slice(di + sep.length).trim()];
  }
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
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return d; }
}

function bannerHtml(post, logoB64, width, height) {
  const c          = COLORS[post.category] || DEFAULT_COLORS;
  const [l1, l2]   = splitTitle(post.title);
  const mins       = readMins(post.excerpt);
  const date       = fmtDate(post.date);
  const excerpt    = post.excerpt.length > 120 ? post.excerpt.slice(0, 117) + "…" : post.excerpt;

  // Scale down font sizes for smaller banners
  let fontSize = "24px";
  let padding = "30px 38px 26px";
  let gapSize = "8px";
  let logoSize = "22px";
  let siteFontSize = "13px";
  let excerptFontSize = "11.5px";
  let metaFontSize = "10.5px";
  let buttonPadding = "7px 18px";
  let buttonFontSize = "11.5px";

  if (width <= 400) {
    fontSize = "16px";
    padding = "16px 20px 14px";
    gapSize = "5px";
    logoSize = "16px";
    siteFontSize = "10px";
    excerptFontSize = "9px";
    metaFontSize = "8px";
    buttonPadding = "5px 12px";
    buttonFontSize = "9px";
  } else if (width <= 600) {
    fontSize = "18px";
    padding = "20px 26px 18px";
    gapSize = "6px";
    logoSize = "18px";
    siteFontSize = "11px";
    excerptFontSize = "10px";
    metaFontSize = "9px";
    buttonPadding = "6px 14px";
    buttonFontSize = "10px";
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}body{background:#111;display:flex;align-items:center;justify-content:center;width:100%;height:100%}
.b{width:${width}px;height:${height}px;background:#0b0f14;position:relative;overflow:hidden;
  display:flex;flex-direction:column;justify-content:space-between;
  padding:${padding};
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.ab{position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,${c.from},${c.to});z-index:3}
.o1{position:absolute;border-radius:50%;width:${width * 0.8}px;height:${height * 0.8}px;
  background:${c.orb};top:${-height * 0.3}px;right:${-width * 0.1}px;filter:blur(50px)}
.o2{position:absolute;border-radius:50%;width:${width * 0.5}px;height:${height * 0.5}px;
  background:rgba(6,182,212,.10);bottom:${-height * 0.2}px;left:${width * 0.05}px;filter:blur(45px)}
.gd{position:absolute;inset:0;
  background-image:linear-gradient(rgba(255,255,255,.024) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(255,255,255,.024) 1px,transparent 1px);
  background-size:${width * 0.15}px ${height * 0.15}px}
.tr{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2}
.lr{display:flex;align-items:center;gap:${gapSize}}
.lr img{width:${logoSize};height:${logoSize};border-radius:${Math.round(parseInt(logoSize) * 0.25)}px}
.si{font-size:${siteFontSize};font-weight:700;color:rgba(231,237,245,.78)}
.bg{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:1px;
  padding:2px 8px;border-radius:999px;border:1px solid rgba(0,0,0,.3);color:${c.badge}}
.ta{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;
  justify-content:center;padding:${parseInt(padding.split(" ")[0]) * 0.3}px 0}
.pt{font-size:${fontSize};font-weight:800;line-height:1.2;color:#f0f4f8;letter-spacing:-.2px}
.g{background:linear-gradient(135deg,${c.badge},${c.to});
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.ex{font-size:${excerptFontSize};line-height:1.4;color:#8fa5bc;margin-top:${parseInt(padding.split(" ")[0]) * 0.15}px;
  display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.bot{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2;gap:${gapSize}}
.mt{font-size:${metaFontSize};color:#5d6e82}
.btn{font-size:${buttonFontSize};font-weight:700;padding:${buttonPadding};border-radius:999px;border:none;
  color:#fff;background:linear-gradient(135deg,${c.from},${c.to});letter-spacing:.2px;cursor:pointer;white-space:nowrap}
</style></head><body>
<div class="b">
  <div class="ab"></div><div class="o1"></div><div class="o2"></div><div class="gd"></div>
  <div class="tr">
    <div class="lr">
      <img src="data:image/png;base64,${logoB64}" alt="">
      <span class="si">chatrio</span>
    </div>
    <span class="bg">${esc(post.category).split(" ")[0]}</span>
  </div>
  <div class="ta">
    <div class="pt">
      <span class="g">${esc(l1)}</span>${l2 ? "<br>" + esc(l2) : ""}
    </div>
    ${width > 400 ? `<div class="ex">${esc(excerpt)}</div>` : ""}
  </div>
  <div class="bot">
    <span class="mt">${date} · ${mins}m</span>
    ${width > 400 ? `<button class="btn">Read →</button>` : ""}
  </div>
</div>
</body></html>`;
}

async function processChunk(posts, logoB64, browser, sizes) {
  const page = await browser.newPage();

  for (const post of posts) {
    try {
      for (const size of sizes) {
        await page.setViewport({ width: size.w + 10, height: size.h + 10, deviceScaleFactor: 1 });
        const html = bannerHtml(post, logoB64, size.w, size.h);
        await page.setContent(html, { waitUntil: "domcontentloaded" });

        const el = await page.$(".b");
        const outPath = path.join(OUT_DIR, `hero-${post.slug}-${size.name}.png`);
        await el.screenshot({ path: outPath, type: "png" });
      }
      process.stdout.write(`  ✓  ${post.slug}\n`);
    } catch (err) {
      process.stdout.write(`  ✗  ${post.slug}: ${err.message}\n`);
    }
  }
  await page.close();
}

const SLUG_FILTER = process.env.SLUG_FILTER
  ? process.env.SLUG_FILTER.split(",").map(s => s.trim())
  : null;

async function run() {
  const src   = fs.readFileSync(POSTS_TS, "utf-8");
  let posts = parsePosts(src);
  if (SLUG_FILTER) posts = posts.filter(p => SLUG_FILTER.includes(p.slug));
  console.log(`\nGenerating responsive banners for ${posts.length} posts...\n`);

  const logoB64 = fs.readFileSync(LOGO_PATH).toString("base64");

  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    headless: true,
  });

  // Process all posts with a single page for simplicity
  await processChunk(posts, logoB64, browser, SIZES);
  await browser.close();

  console.log(`\n✅  Done — responsive banners saved`);
  console.log(`    Sizes: sm (400×210), md (600×315), lg (800×420)`);
  console.log(`    Update your blog component to use:`);
  console.log(`    - sm on mobile: /images/hero-{slug}-sm.png`);
  console.log(`    - md on tablet: /images/hero-{slug}-md.png`);
  console.log(`    - lg on desktop: /images/hero-{slug}-lg.png`);
}

run().catch(err => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
