/* Regenerate the 1200×630 social share card with the ChatrioMascot mark.
 * Rebuilds the existing card layout (dark bg + glow, logo+wordmark, headline,
 * "No sign-up · Free forever") but swaps the old speech-bubble graphic for the
 * mascot. Rendered via puppeteer (headless Chrome) for pixel-perfect text,
 * matching the repo's other banner generators.
 * Run: node scripts/generate-social-card.js
 */
const puppeteer = require("../client/node_modules/puppeteer");
const path = require("path");

const OUT = path.resolve(__dirname, "../client/public/branding/chatrio-social-card-2026.png");

// Mascot markup in its native 0..120 space (kept in sync with
// client/src/components/ChatrioMascot.tsx). `uid` keeps ids unique per instance.
function mascot(uid) {
  return `<svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${uid}-g" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#06b6d4"/>
      </linearGradient>
      <filter id="${uid}-sh" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#6d28d9" flood-opacity="0.5"/>
      </filter>
    </defs>
    <g filter="url(#${uid}-sh)">
      <path d="M60 14 C33 14 14 30 14 52 C14 68 24 81 41 87 L36 104 L58 86 C59 86 60 86 60 86 C87 86 106 70 106 52 C106 30 87 14 60 14 Z"
            fill="url(#${uid}-g)" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
    </g>
    <circle cx="45" cy="46" r="9" fill="#fff"/><circle cx="75" cy="46" r="9" fill="#fff"/>
    <circle cx="47" cy="47" r="4.2" fill="#0b1220"/><circle cx="77" cy="47" r="4.2" fill="#0b1220"/>
    <path d="M42 60 Q60 82 78 60 Z" fill="#fff"/>
    <path d="M54 71 Q60 82 66 71 Q66 66 60 66 Q54 66 54 71 Z" fill="#22d3ee"/>
  </svg>`;
}

const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px}
.card{
  position:relative;width:1200px;height:630px;overflow:hidden;
  background:linear-gradient(120deg,#0a0d13 0%,#0c1018 55%,#0e1420 100%);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
}
.glow-a{position:absolute;left:-160px;bottom:-200px;width:620px;height:620px;border-radius:50%;
  background:radial-gradient(circle,rgba(124,58,237,.38),rgba(124,58,237,0) 68%)}
.glow-b{position:absolute;right:-120px;top:-160px;width:560px;height:560px;border-radius:50%;
  background:radial-gradient(circle,rgba(6,182,212,.22),rgba(6,182,212,0) 68%)}
.brand{position:absolute;left:80px;top:96px;display:flex;align-items:center;gap:20px}
.brand .mark{width:76px;height:76px}
.brand .word{font-size:46px;font-weight:800;color:#fff;letter-spacing:-.5px}
.headline{position:absolute;left:80px;top:212px;max-width:660px}
.headline .l1{font-size:74px;font-weight:800;color:#fff;line-height:1.04;letter-spacing:-2px}
.headline .l2{font-size:74px;font-weight:800;line-height:1.04;letter-spacing:-2px;margin-top:6px;
  background:linear-gradient(120deg,#a78bfa 0%,#818cf8 45%,#22d3ee 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent;display:inline-block}
.sub{position:absolute;left:82px;top:512px;font-size:30px;font-weight:600;color:rgba(255,255,255,.62);
  display:flex;align-items:center;gap:16px}
.sub .dot{width:7px;height:7px;border-radius:50%;background:rgba(124,58,237,.9);display:inline-block}
.hero{position:absolute;right:110px;top:50%;transform:translateY(-50%);width:400px;height:400px;
  display:flex;align-items:center;justify-content:center}
.hero .ring{position:absolute;border:2px solid rgba(124,58,237,.20);border-radius:50%}
.hero .r1{width:520px;height:520px}
.hero .r2{width:400px;height:400px;border-color:rgba(6,182,212,.16)}
.hero .mm{width:300px;height:300px;position:relative;z-index:2}
</style></head><body>
<div class="card">
  <div class="glow-a"></div><div class="glow-b"></div>
  <div class="brand"><span class="mark">${mascot("m1")}</span><span class="word">Chatrio</span></div>
  <div class="headline">
    <div class="l1">Anonymous chat with strangers.</div>
    <div class="l2">Real talk, right now.</div>
  </div>
  <div class="sub"><span>No sign-up</span><span class="dot"></span><span>Free forever</span></div>
  <div class="hero">
    <div class="ring r1"></div><div class="ring r2"></div>
    <div class="mm">${mascot("m2")}</div>
  </div>
</div>
</body></html>`;

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await browser.close();
  console.log("✅ Wrote", path.relative(process.cwd(), OUT));
})().catch((e) => { console.error(e); process.exit(1); });
