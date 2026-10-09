/**
 * Pulls Search Analytics data from Google Search Console (last 90 days) and
 * finds "page 2/3" opportunity queries — decent impressions, average position
 * 8-20 — where a small on-page tweak can realistically push to page 1.
 *
 * Uses the same GCP service account as scripts/gsc-resubmit-sitemap.js
 * (searchanalytics.query is covered by the same webmasters.readonly scope).
 *
 * Run on the VPS (where google-auth-library + the key live):
 *   node scripts/gsc-opportunity-report.js
 */

const fs = require("fs");
const path = require("path");
const { JWT } = require("google-auth-library");

const SITE_URL = "https://chatrio.app/";
const KEY_PATH =
  process.env.GSC_SERVICE_ACCOUNT_JSON ||
  "/root/chatrio-deploy/secrets/gsc-service-account.json";

const OUT_JSON = path.join(__dirname, "gsc-opportunity-report.json");
const OUT_TXT = path.join(__dirname, "gsc-opportunity-report.txt");

async function queryGSC(client, body) {
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    SITE_URL
  )}/searchAnalytics/query`;
  const res = await client.request({ url: endpoint, method: "POST", data: body });
  return res.data.rows || [];
}

function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function main() {
  if (!fs.existsSync(KEY_PATH)) {
    console.error(`No service-account JSON at ${KEY_PATH}`);
    process.exit(1);
  }

  const key = JSON.parse(fs.readFileSync(KEY_PATH, "utf8"));
  const client = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });

  const startDate = dateNDaysAgo(90);
  const endDate = dateNDaysAgo(2); // GSC data lags ~2 days

  console.log(`Querying GSC for ${SITE_URL} (${startDate} to ${endDate})...\n`);

  // Query by (query, page) so we know which URL to edit for each keyword.
  const rows = await queryGSC(client, {
    startDate,
    endDate,
    dimensions: ["query", "page"],
    rowLimit: 25000,
  });

  console.log(`Fetched ${rows.length} query+page rows.`);

  // Opportunity = avg position between 5 and 20, impressions >= 10.
  // (Position <5 is already winning; >20 is too far to nudge with on-page tweaks.)
  const opportunities = rows
    .map((r) => ({
      query: r.keys[0],
      page: r.keys[1],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }))
    .filter((r) => r.position >= 5 && r.position <= 20 && r.impressions >= 10)
    .sort((a, b) => b.impressions - a.impressions);

  // Also group by page to see which pages have the most "almost ranking" queries stacked up.
  const byPage = {};
  for (const o of opportunities) {
    if (!byPage[o.page]) byPage[o.page] = [];
    byPage[o.page].push(o);
  }
  const pagesSorted = Object.entries(byPage)
    .map(([page, queries]) => ({
      page,
      totalImpressions: queries.reduce((s, q) => s + q.impressions, 0),
      queryCount: queries.length,
      queries: queries.sort((a, b) => b.impressions - a.impressions),
    }))
    .sort((a, b) => b.totalImpressions - a.totalImpressions);

  const report = {
    generated: new Date().toISOString(),
    dateRange: { startDate, endDate },
    totalRows: rows.length,
    opportunityCount: opportunities.length,
    opportunities: opportunities.slice(0, 200),
    pagesSorted,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  const lines = [];
  lines.push("═══════════════════════════════════════════════════════");
  lines.push("  GSC PAGE-2/3 OPPORTUNITY REPORT (chatrio.app)");
  lines.push(`  Range: ${startDate} → ${endDate}`);
  lines.push(`  ${opportunities.length} opportunity queries found`);
  lines.push("═══════════════════════════════════════════════════════\n");

  lines.push("── TOP PAGES BY STACKED OPPORTUNITY (fix these first) ──\n");
  pagesSorted.slice(0, 20).forEach((p) => {
    lines.push(`${p.page}`);
    lines.push(`  ${p.queryCount} queries, ${p.totalImpressions} impressions`);
    p.queries.slice(0, 5).forEach((q) => {
      lines.push(
        `    • "${q.query}" — pos ${q.position.toFixed(1)}, ${q.impressions} impr, ${q.clicks} clicks`
      );
    });
    lines.push("");
  });

  lines.push("\n── TOP 50 INDIVIDUAL OPPORTUNITY QUERIES ──\n");
  opportunities.slice(0, 50).forEach((o) => {
    lines.push(
      `  "${o.query}" (pos ${o.position.toFixed(1)}, ${o.impressions} impr, ${o.clicks} clicks) → ${o.page}`
    );
  });

  fs.writeFileSync(OUT_TXT, lines.join("\n"));
  console.log(lines.join("\n"));
  console.log(`\nSaved: scripts/gsc-opportunity-report.json + .txt`);
}

main().catch((e) => {
  console.error("Fatal:", e.response?.data || e.message);
  process.exit(1);
});
