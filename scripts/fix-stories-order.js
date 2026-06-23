const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../client/src/data/stories.ts");
let src = fs.readFileSync(filePath, "utf8");

const imgs = [
  "/images/image6.png","/images/image7.png","/images/image8.png","/images/image9.png",
  "/images/image10.png","/images/image11.png","/images/image12.png","/images/image13.png",
  "/images/image14.png","/images/image15.png","/images/image16.png","/images/image17.png",
  "/images/image18.png",
];
const chars = ["couple","girl","boy","couple","girl"];

// Split into: header (type defs + export start + old stories) and new stories block
const newStart = src.indexOf('  {\n    id: "how-to-say-goodbye-in-chat"');
const exportStart = src.indexOf("export const STORIES: Story[] = [");

const typeBlock = src.slice(0, exportStart); // type definitions
const oldStories = src.slice(exportStart + "export const STORIES: Story[] = [".length, newStart).trimStart();
// oldStories ends with a comma+newline before the new stories
const newStoriesRaw = src.slice(newStart, src.lastIndexOf("];")).trimEnd();

// Parse new stories: split on top-level story objects
// Each story starts with '  {\n    id: "'
const storyChunks = [];
let cursor = 0;
while (true) {
  const next = newStoriesRaw.indexOf('  {\n    id: "', cursor + 1);
  if (next === -1) {
    storyChunks.push(newStoriesRaw.slice(cursor).trim());
    break;
  }
  storyChunks.push(newStoriesRaw.slice(cursor, next).trim().replace(/,\s*$/, ""));
  cursor = next;
}

// For each story chunk, add bgImage + character to each slide
function injectImages(chunk, storyIndex) {
  let slideIdx = 0;
  // Find each slide object: starts with `{` after `slides: [`
  // Strategy: inject bgImage after each `animation:` line, and character after emoji:
  const lines = chunk.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    // detect end of a slide's fields — just before closing }
    // simpler: inject after animation: line
    if (/animation:/.test(lines[i]) && !/bgImage/.test(chunk.slice(0, chunk.indexOf(lines[i])))) {
      const img = imgs[(storyIndex * 3 + slideIdx) % imgs.length];
      const char = chars[slideIdx % chars.length];
      // Check if bgImage already present nearby
      const context = lines.slice(Math.max(0,i-4), i+3).join("\n");
      if (!context.includes("bgImage")) {
        out.push(`        bgImage: "${img}",`);
        out.push(`        character: "${char}",`);
        slideIdx++;
      }
    }
  }
  return out.join("\n");
}

const newStoriesWithImages = storyChunks
  .map((chunk, i) => injectImages(chunk, i))
  .join(",\n  ");

// Reconstruct: new stories first, then old stories
const result =
  typeBlock +
  "export const STORIES: Story[] = [\n  " +
  newStoriesWithImages +
  ",\n  " +
  oldStories.trimStart() +
  "\n];\n";

fs.writeFileSync(filePath, result);
console.log("Done. Stories reordered with images injected.");
