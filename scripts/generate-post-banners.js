/**
 * Generates PNG banner images for blog posts from post-banners.html
 * Uses Puppeteer (already installed via react-snap) to screenshot each banner.
 *
 * Run: node scripts/generate-post-banners.js
 * Output: client/public/images/hero-*.png  (1200×630 each)
 */

const puppeteer = require("../client/node_modules/puppeteer");
const path = require("path");
const fs = require("fs");

const BANNERS_HTML = path.resolve(__dirname, "../ad-assets/post-banners.html");
const OUT_DIR = path.resolve(__dirname, "../client/public/images");

const POSTS = [
  {
    selector: ".post1",
    filename: "hero-talk-to-strangers-online-free-2026.png",
    slug: "talk-to-strangers-online-free-no-registration-2026",
  },
  {
    selector: ".post2",
    filename: "hero-free-online-chat-rooms-2026.png",
    slug: "free-online-chat-rooms-no-registration-best-2026",
  },
  {
    selector: ".post3",
    filename: "hero-random-chat-online-2026.png",
    slug: "random-chat-online-best-sites-2026",
  },
  {
    selector: ".post4",
    filename: "hero-how-to-talk-to-stranger-online-2026.png",
    slug: "how-to-talk-to-a-stranger-online-tips-2026",
  },
  {
    selector: ".post5",
    filename: "hero-uncomfortable-online-chat-2026.png",
    slug: "what-to-do-when-someone-makes-you-uncomfortable-online",
  },
];

async function run() {
  console.log("\nLaunching browser...");
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });

  const page = await browser.newPage();

  // Load at 2× for retina-quality output (banners are 600px wide in HTML = 1200px actual)
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });
  await page.goto(`file://${BANNERS_HTML}`, { waitUntil: "networkidle0" });

  // Wait for fonts + animations to settle
  await new Promise(r => setTimeout(r, 800));

  for (const post of POSTS) {
    const outPath = path.join(OUT_DIR, post.filename);

    const el = await page.$(post.selector);
    if (!el) {
      console.warn(`  ✗ Selector not found: ${post.selector}`);
      continue;
    }

    // Get bounding box and screenshot just that element at 1200×630
    await el.screenshot({
      path: outPath,
      type: "png",
    });

    console.log(`  ✓ ${post.filename}`);
  }

  await browser.close();

  console.log(`\nAll banners saved to client/public/images/`);
  console.log("\nThumbnail paths to update in posts.ts:");
  for (const post of POSTS) {
    console.log(`  "${post.slug}": "/images/${post.filename}"`);
  }
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
