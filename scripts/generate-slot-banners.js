/**
 * Generate slot-exact banner images for every blog post.
 *
 * Slot sizes (2× CSS pixels for retina sharpness):
 *   hero-{slug}-card.png  → 280×190  (CSS slot: 140×95 blog-thumb)
 *   hero-{slug}-thumb.png → 104×104  (CSS slot: 52×52  blog-side-thumb)
 *
 * The original hero-{slug}.png (1200×630) stays for the featured image.
 *
 * Run:   node scripts/generate-slot-banners.js
 */

const puppeteer = require("../client/node_modules/puppeteer");
const path      = require("path");
const fs        = require("fs");

const POSTS_TS  = path.resolve(__dirname, "../client/src/data/posts.ts");
const OUT_DIR   = path.resolve(__dirname, "../client/public/images");
const LOGO_PATH = path.resolve(__dirname, "../client/build/branding/chatrio-64.png");

// ── helpers ───────────────────────────────────────────────────────────────────

function parsePosts(src) {
  const posts = [];
  const re = /\{\s*\n\s*slug:\s*"([^"]+)"([\s\S]*?)category:\s*"([^"]+)",?\s*\n\s*\}/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const [, slug, body, category] = m;
    const titleM = body.match(/title:\s*(?:\n\s*)?"((?:[^"\\]|\\.)*)"/) || [];
    if (!slug || !titleM[1]) continue;
    posts.push({ slug, title: titleM[1].replace(/\\"/g, '"'), category: category.trim() });
  }
  return posts;
}

const COLORS = {
  "Chat & Connection": { from: "#7c3aed", to: "#06b6d4", orb: "rgba(124,58,237,.25)", badge: "#a78bfa", accent: "#c084fc" },
  "Love":              { from: "#e11d48", to: "#ec4899", orb: "rgba(225,29,72,.22)",   badge: "#fda4af", accent: "#fb7185" },
  "Romance":           { from: "#db2777", to: "#9333ea", orb: "rgba(219,39,119,.22)",  badge: "#f9a8d4", accent: "#e879f9" },
  "Dating":            { from: "#ea580c", to: "#f59e0b", orb: "rgba(234,88,12,.22)",   badge: "#fdba74", accent: "#fb923c" },
  "Relationships":     { from: "#4338ca", to: "#7c3aed", orb: "rgba(67,56,202,.25)",   badge: "#a5b4fc", accent: "#818cf8" },
  "Mental Health":     { from: "#0d9488", to: "#06b6d4", orb: "rgba(13,148,136,.25)",  badge: "#5eead4", accent: "#2dd4bf" },
};
const DEFAULT = COLORS["Chat & Connection"];

function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function splitWords(title, maxChars) {
  if (title.length <= maxChars) return [title, ""];
  const ci = title.indexOf(":");
  if (ci > 0 && ci <= maxChars) return [title.slice(0, ci + 1), title.slice(ci + 2).trim()];
  const words = title.split(" ");
  let line = "", rest = [];
  for (const w of words) {
    if ((line + (line ? " " : "") + w).length <= maxChars) line += (line ? " " : "") + w;
    else rest.push(w);
  }
  return [line, rest.join(" ")];
}

// ── card banner (280×190, 2× of 140×95) ──────────────────────────────────────

function cardHtml(post, logoB64) {
  const c = COLORS[post.category] || DEFAULT;
  const [l1, l2] = splitWords(post.title, 22);
  const cat = post.category.split(" ")[0];

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#111;display:flex;align-items:center;justify-content:center;width:100%;height:100%}
.b{
  width:280px;height:190px;
  background:linear-gradient(145deg,#090d12 0%,#0d1219 60%,#0f1520 100%);
  position:relative;overflow:hidden;
  display:flex;flex-direction:column;justify-content:space-between;
  padding:14px 16px 13px;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
}
/* top accent bar */
.ab{position:absolute;top:0;left:0;right:0;height:2.5px;
  background:linear-gradient(90deg,${c.from},${c.to});z-index:3}
/* glowing orb */
.o1{position:absolute;border-radius:50%;width:200px;height:200px;
  background:${c.orb};top:-60px;right:-40px;filter:blur(40px)}
.o2{position:absolute;border-radius:50%;width:110px;height:110px;
  background:rgba(6,182,212,.09);bottom:-30px;left:10px;filter:blur(35px)}
/* subtle grid */
.gd{position:absolute;inset:0;
  background-image:linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);
  background-size:28px 28px}
/* top row */
.tr{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2}
.lr{display:flex;align-items:center;gap:5px}
.lr img{width:16px;height:16px;border-radius:4px}
.si{font-size:10px;font-weight:700;color:rgba(231,237,245,.75);letter-spacing:.2px}
.bg{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;
  padding:2px 7px;border-radius:999px;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);
  color:${c.badge}}
/* title area */
.ta{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;justify-content:center;padding:4px 0}
.pt{font-size:17px;font-weight:800;line-height:1.2;color:#eef2f8;letter-spacing:-.3px}
.g{background:linear-gradient(135deg,${c.accent},${c.to});
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.l2{color:#d4dce8;font-size:15px}
/* bottom */
.bot{display:flex;align-items:center;gap:6px;position:relative;z-index:2}
.dot{width:4px;height:4px;border-radius:50%;background:${c.to};opacity:.7}
.lbl{font-size:9px;font-weight:600;color:#5d7080;letter-spacing:.3px}
</style></head><body>
<div class="b">
  <div class="ab"></div><div class="o1"></div><div class="o2"></div><div class="gd"></div>
  <div class="tr">
    <div class="lr">
      <img src="data:image/png;base64,${logoB64}" alt="">
      <span class="si">chatrio</span>
    </div>
    <span class="bg">${esc(cat)}</span>
  </div>
  <div class="ta">
    <div class="pt">
      <span class="g">${esc(l1)}</span>
      ${l2 ? `<br><span class="l2">${esc(l2.length > 26 ? l2.slice(0, 24) + "…" : l2)}</span>` : ""}
    </div>
  </div>
  <div class="bot">
    <div class="dot"></div>
    <span class="lbl">${esc(post.category)}</span>
  </div>
</div>
</body></html>`;
}

// ── thumb banner (104×104, 2× of 52×52) ──────────────────────────────────────

function thumbHtml(post, logoB64) {
  const c = COLORS[post.category] || DEFAULT;
  // Extract a short 2-3 word label from the title
  const words = post.title.replace(/[^a-zA-Z ]/g, " ").trim().split(/\s+/);
  const shortLabel = words.slice(0, 2).join(" ");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#111;display:flex;align-items:center;justify-content:center;width:100%;height:100%}
.b{
  width:104px;height:104px;
  background:linear-gradient(145deg,#090d12 0%,#0d1219 100%);
  position:relative;overflow:hidden;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
}
/* corner accent lines */
.ab{position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,${c.from},${c.to});z-index:3}
.al{position:absolute;top:0;bottom:0;left:0;width:2px;
  background:linear-gradient(180deg,${c.from},transparent);z-index:3}
/* glow orb center */
.o1{position:absolute;border-radius:50%;width:80px;height:80px;
  background:${c.orb};top:50%;left:50%;transform:translate(-50%,-50%);filter:blur(25px)}
/* subtle grid */
.gd{position:absolute;inset:0;
  background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);
  background-size:14px 14px}
/* logo */
.lg{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:5px}
.lg img{width:24px;height:24px;border-radius:6px}
/* gradient text */
.tl{font-size:10px;font-weight:800;line-height:1.2;text-align:center;
  background:linear-gradient(135deg,${c.accent},${c.to});
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  max-width:80px;}
/* site name */
.sn{position:absolute;bottom:5px;left:0;right:0;text-align:center;z-index:2;
  font-size:6.5px;font-weight:700;color:rgba(231,237,245,.4);letter-spacing:.5px}
</style></head><body>
<div class="b">
  <div class="ab"></div><div class="al"></div><div class="o1"></div><div class="gd"></div>
  <div class="lg">
    <img src="data:image/png;base64,${logoB64}" alt="">
    <div class="tl">${esc(shortLabel)}</div>
  </div>
  <div class="sn">CHATRIO</div>
</div>
</body></html>`;
}

// ── main ──────────────────────────────────────────────────────────────────────

const SLUG_FILTER = process.env.SLUG_FILTER
  ? process.env.SLUG_FILTER.split(",").map(s => s.trim())
  : null;

async function run() {
  const src   = fs.readFileSync(POSTS_TS, "utf-8");
  let posts = parsePosts(src);
  if (SLUG_FILTER) posts = posts.filter(p => SLUG_FILTER.includes(p.slug));
  console.log(`\nGenerating slot-exact banners for ${posts.length} posts…\n`);

  const logoB64 = fs.readFileSync(LOGO_PATH).toString("base64");

  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    headless: true,
  });

  const CONCURRENCY = 4;
  const chunks = [];
  for (let i = 0; i < posts.length; i += Math.ceil(posts.length / CONCURRENCY)) {
    chunks.push(posts.slice(i, i + Math.ceil(posts.length / CONCURRENCY)));
  }

  async function processChunk(chunk) {
    const page = await browser.newPage();
    for (const post of chunk) {
      try {
        // ── card (280×190) ──
        await page.setViewport({ width: 300, height: 210, deviceScaleFactor: 1 });
        await page.setContent(cardHtml(post, logoB64), { waitUntil: "domcontentloaded" });
        const cardEl = await page.$(".b");
        await cardEl.screenshot({ path: path.join(OUT_DIR, `hero-${post.slug}-card.png`), type: "png" });

        // ── thumb (104×104) ──
        await page.setViewport({ width: 120, height: 120, deviceScaleFactor: 1 });
        await page.setContent(thumbHtml(post, logoB64), { waitUntil: "domcontentloaded" });
        const thumbEl = await page.$(".b");
        await thumbEl.screenshot({ path: path.join(OUT_DIR, `hero-${post.slug}-thumb.png`), type: "png" });

        process.stdout.write(`  ✓  ${post.slug}\n`);
      } catch (err) {
        process.stdout.write(`  ✗  ${post.slug}: ${err.message}\n`);
      }
    }
    await page.close();
  }

  await Promise.all(chunks.map(processChunk));
  await browser.close();

  const cardCount  = posts.length;
  const thumbCount = posts.length;
  console.log(`\n✅  Done! Generated ${cardCount + thumbCount} slot-exact banners`);
  console.log(`    hero-{slug}-card.png  → 280×190  (for 140×95 card slot)`);
  console.log(`    hero-{slug}-thumb.png → 104×104  (for 52×52 sidebar slot)`);
}

run().catch(err => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
