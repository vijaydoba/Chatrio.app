/**
 * Fast consistency audit for blog metadata, article bodies, internal links,
 * generated content assets, images, categories, sitemap coverage, and SEO caps.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const clientRoot = path.join(root, "client");
const publicRoot = path.join(clientRoot, "public");
const typescriptPath = require.resolve("typescript", { paths: [clientRoot] });
const ts = require(typescriptPath);

function loadTsModule(relativePath) {
  const filename = path.join(root, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  const context = vm.createContext({ module, exports: module.exports, require });
  new vm.Script(compiled, { filename }).runInContext(context);
  return module.exports;
}

function finalSeoTitle(title) {
  const suffix = " | Chatrio";
  const max = 60;
  if ((title + suffix).length <= max) return title + suffix;
  const available = max - suffix.length - 1;
  const cut = title.slice(0, available).trimEnd();
  const lastSpace = cut.lastIndexOf(" ");
  const short = lastSpace > available * 0.6 ? cut.slice(0, lastSpace) : cut;
  return short + "…" + suffix;
}

function finalSeoDescription(description) {
  const max = 155;
  const clean = description.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1).trimEnd();
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > max * 0.7 ? cut.slice(0, lastSpace) : cut}…`;
}

const { POSTS, POST_REDIRECTS } = loadTsModule("client/src/data/posts.ts");
const { POST_CONTENT } = loadTsModule("client/src/data/posts-content.ts");
const failures = [];
const slugs = POSTS.map((post) => post.slug);
const slugSet = new Set(slugs);
const contentSlugs = Object.keys(POST_CONTENT);

if (slugSet.size !== slugs.length) failures.push("Duplicate post slugs found");

for (const slug of slugs) {
  if (typeof POST_CONTENT[slug] !== "string") {
    failures.push(`Missing article body: ${slug}`);
  }
  if (!fs.existsSync(path.join(publicRoot, "blog-content", `${slug}.html`))) {
    failures.push(`Missing generated article asset: ${slug}.html`);
  }
}

for (const slug of contentSlugs) {
  if (!slugSet.has(slug)) failures.push(`Article body has no post metadata: ${slug}`);
}

const validBlogTargets = new Set([...slugs, ...Object.keys(POST_REDIRECTS)]);
const brokenInternalLinks = [];
const redirectedInternalLinks = [];
const missingBodyImages = [];

for (const [sourceSlug, html] of Object.entries(POST_CONTENT)) {
  for (const match of html.matchAll(/href=["']\/blog\/([^"'?#/]+)["']/g)) {
    const target = decodeURIComponent(match[1]);
    if (!validBlogTargets.has(target)) {
      brokenInternalLinks.push(`${sourceSlug} → ${target}`);
    } else if (POST_REDIRECTS[target]) {
      redirectedInternalLinks.push(
        `${sourceSlug} → ${target} (use ${POST_REDIRECTS[target]})`
      );
    }
  }

  for (const match of html.matchAll(/src=["']\/([^"'?#]+)["']/g)) {
    if (!fs.existsSync(path.join(publicRoot, decodeURIComponent(match[1])))) {
      missingBodyImages.push(`${sourceSlug} → /${match[1]}`);
    }
  }
}

if (brokenInternalLinks.length) {
  failures.push(`Broken internal article links:\n  ${brokenInternalLinks.join("\n  ")}`);
}
if (redirectedInternalLinks.length) {
  failures.push(
    `Internal article links that take a redirect hop:\n  ${redirectedInternalLinks.join("\n  ")}`
  );
}
if (missingBodyImages.length) {
  failures.push(`Missing article images:\n  ${missingBodyImages.join("\n  ")}`);
}

for (const post of POSTS) {
  const thumbnail = String(post.thumbnail).replace(/^\/+/, "");
  if (!fs.existsSync(path.join(publicRoot, thumbnail))) {
    failures.push(`Missing thumbnail: ${post.slug} → ${post.thumbnail}`);
  }

  if (thumbnail.includes("hero-") && thumbnail.endsWith(".png")) {
    const base = thumbnail.replace(/\.png$/, "");
    for (const variant of ["card", "thumb"]) {
      if (!fs.existsSync(path.join(publicRoot, `${base}-${variant}.png`))) {
        failures.push(`Missing ${variant} image: ${post.slug}`);
      }
    }
  }

  const title = finalSeoTitle(post.title);
  const description = finalSeoDescription(post.excerpt);
  if (title.length > 60) failures.push(`SEO title over 60 characters: ${post.slug}`);
  if (description.length > 155) {
    failures.push(`SEO description over 155 characters: ${post.slug}`);
  }
}

const expectedCategories = [
  "Chat & Connection",
  "Relationships",
  "Mental Health",
  "Dating",
  "Love",
  "Romance",
];
const actualCategories = new Set(POSTS.map((post) => post.category));
for (const category of expectedCategories) {
  if (!actualCategories.has(category)) failures.push(`Missing category data: ${category}`);
}

const sitemap = fs.readFileSync(path.join(publicRoot, "sitemap.xml"), "utf8");
for (const slug of slugs) {
  if (!sitemap.includes(`<loc>https://chatrio.app/blog/${slug}</loc>`)) {
    failures.push(`Post absent from sitemap: ${slug}`);
  }
}
for (const categoryUrl of [
  "chat%20%26%20connection",
  "relationships",
  "mental%20health",
  "dating",
  "love",
  "romance",
]) {
  if (!sitemap.includes(`<loc>https://chatrio.app/blog/${categoryUrl}</loc>`)) {
    failures.push(`Category absent from sitemap: ${categoryUrl}`);
  }
}

const articleComponent = fs.readFileSync(
  path.join(clientRoot, "src/pages/BlogPost.tsx"),
  "utf8"
);
if (/from\s+["']\.\.\/data\/posts-content["']/.test(articleComponent)) {
  failures.push("BlogPost still imports the all-article content source");
}

const highRiskWithoutSources = POSTS.filter((post) => {
  const html = POST_CONTENT[post.slug] || "";
  return (
    /(?:\b\d+(?:\.\d+)?(?:%|×)|\b\d+(?:\.\d+)?\s+(?:million|billion)\b|\bresearch (?:show(?:s|ed)?|suggests?|found)|\bstud(?:y|ies) (?:show(?:s|ed)?|found|suggests?|confirms?|confirmed)|\b(?:Pew Research|Psychology Today survey|Gottman Institute|Oxford Internet Institute|Mental Health Foundation|DataReportal)\b)/i.test(
      html
    ) && !/href=["']https?:\/\//i.test(html)
  );
});
if (highRiskWithoutSources.length) {
  failures.push(
    `${highRiskWithoutSources.length} archive articles still contain research-style language or percentages without an off-site source:\n  ${highRiskWithoutSources
      .map((post) => post.slug)
      .join("\n  ")}`
  );
}

console.log(`Posts: ${POSTS.length}`);
console.log(`Article bodies: ${contentSlugs.length}`);
console.log(`Generated article assets: ${slugs.length}`);
console.log(`Categories: ${Array.from(actualCategories).join(", ")}`);

if (failures.length) {
  console.error(`\nBlog audit failed (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("✅  blog audit passed");
