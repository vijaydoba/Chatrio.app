/**
 * Generates Google Web Stories (AMP HTML) from stories.ts
 * Output: client/public/web-stories/[story-id]/index.html
 * Also outputs: client/public/web-stories/bookend.json
 */

const fs   = require("fs");
const path = require("path");

const BASE_URL = "https://chatrio.app";
const TODAY    = new Date().toISOString().split("T")[0];

const CHAR_IMAGES = {
  girl:   ["/images/image7.webp", "/images/image8.webp", "/images/image6.webp", "/images/image4.webp"],
  boy:    ["/images/image2.webp", "/images/image3.webp", "/images/image5.webp"],
  couple: ["/images/image9.webp", "/images/image11.webp", "/images/image12.webp"],
};

/* AMP animate-in names */
const AMP_ANIM = {
  zoom:          "zoom-in",
  "slide-left":  "fly-in-right",
  "slide-right": "fly-in-left",
  bounce:        "fly-in-bottom",
};

function charSrc(character, slideIdx) {
  const imgs = CHAR_IMAGES[character] || [];
  return imgs[slideIdx % imgs.length] || "";
}

function ampAnim(animation) {
  return AMP_ANIM[animation] || "fade-in";
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Load stories by stripping TS types and requiring as JS ── */
function loadStories() {
  const storiesPath = path.join(__dirname, "../client/src/data/stories.ts");
  let src = fs.readFileSync(storiesPath, "utf8");
  src = src.replace(/export type \w+ = \{[\s\S]*?\n\};/g, "");
  src = src.replace("export const STORIES: Story[] = [", "const STORIES = [");
  src += "\nmodule.exports = { STORIES };\n";
  const tmpPath = path.join(__dirname, "_tmp_stories_amp.js");
  fs.writeFileSync(tmpPath, src, "utf8");
  try {
    delete require.cache[require.resolve(tmpPath)];
    return require(tmpPath).STORIES;
  } finally {
    try { fs.unlinkSync(tmpPath); } catch (_) {}
  }
}

/* ── Render one amp-story-page ── */
function renderPage(slide, slideIdx) {
  const anim = ampAnim(slide.animation);

  /* Background image layer — external URLs get full-bleed photo treatment */
  const isPhoto = slide.bgImage && slide.bgImage.startsWith("http");
  const bgSrc   = slide.bgImage
    ? (isPhoto ? slide.bgImage : `${BASE_URL}${slide.bgImage}`)
    : null;
  const bgLayer = bgSrc
    ? `
      <amp-story-layer template="fill" class="${isPhoto ? "bg-photo-layer" : "bg-img-layer"}">
        <amp-img src="${bgSrc}" width="720" height="1280" layout="fill"></amp-img>
      </amp-story-layer>${isPhoto ? `
      <amp-story-layer template="fill" class="bg-overlay-layer">
        <div class="bg-overlay-gradient"></div>
      </amp-story-layer>` : ""}`
    : "";

  /* Character portrait or emoji — NO <a> here */
  let media = "";
  if (slide.character) {
    const src = charSrc(slide.character, slideIdx);
    media = `
        <amp-img src="${BASE_URL}${src}"
          width="120" height="120" layout="fixed"
          class="char-img"
          animate-in="${anim}" animate-in-delay="0ms"
        ></amp-img>`;
  } else if (slide.emoji && !isPhoto) {
    media = `
        <p class="slide-emoji" animate-in="${anim}" animate-in-delay="0ms">${slide.emoji}</p>`;
  }

  /* CTA must use amp-story-cta-layer — <a> is banned inside amp-story-layer */
  const ctaLayer = slide.cta
    ? `
      <amp-story-cta-layer>
        <a href="${BASE_URL}${slide.cta.href}" target="_blank" class="cta-btn">${esc(slide.cta.label)}</a>
      </amp-story-cta-layer>`
    : "";

  /* Use h1 on first slide for SEO — subsequent slides use h2 */
  const headingTag = slideIdx === 0 ? "h1" : "h2";

  return `
    <amp-story-page id="page-${slideIdx}" auto-advance-after="6s">${bgLayer}
      <amp-story-layer template="vertical" class="content-layer${isPhoto ? " photo-content" : ""}">
        ${media}
        <${headingTag} class="slide-heading" animate-in="${anim}" animate-in-delay="300ms">${esc(slide.heading)}</${headingTag}>
        <p  class="slide-text"    animate-in="${anim}" animate-in-delay="500ms">${esc(slide.text)}</p>
      </amp-story-layer>${ctaLayer}
    </amp-story-page>`;
}

/* ── Build full AMP HTML for one story ── */
function buildStoryHTML(story) {
  const storyUrl   = `${BASE_URL}/web-stories/${story.id}/`;
  const firstSlide = story.slides[0];
  const desc       = esc(firstSlide.text.slice(0, 155));
  const titleEsc   = esc(story.title);
  /* Per-story poster/share image (e.g. country portrait); falls back to brand logo */
  const posterSrc  = story.posterImage
    ? `${BASE_URL}${story.posterImage}`
    : `${BASE_URL}/branding/chatrio-512.png`;

  const pages = story.slides.map((slide, i) => renderPage(slide, i)).join("");

  /* Preload LCP images: bg image is the true LCP (fills 720×1280); char portrait is secondary */
  const firstBgSrc = firstSlide.bgImage
    ? (firstSlide.bgImage.startsWith("http") ? firstSlide.bgImage : `${BASE_URL}${firstSlide.bgImage}`)
    : null;
  const CHAR_IMAGES_MAP = {
    girl:   ["/images/image7.webp", "/images/image8.webp", "/images/image6.webp", "/images/image4.webp"],
    boy:    ["/images/image2.webp", "/images/image3.webp", "/images/image5.webp"],
    couple: ["/images/image9.webp", "/images/image11.webp", "/images/image12.webp"],
  };
  const firstCharSrc = firstSlide.character
    ? `${BASE_URL}${(CHAR_IMAGES_MAP[firstSlide.character] || [])[0] || ""}`
    : null;
  /* Always preload bg (true LCP); also preload char portrait when present */
  const lcpPreload = [
    firstBgSrc ? `<link rel="preload" as="image" href="${firstBgSrc}">` : "",
    firstCharSrc ? `<link rel="preload" as="image" href="${firstCharSrc}">` : "",
  ].filter(Boolean).join("\n  ");

  /* Apply story gradient to all pages via CSS — no empty fill layers needed */
  const gradCSS = `amp-story-page{background:${story.gradient}}`;

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type":    "WebStory",
    headline:   story.title,
    description: firstSlide.text.slice(0, 155),
    url:        storyUrl,
    datePublished: TODAY,
    dateModified:  TODAY,
    author:    { "@type": "Organization", name: "Chatrio", url: BASE_URL },
    publisher: {
      "@type": "Organization",
      name:    "Chatrio",
      url:     BASE_URL,
      logo:    { "@type": "ImageObject", url: `${BASE_URL}/branding/chatrio-64.png`, width: 64, height: 64 },
    },
    image: {
      "@type": "ImageObject",
      url: posterSrc,
      width: story.posterImage ? 720 : 512,
      height: story.posterImage ? 1280 : 512,
    },
  });

  /* AMP boilerplate — exact verbatim content required */
  const BP  = "body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}";
  const BPN = "body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}";

  /* HEAD ORDER that passes AMP validator:
     1. charset (must be first)
     2. AMP runtime + component scripts
     3. title / canonical / viewport / meta / og / twitter
     4. amp-boilerplate  ← must come AFTER scripts
     5. amp-custom styles
     6. structured data */
  return `<!doctype html>
<html ⚡4stories lang="en">
<head>
  <meta charset="utf-8">
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  <script async custom-element="amp-story" src="https://cdn.ampproject.org/v0/amp-story-1.0.js"></script>
  <title>${titleEsc} | Chatrio Stories</title>
  <link rel="canonical" href="${storyUrl}">
  ${lcpPreload}
  <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
  <meta name="description" content="${desc}">
  <meta property="og:type"        content="article">
  <meta property="og:title"       content="${titleEsc}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image"       content="${posterSrc}">
  <meta property="og:url"         content="${storyUrl}">
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${titleEsc}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image"        content="${posterSrc}">
  <style amp-boilerplate>${BP}</style><noscript><style amp-boilerplate>${BPN}</style></noscript>
  <style amp-custom>
body{margin:0;padding:0}
.content-layer{padding:36px 24px 28px;box-sizing:border-box}
.char-img{display:block;margin:0 auto 20px;border-radius:50%;border:3px solid rgba(255,255,255,.55);box-shadow:0 4px 24px rgba(0,0,0,.45)}
.slide-emoji{font-size:68px;margin:0 0 20px;text-align:center;display:block;line-height:1}
h1.slide-heading,h2.slide-heading,.slide-heading{font-size:30px;font-weight:700;color:#fff;margin:0 0 14px;line-height:1.25;text-align:center;text-shadow:0 2px 10px rgba(0,0,0,.55);font-family:Google Sans,Roboto,sans-serif}
.slide-text{font-size:17px;color:rgba(255,255,255,.93);margin:0 0 22px;line-height:1.55;text-align:center;text-shadow:0 1px 5px rgba(0,0,0,.4);font-family:Google Sans,Roboto,sans-serif}
.photo-content{justify-content:flex-start;padding-top:32%;padding-bottom:20px}
.photo-content .slide-heading{font-size:32px;text-shadow:0 2px 16px rgba(0,0,0,.8)}
.photo-content .slide-text{font-size:18px;text-shadow:0 1px 10px rgba(0,0,0,.8)}
.cta-btn{display:inline-block;background:rgba(255,255,255,.22);color:#fff;border:2px solid rgba(255,255,255,.65);border-radius:50px;padding:14px 32px;font-size:15px;font-weight:700;text-decoration:none;font-family:Google Sans,Roboto,sans-serif;text-align:center;letter-spacing:.02em}
.bg-img-layer{opacity:.18}
.bg-photo-layer{opacity:1}
.bg-overlay-layer{background:transparent}
.bg-overlay-gradient{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.18) 0%,rgba(0,0,0,.52) 55%,rgba(0,0,0,.78) 100%)}
${gradCSS}
  </style>
  <script type="application/ld+json">${schema}</script>
</head>
<body>
  <amp-story
    standalone
    title="${titleEsc}"
    publisher="Chatrio"
    publisher-logo-src="${BASE_URL}/branding/chatrio-64.png"
    poster-portrait-src="${posterSrc}"
    poster-square-src="${BASE_URL}/branding/chatrio-512.png"
  >${pages}
    <amp-story-bookend src="${BASE_URL}/web-stories/bookend.json" layout="nodisplay"></amp-story-bookend>
  </amp-story>
</body>
</html>`;
}

/* ── Bookend JSON ── */
function buildBookend(stories) {
  return {
    bookendVersion: "v1.0",
    shareProviders: ["twitter", "facebook", "whatsapp", "email"],
    components: [
      { type: "heading", text: "More Stories from Chatrio" },
      ...stories.slice(0, 8).map((s) => ({
        type:  "small",
        title: s.title,
        url:   `${BASE_URL}/web-stories/${s.id}/`,
        image: `${BASE_URL}/branding/chatrio-512.png`,
      })),
      {
        type: "cta-link",
        links: [
          { text: "Chat Anonymously Free →", url: `${BASE_URL}/chat` },
          { text: "Browse All Stories",      url: `${BASE_URL}/stories` },
        ],
      },
    ],
  };
}

/* ── Main ── */
const STORIES = loadStories();
const destArg = process.argv.indexOf("--dest");
const outDir  = destArg !== -1
  ? path.resolve(process.argv[destArg + 1])
  : path.join(__dirname, "../client/public/web-stories");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

STORIES.forEach((story) => {
  const storyDir = path.join(outDir, story.id);
  if (!fs.existsSync(storyDir)) fs.mkdirSync(storyDir, { recursive: true });
  fs.writeFileSync(path.join(storyDir, "index.html"), buildStoryHTML(story), "utf8");
});

fs.writeFileSync(
  path.join(outDir, "bookend.json"),
  JSON.stringify(buildBookend(STORIES), null, 2),
  "utf8"
);

console.log(`✅  Google Web Stories: ${STORIES.length} AMP pages generated in /web-stories/`);
