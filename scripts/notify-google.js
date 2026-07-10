/**
 * Notifies Google, Bing, and Yandex via IndexNow when new content is published.
 * No service account or OAuth needed — just an API key file.
 *
 * SETUP (one-time):
 *   node scripts/notify-google.js --setup
 *
 * RUN AFTER EVERY DEPLOY:
 *   node scripts/notify-google.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");

const BASE_URL = "https://chatrio.app";
const KEY_FILE = path.join(__dirname, "indexnow-key.txt");
const PUBLIC_KEY_FILE = path.join(
  __dirname,
  "../client/public/indexnow-key.txt"
);

/* ── Setup: generate key ── */
if (process.argv.includes("--setup")) {
  const key = crypto.randomBytes(16).toString("hex"); // 32-char hex key
  fs.writeFileSync(KEY_FILE, key, "utf8");
  fs.writeFileSync(PUBLIC_KEY_FILE, key, "utf8");
  // IndexNow REQUIRES the key file to be named {key}.txt and served at the
  // site root. indexnow-key.txt alone is not enough — Bing/IndexNow fetch
  // https://chatrio.app/{key}.txt and 403 if it doesn't return the raw key.
  const KEYED_FILE = path.join(__dirname, `../client/public/${key}.txt`);
  fs.writeFileSync(KEYED_FILE, key, "utf8");
  console.log(`
✅  IndexNow key generated: ${key}

Key saved to:
  scripts/indexnow-key.txt        ← keeps the key safe
  client/public/indexnow-key.txt  ← reference copy
  client/public/${key}.txt  ← served at https://chatrio.app/${key}.txt (REQUIRED by IndexNow)

Next steps:
  1. Build and deploy so the key file is live:
       cd client && npm run build
       rsync -avz --delete client/build/ root@72.60.178.97:/var/www/chatrio/

  2. Verify it's live (must return the raw key, not HTML):
       curl https://chatrio.app/${key}.txt

  3. Then run the notifier:
       node scripts/notify-google.js
`);
  process.exit(0);
}

/* ── Check key exists ── */
if (!fs.existsSync(KEY_FILE)) {
  console.error(`
❌  No IndexNow key found. Run setup first:
    node scripts/notify-google.js --setup
`);
  process.exit(1);
}

const KEY = fs.readFileSync(KEY_FILE, "utf8").trim();

/* ── Collect all URLs ── */
function extractField(src, fieldName) {
  const re = new RegExp(`${fieldName}:\\s*["'\`]([^"'\`]+)["'\`]`, "g");
  const results = [];
  let m;
  while ((m = re.exec(src)) !== null) results.push(m[1]);
  return results;
}

const postsSrc = fs.readFileSync(
  path.join(__dirname, "../client/src/data/posts.ts"),
  "utf8"
);
const storiesSrc = fs.readFileSync(
  path.join(__dirname, "../client/src/data/stories.ts"),
  "utf8"
);

const slugs = extractField(postsSrc, "slug");
const storyIds = extractField(storiesSrc, "id");

const urls = [
  `${BASE_URL}/`,
  `${BASE_URL}/blog`,
  `${BASE_URL}/web-stories`,
  ...slugs.map((s) => `${BASE_URL}/blog/${s}`),
  ...storyIds.map((id) => `${BASE_URL}/web-stories/${id}`),
];

/* ── Send to IndexNow endpoint ── */
function post(hostname, urlPath, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname,
        path: urlPath,
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          if (res.statusCode === 200 || res.statusCode === 202) {
            console.log(`  ✅  ${hostname} → accepted (${res.statusCode})`);
          } else {
            console.log(`  ⚠️   ${hostname} → ${res.statusCode} ${raw.slice(0, 120)}`);
          }
          resolve();
        });
      }
    );
    req.on("error", (e) => {
      console.log(`  ❌  ${hostname} → ${e.message}`);
      resolve();
    });
    req.write(data);
    req.end();
  });
}

/* ── Main ── */
async function main() {
  console.log(`\n📡  Submitting ${urls.length} URLs to search engines...\n`);

  const payload = {
    host: "chatrio.app",
    key: KEY,
    keyLocation: `${BASE_URL}/${KEY}.txt`,
    urlList: urls,
  };

  // Google
  await post("api.indexnow.org", "/indexnow", payload);

  // Bing
  await post("www.bing.com", "/indexnow", payload);

  // Yandex
  await post("yandex.com", "/indexnow", payload);

  console.log(`
🎉  Done! URLs submitted to Google, Bing, and Yandex.
    Google typically crawls within a few hours.

URLs submitted (${urls.length} total):`);
  urls.forEach((u) => console.log(`  • ${u}`));
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
