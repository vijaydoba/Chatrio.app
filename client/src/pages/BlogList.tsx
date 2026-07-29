import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { POSTS, Post, getSlotImage } from "../data/posts";
import { getPostKeywords } from "../data/blog-topics";

function titleCase(s: string) {
  return s
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function normalizeCategorySlug(cat?: string) {
  if (!cat) return "all";
  return String(cat).trim().toLowerCase();
}

function normalizeAssetPath(path?: string) {
  if (!path) return "/images/default-thumb.png";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return path;
  return `/${path}`;
}

const INITIAL_VISIBLE_POSTS = 20;
const LOAD_MORE_POSTS = 20;

function categoryPath(category: string) {
  return `/blog/${encodeURIComponent(category.toLowerCase())}`;
}

function primaryPostKeyword(post: Post) {
  return getPostKeywords(post)[0] || post.category;
}

export default function BlogList() {
  // Route param is named "slug" because /blog/:slug is shared with post pages
  // (see BlogRoute in App.tsx); for this component it always holds a category.
  const { slug: category } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const activeCategory = normalizeCategorySlug(category);

  const searchQueryParam = searchParams.get("search") || "";
  const [q, setQ] = useState(searchQueryParam);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_POSTS);
  const query = q.toLowerCase().trim();

  useEffect(() => {
    setQ(searchQueryParam);
  }, [searchQueryParam]);

  const pageTitle =
    activeCategory === "all"
      ? "Blog"
      : titleCase(activeCategory.replace(/\s*&\s*/g, " & "));

  const filtered = useMemo(() => {
    return POSTS.slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .filter((p) => {
        if (activeCategory === "all") return true;
        return p.category.toLowerCase() === activeCategory;
      })
      .filter((p) => {
        if (!query) return true;
        const hay = `${p.title} ${p.excerpt} ${p.category} ${getPostKeywords(p).join(" ")}`.toLowerCase();
        return hay.includes(query);
      });
  }, [activeCategory, query]);

  const featured = filtered[0];
  const rest = featured ? filtered.slice(1) : filtered;
  const visibleRest = rest.slice(
    0,
    Math.max(0, visibleCount - (featured ? 1 : 0))
  );
  const shownCount = Math.min(
    filtered.length,
    visibleRest.length + (featured ? 1 : 0)
  );
  const hasMore = shownCount < filtered.length;

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_POSTS);
  }, [activeCategory, query]);

  const categories = useMemo(() => {
    const all = Array.from(
      new Set(POSTS.map((p) => p.category))
    ) as Post["category"][];

    const preferred: Post["category"][] = [
      "Chat & Connection",
      "Relationships",
      "Mental Health",
      "Dating",
      "Love",
      "Romance",
    ];

    return [
      ...preferred.filter((c) => all.includes(c)),
      ...all.filter((c) => !preferred.includes(c)),
    ];
  }, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    POSTS.forEach((p) => {
      m.set(p.category, (m.get(p.category) ?? 0) + 1);
    });
    return m;
  }, []);

  const latestPosts = useMemo(() => {
    return POSTS.slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 3);
  }, []);

  const BLOG_ALL = "/blog";
  const canonicalUrl =
    activeCategory === "all"
      ? "https://chatrio.app/blog"
      : `https://chatrio.app${categoryPath(activeCategory)}`;

  const blogDesc = activeCategory === "all"
    ? "Read articles about love, romance, dating, and online connections on the Chatrio blog."
    : `Explore ${pageTitle} articles — tips, stories, and insights about ${pageTitle.toLowerCase()} and online connections.`;

  return (
    <div className="blog-page">
      <Helmet>
        <title>{activeCategory === "all" ? "Blog – Love, Dating & Chat Tips" : `${pageTitle} Blog`} | Chatrio</title>
        <meta name="description" content={blogDesc} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${activeCategory === "all" ? "Chatrio Blog" : pageTitle} – Love, Dating & Chat`} />
        <meta property="og:description" content={blogDesc} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content="https://chatrio.app/branding/chatrio-icon-512-2026.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`Chatrio Blog – ${pageTitle}`} />
        <meta name="twitter:description" content={blogDesc} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          "url": "https://chatrio.app/blog",
          "name": "Chatrio Blog",
          "description": "Articles about love, dating, romance, and online connections.",
          "publisher": { "@type": "Organization", "name": "Chatrio", "url": "https://chatrio.app", "logo": { "@type": "ImageObject", "url": "https://chatrio.app/branding/chatrio-icon-512-2026.png", "width": 512, "height": 512 } }
        })}</script>
        {featured && (
          <link rel="preload" as="image" href={normalizeAssetPath(getSlotImage(featured.thumbnail, "featured"))} />
        )}
      </Helmet>
      <section className="blog-hero">
        <h1 className="blog-title">{pageTitle}</h1>
        <p className="blog-sub">
          Real stories, modern love, and meaningful conversations.
        </p>

        <div className="blog-search-wrap">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search in ${pageTitle.toLowerCase()}...`}
            aria-label={`Search ${pageTitle.toLowerCase()} articles`}
            className="blog-search"
          />
        </div>

        <div className="blog-pills">
          <NavLink to={BLOG_ALL} end className="blog-pill">
            All
          </NavLink>
          {categories.map((c) => (
            <NavLink key={c} to={categoryPath(c)} className="blog-pill">
              {c.replace("Chat & Connection", "Chat")}
            </NavLink>
          ))}
        </div>
      </section>

      <section className="blog-layout">
        <div className="blog-main">
          {filtered.length === 0 ? (
            <div className="blog-empty">
              <div className="blog-empty-title">No posts found</div>
              <div className="blog-empty-sub">
                Try a different keyword or category.
              </div>
            </div>
          ) : (
            <>
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
                        fetchPriority="high"
                        loading="eager"
                        width={1200}
                        height={630}
                        className="blog-featured-img"
                      />
                      <span className="blog-thumbnail-overlay" aria-hidden="true">
                        <span className="blog-thumbnail-keyword">
                          {primaryPostKeyword(featured)}
                        </span>
                        <span className="blog-thumbnail-title">
                          {featured.title}
                        </span>
                      </span>
                    </NavLink>
                  </div>

                  <div className="blog-featured-body">
                    <div className="blog-meta">
                      {`${featured.date} • ${featured.category}`}
                    </div>

                    <h2 className="blog-featured-title">
                      <NavLink
                        to={`/blog/${featured.slug}`}
                        className="blog-link"
                      >
                        {featured.title}
                      </NavLink>
                    </h2>

                    <p className="blog-featured-excerpt">{featured.excerpt}</p>

                    <NavLink
                      to={`/blog/${featured.slug}`}
                      className="blog-cta"
                    >
                      Read More <span aria-hidden="true">→</span>
                    </NavLink>
                  </div>
                </article>
              )}

              <h3 className="blog-section-title">Recent Articles</h3>

              <div className="blog-list">
                {visibleRest.map((p) => (
                  <article className="blog-card-row" key={p.slug}>
                    <NavLink
                      to={`/blog/${p.slug}`}
                      className="blog-card-media"
                      aria-label={`Read ${p.title}`}
                    >
                      <picture>
                        {/* Mobile (≤600px): card stacks vertically at 16:9 full-width; hero is 1200×630 ≈ 16:9 */}
                        <source
                          media="(max-width: 600px)"
                          srcSet={normalizeAssetPath(getSlotImage(p.thumbnail, "featured"))}
                        />
                        {/* Desktop: fixed 140×95 slot; use the slot-exact card image */}
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
                        <span className="blog-thumbnail-keyword">
                          {primaryPostKeyword(p)}
                        </span>
                        <span className="blog-thumbnail-title">
                          {p.title}
                        </span>
                      </span>
                    </NavLink>

                    <div className="blog-card-body">
                      <div className="blog-meta">
                        {`${p.date} • ${p.category}`}
                      </div>

                      <h3 className="blog-card-title">
                        <NavLink
                          to={`/blog/${p.slug}`}
                          className="blog-link"
                        >
                          {p.title}
                        </NavLink>
                      </h3>

                      <p className="blog-card-excerpt">{p.excerpt}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="blog-results-status" aria-live="polite">
                {`Showing ${shownCount} of ${filtered.length} articles`}
              </div>

              {hasMore && (
                <button
                  type="button"
                  className="blog-load-more"
                  onClick={() => setVisibleCount((count) => count + LOAD_MORE_POSTS)}
                >
                  Load more articles
                </button>
              )}
            </>
          )}
        </div>

        <aside className="blog-side">
          <div className="blog-side-card">
            <div className="blog-side-title">Latest Posts</div>

            <div className="blog-side-list">
              {latestPosts.map((p) => (
                <NavLink
                  key={p.slug}
                  to={`/blog/${p.slug}`}
                  className="blog-side-item"
                >
                  <span className="blog-side-thumb-wrap">
                    <img
                      src={normalizeAssetPath(getSlotImage(p.thumbnail, "thumb"))}
                      alt={p.title}
                      loading="lazy"
                      width={104}
                      height={104}
                      className="blog-side-thumb"
                    />
                    <span className="blog-side-thumb-keyword" aria-hidden="true">
                      {primaryPostKeyword(p)}
                    </span>
                  </span>
                  <div className="blog-side-text">
                    <div className="blog-side-item-title">{p.title}</div>
                    <div className="blog-side-item-meta">
                      {`${p.date} • ${p.category}`}
                    </div>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>

          <div className="blog-side-card">
            <div className="blog-side-title">Categories</div>

            <div className="blog-side-pills">
              <NavLink to={BLOG_ALL} end className="blog-side-pill">
                All <span className="blog-count">{POSTS.length}</span>
              </NavLink>

              {categories.map((c) => {
                return (
                  <NavLink key={c} to={categoryPath(c)} className="blog-side-pill">
                    {c}
                    <span className="blog-count">{counts.get(c) ?? 0}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
