const fs = require("fs");
const { JWT } = require("google-auth-library");

const KEY_PATH =
  process.env.GSC_SERVICE_ACCOUNT_JSON ||
  "/root/chatrio-deploy/secrets/gsc-service-account.json";
const key = JSON.parse(fs.readFileSync(KEY_PATH, "utf8"));
const client = new JWT({
  email: key.client_email,
  key: key.private_key,
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});

async function main() {
  const endpoint =
    "https://searchconsole.googleapis.com/webmasters/v3/sites/" +
    encodeURIComponent("https://chatrio.app/") +
    "/searchAnalytics/query";
  const res = await client.request({
    url: endpoint,
    method: "POST",
    data: { startDate: "2026-07-11", endDate: "2026-10-07", dimensions: ["query"], rowLimit: 1000 },
  });
  const rows = (res.data.rows || []).sort((a, b) => b.impressions - a.impressions);
  const nonBranded = rows.filter((r) => !r.keys[0].toLowerCase().includes("chatrio"));
  console.log("TOTAL QUERIES:", rows.length);
  console.log("NON-BRANDED QUERIES:", nonBranded.length);
  console.log("");
  console.log("--- ALL QUERIES (sorted by impressions) ---");
  rows.forEach((r) =>
    console.log(
      r.keys[0].padEnd(50),
      "impr:" + r.impressions,
      "clicks:" + r.clicks,
      "pos:" + r.position.toFixed(1)
    )
  );
}
main().catch((e) => {
  console.error(e.response?.data || e.message);
  process.exit(1);
});
