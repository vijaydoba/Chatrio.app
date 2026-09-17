import { Post, POSTS } from "./posts";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rules = require("./blog-topics.rules");

// The app and the Node sitemap/prerender generator share ONE source of truth
// (blog-topics.rules.js) so prerendered tag pages never disagree with the
// sitemap. These thin wrappers add TypeScript types over the JS exports.
export type TagInfo = { label: string; slug: string; count: number };

export const TAG_MIN_POSTS: number = rules.TAG_MIN_POSTS;
export const getPostKeywords = (post: Post): string[] => rules.getPostKeywords(post);
export const tagSlug = (label: string): string => rules.tagSlug(label);

export function getQualifyingTags(posts: Post[] = POSTS): TagInfo[] {
  return rules.getQualifyingTags(posts);
}

export function getPostsForTagSlug(slug: string, posts: Post[] = POSTS): Post[] {
  return rules.getPostsForTagSlug(slug, posts);
}

export function findQualifyingTag(slug: string, posts: Post[] = POSTS): TagInfo | undefined {
  return getQualifyingTags(posts).find((tag) => tag.slug === slug);
}

// The tag chips to show under an article: the post's own keywords, each marked
// with whether it links to an indexable hub (qualifying) or is a plain label.
export function getPostTagChips(
  post: Post,
  posts: Post[] = POSTS
): Array<{ label: string; slug: string; hub: boolean }> {
  const qualifying = new Set(getQualifyingTags(posts).map((t) => t.slug));
  const seen = new Set<string>();
  const chips: Array<{ label: string; slug: string; hub: boolean }> = [];
  for (const label of getPostKeywords(post)) {
    const slug = tagSlug(label);
    if (seen.has(slug)) continue;
    seen.add(slug);
    chips.push({ label, slug, hub: qualifying.has(slug) });
  }
  return chips;
}

const TITLE_STOP_WORDS = new Set([
  "about", "after", "along", "being", "better", "complete", "explained",
  "first", "free", "guide", "handle", "heres", "honest", "know", "meaning",
  "online", "people", "signs", "someone", "stranger", "strangers", "talking",
  "things", "through", "tips", "what", "when", "where", "which", "without",
  "your", "youre",
]);

function titleTerms(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[’']/g, "")
      .split(/[^a-z0-9]+/)
      .filter(
        (word) =>
          word.length >= 4 &&
          !TITLE_STOP_WORDS.has(word) &&
          !/^\d{4}$/.test(word)
      )
  );
}

export function relatedPostScore(source: Post, candidate: Post): number {
  const sourceTopics = new Set(getPostKeywords(source));
  const candidateTopics = getPostKeywords(candidate);
  const sourceTerms = titleTerms(source.title);
  const candidateTerms = titleTerms(candidate.title);
  const sharedTopics = candidateTopics.filter((topic) => sourceTopics.has(topic)).length;
  const sharedTerms = Array.from(candidateTerms).filter((term) => sourceTerms.has(term)).length;

  return (
    sharedTopics * 8 +
    sharedTerms * 3 +
    (source.category === candidate.category ? 4 : 0)
  );
}
