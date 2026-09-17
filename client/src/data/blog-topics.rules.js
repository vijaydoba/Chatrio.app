/**
 * Shared blog tag/keyword rules — SINGLE SOURCE OF TRUTH.
 *
 * Consumed by BOTH:
 *   - the TypeScript app (src/data/blog-topics.ts re-exports these), and
 *   - the Node sitemap/prerender generator (scripts/generate-sitemap.js).
 * Keeping the rules here (plain CommonJS) prevents the two from drifting, which
 * would otherwise make prerendered tag pages disagree with the sitemap.
 *
 * The vocabulary is curated from our own commercial content clusters plus the
 * relevant commercial tags seen on competitor blogs (anonymous chat, omegle
 * alternatives, random/video chat, talk to strangers, safety, by-country, etc.).
 * Brand-specific and thin/off-brand competitor tags are intentionally excluded.
 *
 * Tag PAGES are only made indexable when a tag has TAG_MIN_POSTS+ real posts —
 * see getQualifyingTags() in blog-topics.ts. This is a deliberate guard against
 * the thin/scaled-content pattern (one near-duplicate page per single-post tag).
 */

// Two default topics per category, appended so every post has at least a couple
// of tags even when no specific rule fires.
const CATEGORY_TOPICS = {
  Love: ["Love", "Emotional Connection"],
  Romance: ["Romance", "Relationship Advice"],
  Dating: ["Dating", "Online Dating"],
  Relationships: ["Relationships", "Communication"],
  "Chat & Connection": ["Online Chat", "Conversation"],
  "Mental Health": ["Mental Wellbeing", "Human Connection"],
};

// Order matters: the first match becomes a post's "primary" keyword, and only
// the first few are shown as chips. Put the specific, commercial, high-intent
// clusters first, then the softer psychographic topics.
const TOPIC_RULES = [
  // ── Commercial / high-intent clusters (captured from our content + competitors) ──
  { label: "Omegle Alternatives", pattern: /\bomegle\b/i },
  { label: "Chatroulette Alternatives", pattern: /\bchatroulette\b/i },
  { label: "App Alternatives", pattern: /\b(?:alternative|alternatives|replacements?|sites like|apps like)\b/i },
  { label: "Random Video Chat", pattern: /\b(?:random video chat|video chat roulette|video call app)\b/i },
  { label: "Video Chat", pattern: /\bvideo (?:chat|call|calling|date|dating)\b/i },
  { label: "Voice Chat", pattern: /\bvoice chat\b/i },
  { label: "Random Chat", pattern: /\brandom chat\b/i },
  { label: "Talk to Strangers", pattern: /\b(?:talk to strangers|talk to a stranger|talk to random people|chat with strangers|chat with a stranger|chat with random)\b/i },
  { label: "Stranger Chat", pattern: /\bstranger chat|\bstrangers online\b/i },
  { label: "Anonymous Chat", pattern: /\banonymous(?: chat| social| text| video)?\b|\bchat anonymously\b/i },
  { label: "Chat by Country", pattern: /\b(?:india|indian|usa|united states|u\.s\.a?|america|uk|united kingdom|britain|canada|nigeria|brazil|bangladesh|latin america|mexico|indonesia|dubai|uae|philippines|pakistan|germany|deutsche|australia|singapore)\b/i },
  { label: "No Sign-Up Chat", pattern: /\b(?:no sign-?up|no registration|no login|without phone number|no download)\b/i },
  { label: "Chat Rooms", pattern: /\bchat rooms?\b/i },
  { label: "Free Chat Sites", pattern: /\b(?:free (?:chat|websites|sites)|best (?:chat )?sites|best websites)\b/i },
  { label: "Interest Matching", pattern: /\b(?:interest[- ]based|interest matching|matching)\b/i },
  { label: "Gender Filters", pattern: /\bgender filter/i },

  // ── Safety ──
  { label: "Online Safety", pattern: /\b(?:safe|safety|scam|fake profile|bots?|catfish|privacy)\b/i },

  // ── Community / local (Circles moat) ──
  { label: "Circles", pattern: /\bcircles\b/i },
  { label: "Nearby Chat", pattern: /\b(?:nearby chat|local chat|people nearby|near you|in your area|local group)\b/i },
  { label: "Community Apps", pattern: /\b(?:community app|neighborhood app|nextdoor|yik yak|meetup|group chat)\b/i },
  { label: "Make Friends Online", pattern: /\b(?:make friends|making friends|online friend|friendships?|meet people|meet new people)\b/i },

  // ── Conversation help ──
  { label: "Conversation Starters", pattern: /\b(?:opening line|first message|conversation starter|conversation game|questions to ask|what to talk about|topics to talk|how to start a conversation)\b/i },

  // ── Dating ──
  { label: "Online Dating", pattern: /\b(?:online dating|dating app|anonymous dating|virtual dating|blind date)\b/i },

  // ── Softer psychographic topics ──
  { label: "Love Bombing", pattern: /\blove bomb/i },
  { label: "Emotional Intimacy", pattern: /\bemotional intimacy/i },
  { label: "Social Anxiety", pattern: /\bsocial anxiety\b/i },
  { label: "Introverts", pattern: /\b(?:introvert|shy|social battery)\b/i },
  { label: "Attachment", pattern: /\battachment\b/i },
  { label: "Breadcrumbing", pattern: /\bbreadcrumb/i },
  { label: "Ghosting", pattern: /\bghost(?:ing|ed)?\b/i },
  { label: "Situationships", pattern: /\bsituationship/i },
  { label: "Limerence", pattern: /\blimerence\b/i },
  { label: "Parasocial Bonds", pattern: /\bparasocial\b/i },
  { label: "Loneliness", pattern: /\blonel(?:y|iness)\b/i },
  { label: "Attraction", pattern: /\b(?:attraction|chemistry|flirt)\b/i },
  { label: "Relationships", pattern: /\brelationship/i },
  { label: "Online Chat", pattern: /\b(?:online chat|chatting online|text chat)\b/i },
  { label: "Conversation", pattern: /\bconversation/i },
  { label: "Romance", pattern: /\b(?:romance|romantic)\b/i },
  { label: "Love", pattern: /\blove\b/i },
];

// A tag needs at least this many posts to get its own indexable hub page.
const TAG_MIN_POSTS = 3;

// ...and must cover at most this fraction of ALL posts. Tags broader than this
// (e.g. the near-universal "Online Chat"/"Conversation" defaults) would just
// duplicate the main /blog index, so they stay as plain chips with no hub page.
const TAG_MAX_COVERAGE = 0.5;

// Returns every tag/keyword a post matches (uncapped). Callers that render chips
// cap the list themselves.
function getPostKeywords(post) {
  const searchable = `${post.title} ${post.excerpt}`;
  const keywords = TOPIC_RULES.filter(({ pattern }) => pattern.test(searchable)).map(
    ({ label }) => label
  );

  const categoryTopics = CATEGORY_TOPICS[post.category] || [];
  for (const topic of categoryTopics) {
    if (!keywords.includes(topic)) keywords.push(topic);
  }

  return keywords;
}

// URL-safe slug for a tag label, e.g. "Anonymous Chat" -> "anonymous-chat".
function tagSlug(label) {
  return label
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// label -> array of posts carrying that tag.
function buildTagIndex(posts) {
  const map = new Map();
  for (const post of posts) {
    for (const label of getPostKeywords(post)) {
      const arr = map.get(label);
      if (arr) arr.push(post);
      else map.set(label, [post]);
    }
  }
  return map;
}

// Tags that qualify for an indexable hub page: at least TAG_MIN_POSTS posts and
// at most TAG_MAX_COVERAGE of all posts. Returned most-populated first.
// Shape: { label, slug, count }. Used by BOTH the app and the sitemap generator.
function getQualifyingTags(posts) {
  const total = posts.length || 1;
  const out = [];
  for (const [label, tagged] of buildTagIndex(posts)) {
    const count = tagged.length;
    if (count >= TAG_MIN_POSTS && count / total <= TAG_MAX_COVERAGE) {
      out.push({ label, slug: tagSlug(label), count });
    }
  }
  return out.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

// Posts carrying a given tag slug (regardless of threshold), newest first.
function getPostsForTagSlug(slug, posts) {
  for (const [label, tagged] of buildTagIndex(posts)) {
    if (tagSlug(label) === slug) {
      return tagged
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    }
  }
  return [];
}

module.exports = {
  CATEGORY_TOPICS,
  TOPIC_RULES,
  TAG_MIN_POSTS,
  TAG_MAX_COVERAGE,
  getPostKeywords,
  tagSlug,
  buildTagIndex,
  getQualifyingTags,
  getPostsForTagSlug,
};
