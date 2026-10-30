import React from "react";
import { NavLink } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Post, getSlotImage } from "../data/posts";
import {
  getPostKeywords,
  findQualifyingTag,
  getPostsForTagSlug,
  getQualifyingTags,
} from "../data/blog-topics";

function normalizeAssetPath(path?: string) {
  if (!path) return "/images/default-thumb.png";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return path;
  return `/${path}`;
}

function primaryPostKeyword(post: Post) {
  return getPostKeywords(post)[0] || post.category;
}

// Hand-written, topic-specific intros so each hub carries genuine unique prose
// (not a templated blurb) — fixes the "thin content" flag and strengthens the
// hub's topical relevance. Keyed by tag slug; hubs without an entry fall back to
// the generic count line. Keep each one distinct and substantive.
const TAG_INTROS: Record<string, string> = {
  "omegle-alternatives":
    "Omegle shut down in 2023, and the wave of copycats that followed varies wildly in safety and quality. These guides break down which Omegle-style random chat sites are actually worth using today, what to watch out for, and how anonymous chat has changed since the original closed.",
  psychology:
    "Why do we often open up faster to strangers than to the people we know? This collection digs into the psychology behind anonymous conversation — the comfort of the “stranger on a train” effect, the dopamine loops of random chat, and what talking to strangers reveals about how we connect.",
  attraction:
    "Attraction online works differently than it does across a room, where tone, timing, and text do the heavy lifting instead of eye contact. These articles explore how chemistry forms over chat, what makes a first message land, and the signals that build — or quietly break — a connection before you ever meet.",
  romance:
    "Modern romance increasingly begins in a chat window rather than across a room. These pieces cover building real intimacy online, navigating text-first and long-distance relationships, and telling genuine connection apart from performance.",
  "chat-rooms":
    "Chat rooms never really died — they evolved into topic channels, interest groups, and anonymous lobbies. This collection covers the best chat rooms today, how to find communities that are actually active, and how to stay safe in group conversations with strangers.",
  introverts:
    "For introverts and shy people, text-first chat often feels safer than a phone call or a crowded room. These guides look at why anonymous conversation suits quieter personalities, how to rebuild social confidence at your own pace, and how to make friends online without the small-talk pressure.",
  loneliness:
    "Loneliness isn’t really about being alone — it’s about feeling unseen. These articles examine how random and anonymous chat can be a genuine first step out of isolation: when it helps, when it doesn’t, and how to turn a passing conversation into something that actually eases the feeling.",
  "relationship-advice":
    "Honest, practical advice for the messy middle of modern dating and relationships. From reading mixed signals and naming toxic patterns to knowing when to have “the talk,” these guides focus on what to actually do — not just what to feel.",
};

// Indexable topic hub for a tag with enough posts. Thin tags never reach here —
// BlogRoute only renders TagPage for slugs in getQualifyingTags() (>= threshold,
// <= coverage cap), so this page is never a one-post shell.
export default function TagPage({ slug }: { slug: string }) {
  const tag = findQualifyingTag(slug);
  const posts = getPostsForTagSlug(slug);

  // Defensive: if a slug slips through without qualifying, don't render a thin
  // page — send crawlers a noindex and a link back to the blog index.
  if (!tag) {
    return (
      <div className="blog-page">
        <Helmet>
          <meta name="robots" content="noindex, follow" />
          <title>Topic not found | Chatrio Blog</title>
        </Helmet>
        <section className="blog-hero">
          <h1 className="blog-title">Topic not found</h1>
          <p className="blog-sub">
            That topic doesn’t have a page yet. <NavLink to="/blog">Browse all articles →</NavLink>
          </p>
        </section>
      </div>
    );
  }

  const canonicalUrl = `https://chatrio.app/blog/tag/${tag.slug}`;
  const intro = TAG_INTROS[tag.slug];
  const desc =
    intro ||
    `${tag.count} articles about ${tag.label.toLowerCase()} on the Chatrio blog — tips, guides, and stories about anonymous chat and online connection.`;
  const featured = posts[0];
  const rest = posts.slice(1);

  // A small set of sibling hubs for internal linking / crawl depth.
  const otherTags = getQualifyingTags()
    .filter((t) => t.slug !== tag.slug)
    .slice(0, 12);

  return (
    <div className="blog-page">
      <Helmet>
        <title>{`${tag.label} – ${tag.count} Articles`} | Chatrio Blog</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${tag.label} – Chatrio Blog`} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content="https://chatrio.app/branding/chatrio-icon-512-2026.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${tag.label} – Chatrio Blog`} />
        <meta name="twitter:description" content={desc} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "url": canonicalUrl,
          "name": `${tag.label} – Chatrio Blog`,
          "description": desc,
          "isPartOf": { "@type": "Blog", "name": "Chatrio Blog", "url": "https://chatrio.app/blog" },
          "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": posts.length,
            "itemListElement": posts.slice(0, 25).map((p, i) => ({
              "@type": "ListItem",
              "position": i + 1,
              "url": `https://chatrio.app/blog/${p.slug}`,
              "name": p.title,
            })),
          },
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://chatrio.app/" },
            { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://chatrio.app/blog" },
            { "@type": "ListItem", "position": 3, "name": "Topics", "item": "https://chatrio.app/blog/tags" },
            { "@type": "ListItem", "position": 4, "name": tag.label, "item": canonicalUrl },
          ],
        })}</script>
        {featured && (
          <link rel="preload" as="image" href={normalizeAssetPath(getSlotImage(featured.thumbnail, "featured"))} />
        )}
      </Helmet>

      <section className="blog-hero">
        <nav className="blog-crumbs" aria-label="Breadcrumb">
          <NavLink to="/blog">Blog</NavLink>
          <span aria-hidden="true"> / </span>
          <span>{tag.label}</span>
        </nav>
        <h1 className="blog-title">{tag.label}</h1>
        {intro ? (
          <>
            <p className="blog-tag-intro">{intro}</p>
            <p className="blog-sub">
              {tag.count} {tag.count === 1 ? "article" : "articles"} on {tag.label.toLowerCase()} below.
            </p>
          </>
        ) : (
          <p className="blog-sub">
            {tag.count} articles about {tag.label.toLowerCase()} — anonymous chat, online
            connection, and talking to strangers safely.
          </p>
        )}
      </section>

      <section className="blog-layout">
        <div className="blog-main">
          {featured && (
            <article className="blog-featured">
              <div className="blog-featured-media">
                <NavLink
                  to={`/blog/${featured.slug}`}
                  className="blog-thumbnail-link blog-thumbnail-link--featured"
                  aria-label={`Read ${featured.title}`}
                >
                  <img
                    src={normalizeAssetPath(getSlotImage(featured.thumbnail, "featured"))}
                    alt={featured.title}
                    className="blog-featured-img"
                    width={1200}
                    height={630}
                  />
                </NavLink>
              </div>
              <div className="blog-featured-body">
                <div className="blog-meta">{`${featured.date} • ${featured.category}`}</div>
                <h2 className="blog-featured-title">
                  <NavLink to={`/blog/${featured.slug}`} className="blog-link">
                    {featured.title}
                  </NavLink>
                </h2>
                <p className="blog-featured-excerpt">{featured.excerpt}</p>
                <NavLink to={`/blog/${featured.slug}`} className="blog-cta">
                  Read More <span aria-hidden="true">→</span>
                </NavLink>
              </div>
            </article>
          )}

          {rest.length > 0 && (
            <>
              <h2 className="blog-section-title">More on {tag.label}</h2>
              <div className="blog-list">
                {rest.map((p) => (
                  <article className="blog-card-row" key={p.slug}>
                    <NavLink
                      to={`/blog/${p.slug}`}
                      className="blog-card-media"
                      aria-label={`Read ${p.title}`}
                    >
                      <picture>
                        <source
                          media="(max-width: 600px)"
                          srcSet={normalizeAssetPath(getSlotImage(p.thumbnail, "featured"))}
                        />
                        <img
                          className="blog-thumb"
                          src={normalizeAssetPath(getSlotImage(p.thumbnail, "card"))}
                          alt={p.title}
                          loading="lazy"
                          width={280}
                          height={190}
                        />
                      </picture>
                      <span className="blog-thumbnail-overlay blog-thumbnail-overlay--card" aria-hidden="true">
                        <span className="blog-thumbnail-keyword">{primaryPostKeyword(p)}</span>
                        <span className="blog-thumbnail-title">{p.title}</span>
                      </span>
                    </NavLink>
                    <div className="blog-card-body">
                      <div className="blog-meta">{`${p.date} • ${p.category}`}</div>
                      <h3 className="blog-card-title">
                        <NavLink to={`/blog/${p.slug}`} className="blog-link">
                          {p.title}
                        </NavLink>
                      </h3>
                      <p className="blog-card-excerpt">{p.excerpt}</p>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {otherTags.length > 0 && (
            <nav className="blog-tagcloud" aria-label="Browse other topics">
              <h2 className="blog-section-title">Browse other topics</h2>
              <div className="blog-tagcloud-list">
                {otherTags.map((t) => (
                  <NavLink key={t.slug} to={`/blog/tag/${t.slug}`} className="blog-tagcloud-chip">
                    {t.label} <span className="blog-tagcloud-count">{t.count}</span>
                  </NavLink>
                ))}
                <NavLink to="/blog/tags" className="blog-tagcloud-chip">
                  View all topics →
                </NavLink>
              </div>
            </nav>
          )}
        </div>
      </section>
    </div>
  );
}
