import React from "react";
import { NavLink } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getQualifyingTags } from "../data/blog-topics";

// Full index of every qualifying tag hub. Pulls ONLY from getQualifyingTags()
// (>= TAG_MIN_POSTS, <= TAG_MAX_COVERAGE) — the same gate every /blog/tag/:slug
// page enforces — so this can never surface a thin, single-post tag.
export default function BlogTags() {
  const tags = getQualifyingTags();
  const canonicalUrl = "https://chatrio.app/blog/tags";
  const desc = `Browse all ${tags.length} topics on the Chatrio blog — anonymous chat, video chat, dating, and online connection, organized by subject.`;

  return (
    <div className="blog-page">
      <Helmet>
        <title>Browse Topics – Chatrio Blog</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Browse Topics – Chatrio Blog" />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content="https://chatrio.app/branding/chatrio-icon-512-2026.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Browse Topics – Chatrio Blog" />
        <meta name="twitter:description" content={desc} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "url": canonicalUrl,
          "name": "Browse Topics – Chatrio Blog",
          "description": desc,
          "isPartOf": { "@type": "Blog", "name": "Chatrio Blog", "url": "https://chatrio.app/blog" },
          "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": tags.length,
            "itemListElement": tags.map((t, i) => ({
              "@type": "ListItem",
              "position": i + 1,
              "url": `https://chatrio.app/blog/tag/${t.slug}`,
              "name": t.label,
            })),
          },
        })}</script>
      </Helmet>

      <section className="blog-hero">
        <nav className="blog-crumbs" aria-label="Breadcrumb">
          <NavLink to="/blog">Blog</NavLink>
          <span aria-hidden="true"> / </span>
          <span>Topics</span>
        </nav>
        <h1 className="blog-title">Browse Topics</h1>
        <p className="blog-sub">
          {tags.length} topics across the Chatrio blog — anonymous chat, video chat,
          dating, and online connection.
        </p>
      </section>

      <section className="blog-layout">
        <div className="blog-main">
          <nav className="blog-tagcloud" aria-label="All topics">
            <div className="blog-tagcloud-list">
              {tags.map((t) => (
                <NavLink key={t.slug} to={`/blog/tag/${t.slug}`} className="blog-tagcloud-chip">
                  {t.label} <span className="blog-tagcloud-count">{t.count}</span>
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </section>
    </div>
  );
}
