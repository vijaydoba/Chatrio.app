/**
 * Exports the authoring source in posts-content.ts as one HTML asset per post.
 * BlogPost fetches only the active article, so a visitor no longer downloads
 * every article body in a single JavaScript chunk.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.resolve(__dirname, "..");
const contentSourcePath = path.join(
  projectRoot,
  "client/src/data/posts-content.ts"
);
const postsSourcePath = path.join(projectRoot, "client/src/data/posts.ts");
const outputDir = path.join(projectRoot, "client/public/blog-content");

// Use root typescript to avoid version.cjs in client
const ts = require("typescript");

function loadPostContent() {
  const source = fs.readFileSync(contentSourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: contentSourcePath,
  }).outputText;

  const module = { exports: {} };
  const context = vm.createContext({
    module,
    exports: module.exports,
    require,
  });
  new vm.Script(compiled, { filename: contentSourcePath }).runInContext(context);
  return module.exports.POST_CONTENT;
}

function postSlugs() {
  const source = fs.readFileSync(postsSourcePath, "utf8");
  return Array.from(
    source.matchAll(/\bslug:\s*["'`]([^"'`]+)["'`]/g),
    (match) => match[1]
  );
}

const content = loadPostContent();
const slugs = postSlugs();
const knownSlugs = new Set(slugs);
const missing = slugs.filter((slug) => typeof content[slug] !== "string");
const extras = Object.keys(content).filter((slug) => !knownSlugs.has(slug));

if (missing.length || extras.length) {
  if (missing.length) console.error(`Missing article bodies: ${missing.join(", ")}`);
  if (extras.length) console.error(`Article bodies without metadata: ${extras.join(", ")}`);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

// --- FAQPage structured data -------------------------------------------------
// Posts author their FAQ as `<h2 id="faq">…</h2>` + `<h3>Q</h3><p>A</p>` pairs,
// but almost none carry FAQPage JSON-LD. React-helmet-injected schema does not
// survive prerendering, so we inline the schema into the article body (which
// always prerenders). Regenerated on every build, so it stays in sync.
function decodeEntities(s) {
  return s
    .replace(/<[^>]+>/g, "") // drop inline tags (links/strong) inside Q/A text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "’")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function faqScriptFor(html) {
  if (html.includes('"@type":"FAQPage"')) return null; // already has it
  let start = html.search(/<h2[^>]*\bid="faq"/i);
  // Some posts author the FAQ heading as a plain `<h2>Frequently Asked
  // Questions</h2>` without the id; match that too so they aren't silently
  // skipped (7 posts were missing schema because of this).
  if (start === -1) start = html.search(/<h2[^>]*>\s*Frequently Asked Questions\s*<\/h2>/i);
  if (start === -1) return null;
  // FAQ block runs until the related-reading box, the next <h2>, or the end.
  const after = html.slice(start);
  const endRel = after.search(/<div class="post-related"/i);
  const endH2 = after.slice(1).search(/<h2[\s>]/i); // skip the FAQ h2 itself
  let end = after.length;
  if (endRel !== -1) end = Math.min(end, endRel);
  if (endH2 !== -1) end = Math.min(end, endH2 + 1);
  const section = after.slice(0, end);

  const pairs = [...section.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi)];
  const faqs = pairs
    .map(([, q, a]) => ({ q: decodeEntities(q), a: decodeEntities(a) }))
    .filter((f) => f.q && f.a);
  if (faqs.length < 2) return null; // not a real FAQ

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return `\n<script type="application/ld+json">${JSON.stringify(schema)}</script>\n`;
}

// DefinedTermSet for the glossary pillar — the canonical schema for a glossary,
// a strong topical-authority signal. Parses `<h3>Term</h3><p>definition</p>`
// pairs that appear before the FAQ (term names are plain text, so `[^<]` skips
// the table-of-contents h3 which is followed by a <ul>, not a <p>).
const GLOSSARY_SLUG = "dating-chat-slang-glossary-2026";
function definedTermSetFor(slug, html) {
  if (slug !== GLOSSARY_SLUG) return null;
  if (html.includes('"@type":"DefinedTermSet"')) return null;
  const faqAt = html.search(/<h2[^>]*\bid="faq"/i);
  const body = faqAt > -1 ? html.slice(0, faqAt) : html;
  const terms = [...body.matchAll(/<h3[^>]*>([^<]+?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(([, name, def]) => ({ name: decodeEntities(name), description: decodeEntities(def) }))
    .filter((t) => t.name && t.description && t.name.length < 60);
  if (terms.length < 5) return null;
  const schema = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Modern Dating & Chat Slang Glossary",
    url: `https://chatrio.app/blog/${GLOSSARY_SLUG}`,
    hasDefinedTerm: terms.map((t) => ({
      "@type": "DefinedTerm",
      name: t.name,
      description: t.description,
      inDefinedTermSet: `https://chatrio.app/blog/${GLOSSARY_SLUG}`,
    })),
  };
  return `\n<script type="application/ld+json">${JSON.stringify(schema)}</script>\n`;
}

let faqInjected = 0;
let termSetInjected = 0;
for (const slug of slugs) {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`Unsafe blog slug: ${slug}`);
  }
  let body = content[slug];
  const faqScript = faqScriptFor(body);
  if (faqScript) {
    body += faqScript;
    faqInjected++;
  }
  const termSet = definedTermSetFor(slug, body);
  if (termSet) {
    body += termSet;
    termSetInjected++;
  }
  fs.writeFileSync(path.join(outputDir, `${slug}.html`), body, "utf8");
}

console.log(
  `✅  blog content exported — ${slugs.length} article HTML files (FAQPage injected into ${faqInjected}, DefinedTermSet into ${termSetInjected})`
);
