/**
 * Generates country-relevant ILLUSTRATED girl portraits for Chatrio web stories / geo pages.
 *
 * These are friendly, wholesome ILLUSTRATIONS (not photos of real people) that match
 * Chatrio's existing warm dusk art style. They are representative brand art, NOT depictions
 * of real users — keep alt text honest ("illustration of a friendly person chatting").
 *
 * Uses Google's Gemini image model ("Nano Banana"). Free tier available.
 *   Get a key: https://aistudio.google.com/apikey
 *
 * RUN:
 *   GEMINI_API_KEY=your_key node scripts/generate-portraits.js
 *   GEMINI_API_KEY=your_key node scripts/generate-portraits.js --only us,india   # subset
 *
 * Output: client/public/images/portraits/girl-<code>.png  (3:4 portrait)
 */

const fs   = require("fs");
const path = require("path");
const https = require("https");

/* Provider: "pollinations" (free, no key — DEFAULT) or "gemini" (needs billing-enabled key). */
const PROVIDER = (process.argv.includes("--provider")
  ? process.argv[process.argv.indexOf("--provider") + 1]
  : process.env.IMAGE_PROVIDER) || "pollinations";
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const MODEL   = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const OUT_DIR = path.join(__dirname, "../client/public/images/portraits");

if (PROVIDER === "gemini" && !API_KEY) {
  console.error("\n❌  No GEMINI_API_KEY set for --provider gemini.\n");
  process.exit(1);
}

/* Shared style anchor — keeps every portrait on-brand and consistent. */
const STYLE =
  "Soft warm digital illustration in a cozy, romantic dusk style. Golden-hour palette of " +
  "purple, amber and rose tones with soft glowing bokeh city lights blurred in the background. " +
  "Warm rim lighting, gentle painterly shading, wholesome and welcoming mood. Friendly approachable " +
  "young woman in her early twenties, smiling softly, holding a smartphone, cozy and relaxed. " +
  "Tasteful, modest, non-sexualized, kind expression. Clearly an ILLUSTRATION, not a photograph. " +
  "Vertical 3:4 portrait composition, head-and-shoulders to waist, centered. No text, no watermark, no logos.";

/* Per-country subject lines — respectful, modern, not caricatured. */
const COUNTRIES = {
  us:          "An American young woman with a casual modern everyday style.",
  india:       "A young Indian woman with a modern casual outfit, warm and friendly.",
  uk:          "A young British woman in a cozy autumn-evening sweater.",
  mexico:      "A young Mexican (Latina) woman with a warm casual style.",
  canada:      "A young Canadian woman in a cozy knit sweater, warm winter-evening feel.",
  indonesia:   "A young Indonesian (Southeast Asian) woman with a modern casual style.",
  uae:         "A young woman in the UAE with an elegant, modest, modern style and a tasteful light headscarf.",
  philippines: "A young Filipina woman with a modern casual style.",
  pakistan:    "A young Pakistani woman with a modest modern style and a light dupatta.",
  brazil:      "A young Brazilian woman with a warm, casual summer-evening style.",
};

/* ── Pollinations.ai — free, no key (Flux-based) ── */
function genImagePollinations(prompt, seed) {
  const url =
    "https://image.pollinations.ai/prompt/" +
    encodeURIComponent(prompt) +
    `?width=768&height=1024&nologo=true&model=flux&seed=${seed}`;
  return new Promise((resolve, reject) => {
    const get = (u, depth = 0) => {
      if (depth > 5) return reject(new Error("too many redirects"));
      https.get(u, { timeout: 90000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return get(res.headers.location, depth + 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      }).on("error", reject).on("timeout", function () { this.destroy(new Error("timeout")); });
    };
    get(url);
  });
}

function genImageGemini(prompt) {
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["IMAGE"] },
  });
  const opts = {
    method: "POST",
    hostname: "generativelanguage.googleapis.com",
    path: `/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error.message));
          const parts = (((json.candidates || [])[0] || {}).content || {}).parts || [];
          const img = parts.find((p) => p.inlineData && p.inlineData.data);
          if (!img) return reject(new Error("No image in response: " + data.slice(0, 300)));
          resolve(Buffer.from(img.inlineData.data, "base64"));
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const onlyArg = process.argv.indexOf("--only");
  const only = onlyArg !== -1 ? process.argv[onlyArg + 1].split(",").map((s) => s.trim()) : null;

  const codes = Object.keys(COUNTRIES).filter((c) => !only || only.includes(c));
  console.log(`🎨  Generating ${codes.length} portraits via ${PROVIDER}...\n`);

  let seed = 4200;
  for (const code of codes) {
    const prompt = `${COUNTRIES[code]} ${STYLE}`;
    try {
      const buf = PROVIDER === "gemini"
        ? await genImageGemini(prompt)
        : await genImagePollinations(prompt, seed++);
      const out = path.join(OUT_DIR, `girl-${code}.png`);
      fs.writeFileSync(out, buf);
      console.log(`  ✅  girl-${code}.png  (${(buf.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.error(`  ❌  ${code}: ${e.message}`);
    }
    await sleep(1500);
  }
  console.log("\n✨  Done. Next: optimize + wire into stories, then build & deploy.");
})();
