/**
 * Prerenders specific blog post routes using puppeteer.
 * Run from repo root: node scripts/prerender-missing.js
 */
const puppeteer = require("/Users/vijayrathod/Desktop/React/chatrio/client/node_modules/puppeteer");
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const BUILD_DIR = path.join(__dirname, "../client/build");
const PORT = 45999;

const MISSING_POSTS = [
  "/blog/chat-with-random-people-online-guide",
  "/blog/chatspin-alternative-2026-free-no-sign-up",
  "/blog/dos-and-donts-of-chatting-with-strangers-online",
  "/blog/free-online-chat-rooms-no-registration-best-2026",
  "/blog/how-to-avoid-bots-and-fake-users-in-anonymous-chat",
  "/blog/how-to-chat-anonymously-online-complete-guide",
  "/blog/how-to-talk-to-a-stranger-online-tips-2026",
  "/blog/random-chat-for-singles-find-love-without-dating-apps",
  "/blog/random-chat-online-best-sites-2026",
  "/blog/talk-to-strangers-online-free-no-registration-2026",
];

/* Minimal static file server with SPA fallback */
function startServer() {
  const mimeTypes = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".json": "application/json",
    ".webp": "image/webp",
  };

  const server = http.createServer((req, res) => {
    let reqPath = url.parse(req.url).pathname;
    let filePath = path.join(BUILD_DIR, reqPath);

    // Try exact file, then index.html in dir, then SPA fallback
    const candidates = [
      filePath,
      path.join(filePath, "index.html"),
      path.join(BUILD_DIR, "200.html"),
      path.join(BUILD_DIR, "index.html"),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const ext = path.extname(candidate);
        res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
        res.writeHead(200);
        res.end(fs.readFileSync(candidate));
        return;
      }
    }
    res.writeHead(404);
    res.end("Not found");
  });

  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

async function prerender(browser, route) {
  const page = await browser.newPage();
  await page.setRequestInterception(true);

  // Block third-party requests (ads, analytics) like react-snap does
  page.on("request", (req) => {
    const u = req.url();
    if (!u.startsWith(`http://localhost:${PORT}`) && !u.startsWith("data:")) {
      req.abort();
    } else {
      req.continue();
    }
  });

  const pageUrl = `http://localhost:${PORT}${route}`;
  await page.goto(pageUrl, { waitUntil: "networkidle0", timeout: 30000 });

  // Wait for React to render the post title
  await page.waitForFunction(
    () => {
      const h1 = document.querySelector("h1");
      return h1 && h1.textContent && h1.textContent.trim().length > 5;
    },
    { timeout: 15000 }
  ).catch(() => console.warn(`  ⚠ Timeout waiting for h1 on ${route}`));

  const html = await page.content();
  await page.close();
  return html;
}

async function main() {
  console.log("Starting static server...");
  const server = await startServer();

  console.log("Launching Chrome...");
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  for (const route of MISSING_POSTS) {
    process.stdout.write(`Rendering ${route}... `);
    try {
      const html = await prerender(browser, route);

      // Write to build directory
      const dir = path.join(BUILD_DIR, route);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "index.html"), html);

      const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1] || "no title";
      console.log(`✅ ${title}`);
    } catch (err) {
      console.log(`❌ ${err.message}`);
    }
  }

  await browser.close();
  server.close();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
