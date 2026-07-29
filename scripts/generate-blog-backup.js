/**
 * Refreshes the reference-only blog backup appended to BLOG_SEO_GUIDE.md.
 *
 * The live application never reads this file; posts.ts and posts-content.ts
 * remain the source of truth.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const clientRoot = path.join(root, "client");
const guidePath = path.join(root, "BLOG_SEO_GUIDE.md");
const typescriptPath = require.resolve("typescript", { paths: [clientRoot] });
const ts = require(typescriptPath);
const marker = "\n## Full Blog Content Backup\n";

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

const { POSTS } = loadTsModule("client/src/data/posts.ts");
const { POST_CONTENT } = loadTsModule("client/src/data/posts-content.ts");
const guide = fs.readFileSync(guidePath, "utf8");
const guideOnly = guide.includes(marker) ? guide.slice(0, guide.indexOf(marker)) : guide.trimEnd();

const backup = POSTS.map((post) => {
  const html = POST_CONTENT[post.slug];
  if (typeof html !== "string") {
    throw new Error(`Missing article body for ${post.slug}`);
  }

  return [
    `### ${post.title}`,
    "",
    `- **Slug:** \`${post.slug}\``,
    `- **URL:** https://chatrio.app/blog/${post.slug}`,
    `- **Date:** ${post.date}`,
    `- **Category:** ${post.category}`,
    `- **Excerpt:** ${post.excerpt}`,
    "",
    "```html",
    html.trim(),
    "```",
    "",
    "---",
    "",
  ].join("\n");
}).join("\n");

const output = [
  guideOnly.trimEnd(),
  "",
  "",
  "## Full Blog Content Backup",
  "",
  `_Auto-generated backup of all ${POSTS.length} blog posts from \`client/src/data/posts.ts\` + \`client/src/data/posts-content.ts\`. This is a static snapshot for reference only — the live site always reads from those two source files, not from here._`,
  "",
  "---",
  "",
  backup.trimEnd(),
  "",
].join("\n");

fs.writeFileSync(guidePath, output, "utf8");
console.log(`✅  BLOG_SEO_GUIDE.md backup refreshed — ${POSTS.length} posts`);
