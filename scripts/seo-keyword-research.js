/**
 * SEO Keyword Research using Apify
 * Runs two actors in sequence:
 *   1. Google Search Scraper  — scrapes live SERP results for target keywords
 *   2. Google Autocomplete    — expands each seed keyword into long-tail variants
 *
 * Setup:  APIFY_TOKEN must be set in /.env  (already done)
 * Run:    node scripts/seo-keyword-research.js
 * Output: scripts/seo-keyword-report.json  +  scripts/seo-keyword-report.txt
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { ApifyClient } = require("apify-client");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.APIFY_TOKEN;
if (!TOKEN || TOKEN === "your_token_here") {
  console.error("ERROR: Set APIFY_TOKEN in .env first.");
  process.exit(1);
}

// ─── Seed keywords for chatrio ───────────────────────────────────────────────
const SEED_KEYWORDS = [
  "anonymous chat",
  "chat with strangers",
  "random chat online",
  "free anonymous chat no registration",
  "talk to strangers online",
  "omegle alternative",
  "random video chat",
  "anonymous chat app",
  "online chat rooms",
  "stranger chat",
];

const OUR_DOMAIN = "chatrio.app";
const OUT_JSON = path.join(__dirname, "seo-keyword-report.json");
const OUT_TXT  = path.join(__dirname, "seo-keyword-report.txt");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Poll a run until it finishes (SUCCEEDED / FAILED / ABORTED). */
async function waitForRun(client, runId, actorId, label) {
  const spinner = ["|", "/", "–", "\\"];
  let i = 0;
  while (true) {
    const run = await client.run(runId).get();
    const status = run.status;
    if (["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
      console.log(`  ${label}: ${status}`);
      return run;
    }
    process.stdout.write(`\r  ${spinner[i++ % 4]}  ${label}: ${status}   `);
    await sleep(4000);
  }
}

// ─── Step 1: Google Search Scraper ───────────────────────────────────────────

async function runGoogleSerpScraper(client) {
  console.log("\n[1/2] Running Google Search Scraper...");
  console.log(`      Keywords: ${SEED_KEYWORDS.length}`);

  const run = await client.actor("apify/google-search-scraper").call(
    {
      queries: SEED_KEYWORDS.join("\n"),
      resultsPerPage: 10,
      maxPagesPerQuery: 1,
      languageCode: "en",
      countryCode: "us",
      includeUnfilteredResults: false,
    },
    { waitSecs: 0 }   // don't block — we poll manually
  );

  const finishedRun = await waitForRun(client, run.id, "apify~google-search-scraper", "SERP scraper");

  if (finishedRun.status !== "SUCCEEDED") {
    throw new Error(`SERP scraper failed: ${finishedRun.status}`);
  }

  const { items } = await client.dataset(finishedRun.defaultDatasetId).listItems();
  return items;
}

// ─── Step 2: Google Autocomplete Scraper ─────────────────────────────────────

async function runAutocompleteScraper(client) {
  console.log("\n[2/2] Running Google Autocomplete Scraper...");

  const run = await client.actor("apify/google-search-scraper").call(
    {
      // Autocomplete trick: append a–z to each seed to surface long-tail terms
      queries: SEED_KEYWORDS.flatMap((kw) =>
        ["a", "b", "c", "f", "h", "n", "o", "r", "s", "w"].map((l) => `${kw} ${l}`)
      ).join("\n"),
      resultsPerPage: 5,
      maxPagesPerQuery: 1,
      languageCode: "en",
      countryCode: "us",
    },
    { waitSecs: 0 }
  );

  const finishedRun = await waitForRun(client, run.id, "apify~google-search-scraper", "Autocomplete scraper");

  if (finishedRun.status !== "SUCCEEDED") {
    console.warn("  Autocomplete scraper did not succeed — skipping.");
    return [];
  }

  const { items } = await client.dataset(finishedRun.defaultDatasetId).listItems();
  return items;
}

// ─── Analysis helpers ─────────────────────────────────────────────────────────

/** Extract ranked URLs from SERP items and flag if chatrio appears. */
function analyzeSERP(serpItems) {
  return serpItems.map((item) => {
    const keyword   = item.searchQuery?.term || "";
    const organicResults = (item.organicResults || []).map((r, idx) => ({
      position: idx + 1,
      url: r.url || "",
      title: r.title || "",
      description: r.description || "",
      domain: (() => { try { return new URL(r.url).hostname; } catch { return ""; } })(),
    }));

    const ourPosition = organicResults.findIndex((r) => r.domain.includes(OUR_DOMAIN));

    return {
      keyword,
      our_position: ourPosition === -1 ? null : ourPosition + 1,
      top_domains: organicResults.slice(0, 5).map((r) => r.domain),
      results: organicResults,
    };
  });
}

/** Count how often each domain appears across all SERPs — reveals top competitors. */
function domainFrequency(analyzed) {
  const freq = {};
  for (const item of analyzed) {
    for (const domain of item.top_domains) {
      if (!domain || domain.includes(OUR_DOMAIN)) continue;
      freq[domain] = (freq[domain] || 0) + 1;
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([domain, count]) => ({ domain, appearances: count }));
}

/** Find keywords where we're not in top 10 — highest opportunity. */
function findOpportunities(analyzed) {
  return analyzed
    .filter((item) => item.our_position === null)
    .map((item) => ({
      keyword: item.keyword,
      top_competitor: item.top_domains[0] || "",
    }));
}

/** Build readable .txt report */
function buildTextReport(analyzed, domainFreq, opportunities, longTailKeywords) {
  const lines = [];
  lines.push("═══════════════════════════════════════════════════════");
  lines.push("  CHATRIO SEO KEYWORD RESEARCH REPORT");
  lines.push(`  Generated: ${new Date().toLocaleString()}`);
  lines.push("═══════════════════════════════════════════════════════\n");

  lines.push("── OUR RANKINGS ───────────────────────────────────────");
  for (const item of analyzed) {
    const pos = item.our_position ? `#${item.our_position}` : "not in top 10";
    lines.push(`  ${item.keyword.padEnd(45)} ${pos}`);
  }

  lines.push("\n── TOP COMPETITOR DOMAINS (by SERP appearances) ───────");
  domainFreq.slice(0, 15).forEach(({ domain, appearances }) => {
    lines.push(`  ${appearances}x  ${domain}`);
  });

  lines.push("\n── OPPORTUNITY KEYWORDS (we're not ranking) ───────────");
  lines.push("  These are your highest-priority targets:\n");
  opportunities.slice(0, 20).forEach(({ keyword, top_competitor }) => {
    lines.push(`  • ${keyword}`);
    lines.push(`    Top result: ${top_competitor}`);
  });

  if (longTailKeywords.length > 0) {
    lines.push("\n── LONG-TAIL KEYWORD IDEAS ─────────────────────────────");
    const seen = new Set();
    longTailKeywords
      .flatMap((item) => (item.organicResults || []).map((r) => r.title).filter(Boolean))
      .filter((t) => { if (seen.has(t)) return false; seen.add(t); return true; })
      .slice(0, 30)
      .forEach((title) => lines.push(`  • ${title}`));
  }

  lines.push("\n═══════════════════════════════════════════════════════");
  lines.push("  Full JSON data → scripts/seo-keyword-report.json");
  lines.push("═══════════════════════════════════════════════════════");
  return lines.join("\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const client = new ApifyClient({ token: TOKEN });

  const [serpItems, longTailItems] = await Promise.all([
    runGoogleSerpScraper(client),
    runAutocompleteScraper(client),
  ]);

  console.log("\nAnalyzing results...");

  const analyzed       = analyzeSERP(serpItems);
  const domainFreq     = domainFrequency(analyzed);
  const opportunities  = findOpportunities(analyzed);

  const report = {
    generated: new Date().toISOString(),
    our_domain: OUR_DOMAIN,
    seed_keywords: SEED_KEYWORDS,
    summary: {
      keywords_researched: analyzed.length,
      keywords_we_rank_for: analyzed.filter((i) => i.our_position !== null).length,
      opportunity_keywords: opportunities.length,
      top_competitors: domainFreq.slice(0, 5).map((d) => d.domain),
    },
    rankings: analyzed,
    competitor_domain_frequency: domainFreq,
    opportunity_keywords: opportunities,
    long_tail_serp_data: longTailItems,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  const textReport = buildTextReport(analyzed, domainFreq, opportunities, longTailItems);
  fs.writeFileSync(OUT_TXT, textReport);

  console.log("\n" + textReport);
  console.log(`\nFiles saved:`);
  console.log(`  JSON  →  scripts/seo-keyword-report.json`);
  console.log(`  Text  →  scripts/seo-keyword-report.txt`);
}

run().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
