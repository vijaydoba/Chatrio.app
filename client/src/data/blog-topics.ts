import { Post } from "./posts";

const CATEGORY_TOPICS: Record<Post["category"], string[]> = {
  Love: ["Love", "Emotional Connection"],
  Romance: ["Romance", "Relationship Advice"],
  Dating: ["Dating", "Online Dating"],
  Relationships: ["Relationships", "Communication"],
  "Chat & Connection": ["Online Chat", "Conversation"],
  "Mental Health": ["Mental Wellbeing", "Human Connection"],
};

const TOPIC_RULES: Array<{ label: string; pattern: RegExp }> = [
  { label: "Love Bombing", pattern: /\blove bomb/i },
  { label: "Emotional Intimacy", pattern: /\bemotional intimacy/i },
  { label: "Social Anxiety", pattern: /\bsocial anxiety/i },
  { label: "Social Battery", pattern: /\bsocial battery/i },
  { label: "Online Safety", pattern: /\b(?:safe|safety|scam|fake profile|privacy)\b/i },
  { label: "Conversation Starters", pattern: /\b(?:opening line|first message|conversation starter)\b/i },
  { label: "Anonymous Chat", pattern: /\banonymous chat/i },
  { label: "Online Friendship", pattern: /\b(?:online friend|make friends online)\b/i },
  { label: "Online Dating", pattern: /\b(?:online dating|dating app)\b/i },
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

export function getPostKeywords(post: Post): string[] {
  const searchable = `${post.title} ${post.excerpt}`;
  const keywords = TOPIC_RULES.filter(({ pattern }) => pattern.test(searchable)).map(
    ({ label }) => label
  );

  for (const topic of CATEGORY_TOPICS[post.category]) {
    if (!keywords.includes(topic)) keywords.push(topic);
  }

  return keywords.slice(0, 5);
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
