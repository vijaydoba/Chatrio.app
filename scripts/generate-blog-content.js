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

const typescriptPath = require.resolve("typescript", {
  paths: [path.join(projectRoot, "client")],
});
const ts = require(typescriptPath);

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

for (const slug of slugs) {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`Unsafe blog slug: ${slug}`);
  }
  fs.writeFileSync(path.join(outputDir, `${slug}.html`), content[slug], "utf8");
}

console.log(`✅  blog content exported — ${slugs.length} article HTML files`);
