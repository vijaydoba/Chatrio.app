/* Regenerate all Chatrio favicon / app-icon assets from the ChatrioMascot mark.
 * Dark background (so the mascot's white sticker outline is visible) + a soft
 * purple glow, matching the PWA manifest's dark theme. Run: node scripts/generate-favicons.js
 * Requires sharp (present in client/node_modules).
 */
const fs = require("fs");
const path = require("path");
const sharp = require(path.join(__dirname, "../client/node_modules/sharp"));

const BRANDING = path.join(__dirname, "../client/public/branding");
const PUBLIC = path.join(__dirname, "../client/public");

// The mascot artwork in its native 0..120 space (kept in sync with
// client/src/components/ChatrioMascot.tsx).
const mascot = `
  <g filter="url(#ic-sh)">
    <path d="M60 14 C33 14 14 30 14 52 C14 68 24 81 41 87 L36 104 L58 86 C59 86 60 86 60 86 C87 86 106 70 106 52 C106 30 87 14 60 14 Z"
          fill="url(#ic-g)" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
  </g>
  <circle cx="45" cy="46" r="9" fill="#fff"/>
  <circle cx="75" cy="46" r="9" fill="#fff"/>
  <circle cx="47" cy="47" r="4.2" fill="#0b1220"/>
  <circle cx="77" cy="47" r="4.2" fill="#0b1220"/>
  <path d="M42 60 Q60 82 78 60 Z" fill="#fff"/>
  <path d="M54 71 Q60 82 66 71 Q66 66 60 66 Q54 66 54 71 Z" fill="#22d3ee"/>
`;

/** Full icon SVG at 512 design units. `radius` rounds the background corners
 *  (use 0 for maskable full-bleed PNGs). */
function iconSvg(radius) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="ic-g" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <radialGradient id="ic-bg" cx="0.5" cy="0.44" r="0.62">
      <stop offset="0%" stop-color="#1b1436"/>
      <stop offset="55%" stop-color="#0d1018"/>
      <stop offset="100%" stop-color="#0b0f14"/>
    </radialGradient>
    <radialGradient id="ic-glow" cx="0.5" cy="0.44" r="0.5">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
    </radialGradient>
    <filter id="ic-sh" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#6d28d9" flood-opacity="0.45"/>
    </filter>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="${radius}" fill="url(#ic-bg)"/>
  <circle cx="256" cy="226" r="230" fill="url(#ic-glow)"/>
  <g transform="translate(64,67) scale(3.2)">
    ${mascot}
  </g>
</svg>`;
}

// Minimal ICO encoder: packs PNG frames (PNG-in-ICO, supported everywhere modern).
function buildIco(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(frames.length, 4);
  const dir = Buffer.alloc(16 * frames.length);
  let offset = 6 + dir.length;
  frames.forEach((f, i) => {
    const e = i * 16;
    dir.writeUInt8(f.size >= 256 ? 0 : f.size, e + 0);
    dir.writeUInt8(f.size >= 256 ? 0 : f.size, e + 1);
    dir.writeUInt8(0, e + 2); // colors
    dir.writeUInt8(0, e + 3); // reserved
    dir.writeUInt16LE(1, e + 4); // planes
    dir.writeUInt16LE(32, e + 6); // bpp
    dir.writeUInt32LE(f.buf.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += f.buf.length;
  });
  return Buffer.concat([header, dir, ...frames.map((f) => f.buf)]);
}

async function png(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

(async () => {
  const roundedSvg = iconSvg(112); // ~22% squircle for the SVG favicon
  const squareSvg = iconSvg(0); // full-bleed for maskable PNGs

  // SVG favicon
  fs.writeFileSync(path.join(BRANDING, "chatrio-favicon-2026.svg"), roundedSvg.trim() + "\n");

  // App-icon PNGs (maskable → full-bleed square background)
  for (const size of [48, 192, 512]) {
    fs.writeFileSync(path.join(BRANDING, `chatrio-icon-${size}-2026.png`), await png(squareSvg, size));
  }

  // favicon.ico with 16/32/48 rounded frames
  const frames = [];
  for (const size of [16, 32, 48]) frames.push({ size, buf: await png(roundedSvg, size) });
  fs.writeFileSync(path.join(PUBLIC, "favicon-2026.ico"), buildIco(frames));

  console.log("✅ Wrote:");
  console.log("  branding/chatrio-favicon-2026.svg");
  console.log("  branding/chatrio-icon-{48,192,512}-2026.png");
  console.log("  favicon-2026.ico (16/32/48)");
})().catch((e) => { console.error(e); process.exit(1); });
