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
  const desc = `${tag.count} articles about ${tag.label.toLowerCase()} on the Chatrio blog — tips, guides, and stories about anonymous chat and online connection.`;
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
        <p className="blog-sub">
          {tag.count} articles about {tag.label.toLowerCase()} — anonymous chat, online
          connection, and talking to strangers safely.
        </p>
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
              </div>
            </nav>
          )}
        </div>
      </section>
    </div>
  );
}
