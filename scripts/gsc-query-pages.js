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

const TARGET_TERMS = [
  "dtr", "orbiting", "triangulation", "negging", "kitten fishing", "kittenfishing",
  "compersion", "social battery", "weaponized incompetence", "curving", "delulu",
  "ghosting", "fawning", "parasocial", "blind dat", "meetup alternative",
  "ftf live", "omegle shut down", "omegle 2026", "what random video chat",
  "what are the best omegle",
];

async function main() {
  const endpoint =
    "https://searchconsole.googleapis.com/webmasters/v3/sites/" +
    encodeURIComponent("https://chatrio.app/") +
    "/searchAnalytics/query";
  const res = await client.request({
    url: endpoint,
    method: "POST",
    data: { startDate: "2026-07-11", endDate: "2026-10-07", dimensions: ["query", "page"], rowLimit: 5000 },
  });
  const rows = res.data.rows || [];
  const matched = rows.filter((r) =>
    TARGET_TERMS.some((t) => r.keys[0].toLowerCase().includes(t))
  );
  matched.sort((a, b) => b.impressions - a.impressions);
  matched.forEach((r) =>
    console.log(
      `"${r.keys[0]}"`.padEnd(45),
      "→", r.keys[1].replace("https://chatrio.app", ""),
      `| impr:${r.impressions} clicks:${r.clicks} pos:${r.position.toFixed(1)}`
    )
  );
}
main().catch((e) => {
  console.error(e.response?.data || e.message);
  process.exit(1);
});
