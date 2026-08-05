/**
 * Resubmits the sitemap to Google Search Console after each deploy, using a
 * GCP service-account JSON to call sitemaps.submit.
 *
 * Google's separate "Indexing API" is restricted by policy to Job/Livestream
 * pages — submitting blog URLs through it gets silently ignored and risks a
 * misuse flag. Search Console's sitemaps.submit is the Google-supported way
 * to prompt a recrawl of new/changed URLs, so that's what this calls.
 *
 * SETUP (one-time):
 *   1. Create a GCP service account, enable the Search Console API for its
 *      project, and download its JSON key.
 *   2. In Search Console → Settings → Users and permissions, add the service
 *      account's email (…@…iam.gserviceaccount.com) as a Full user on the
 *      chatrio.app property.
 *   3. Place the JSON key on the server at the path below (or point
 *      GSC_SERVICE_ACCOUNT_JSON at it) — never commit this file.
 *
 * RUN AFTER EVERY DEPLOY:
 *   node scripts/gsc-resubmit-sitemap.js
 */

const fs = require("fs");
const { JWT } = require("google-auth-library");

const SITE_URL = "https://chatrio.app/"; // must match the GSC property exactly (URL-prefix property)
const SITEMAP_URL = "https://chatrio.app/sitemap.xml";
const KEY_PATH =
  process.env.GSC_SERVICE_ACCOUNT_JSON ||
  "/root/chatrio-deploy/secrets/gsc-service-account.json";

async function main() {
  if (!fs.existsSync(KEY_PATH)) {
    console.error(`❌  No service-account JSON found at ${KEY_PATH}`);
    console.error(`    Set GSC_SERVICE_ACCOUNT_JSON or see setup instructions in this file's header.`);
    process.exit(1);
  }

  const key = JSON.parse(fs.readFileSync(KEY_PATH, "utf8"));
  const client = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ["https://www.googleapis.com/auth/webmasters"],
  });

  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    SITE_URL
  )}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`;

  console.log(`\n📡  Resubmitting sitemap to Search Console: ${SITEMAP_URL}\n`);

  try {
    await client.request({ url: endpoint, method: "PUT" });
    console.log(`✅  Sitemap resubmitted for ${SITE_URL}`);
  } catch (e) {
    const status = e.response?.status;
    const body = e.response?.data;
    console.error(`❌  Sitemap resubmit failed${status ? ` (HTTP ${status})` : ""}: ${e.message}`);
    if (body) console.error(JSON.stringify(body, null, 2));
    process.exit(1);
  }
}

main();
