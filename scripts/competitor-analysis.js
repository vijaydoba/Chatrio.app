/**
 * Competitor SEO analysis using Apify
 * Uses the "Website Content Crawler" actor to crawl competitor sites and
 * extract title/description/keywords so you can find content gaps for chatrio.app.
 *
 * Setup:
 *   1. Add your Apify token to /.env  →  APIFY_TOKEN=apify_api_xxxxx
 *   2. Run: node scripts/competitor-analysis.js
 *   3. Results saved to scripts/competitor-report.json
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { ApifyClient } = require("apify-client");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.APIFY_TOKEN;
if (!TOKEN || TOKEN === "your_token_here") {
  console.error(
    "ERROR: Set APIFY_TOKEN in .env first.\nGet your token at: https://console.apify.com/account/integrations"
  );
  process.exit(1);
}

// --- Competitors to analyze ---
const COMPETITORS = [
  "https://strangerline.io",
  "https://opentalk.club",
  "https://www.chatib.us",
  "https://chat.talkwithstranger.com",
  "https://anonchat.com",
];

// Chatrio's own domain (excluded from gap analysis)
const OUR_DOMAIN = "chatrio.app";

async function run() {
  const client = new ApifyClient({ token: TOKEN });

  console.log(`\nAnalyzing ${COMPETITORS.length} competitor sites...\n`);

  const results = [];

  for (const url of COMPETITORS) {
    const domain = new URL(url).hostname;
    console.log(`Crawling: ${url}`);

    try {
      const run = await client.actor("apify/website-content-crawler").call({
        startUrls: [{ url }],
        maxCrawlPages: 20,        // keep usage low on free tier
        maxCrawlDepth: 2,
        crawlerType: "cheerio",   // fast HTML-only (no JS rendering needed)
      });

      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      const pages = items.map((item) => ({
        url: item.url,
        title: item.metadata?.title || "",
        description: item.metadata?.description || "",
        h1: item.metadata?.h1 || "",
        wordCount: item.text ? item.text.split(/\s+/).length : 0,
      }));

      results.push({ domain, pages });
      console.log(`  ✓ ${pages.length} pages crawled`);
    } catch (err) {
      console.warn(`  ✗ Failed to crawl ${domain}: ${err.message}`);
      results.push({ domain, pages: [], error: err.message });
    }
  }

  // Build gap report: titles/topics competitors cover that we should target
  const allTitles = results.flatMap((r) =>
    r.pages.map((p) => ({ domain: r.domain, title: p.title, url: p.url }))
  );

  const report = {
    generated: new Date().toISOString(),
    our_domain: OUR_DOMAIN,
    competitors: results,
    content_gap_titles: allTitles.filter(Boolean),
    summary: {
      total_competitor_pages: allTitles.length,
      competitors_analyzed: results.length,
    },
  };

  const outPath = path.join(__dirname, "competitor-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(`\nReport saved → scripts/competitor-report.json`);
  console.log(`Total competitor pages crawled: ${allTitles.length}`);
  console.log(
    "\nTop competitor page titles (blog/content gap ideas):"
  );
  allTitles
    .filter((t) => t.title)
    .slice(0, 20)
    .forEach((t) => console.log(`  [${t.domain}] ${t.title}`));
}

run().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
