import React, { useMemo, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { POSTS, Post, getSlotImage } from "../data/posts";

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

export default function BlogList() {
  // Route param is named "slug" because /blog/:slug is shared with post pages
  // (see BlogRoute in App.tsx); for this component it always holds a category.
  const { slug: category } = useParams<{ slug?: string }>();
  const activeCategory = normalizeCategorySlug(category);

  const [q, setQ] = useState("");
  const query = q.toLowerCase().trim();

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
        const hay = `${p.title} ${p.excerpt} ${p.category}`.toLowerCase();
        return hay.includes(query);
      });
  }, [activeCategory, query]);

  const featured = filtered[0];
  const rest = featured ? filtered.slice(1) : filtered;

  const categories = useMemo(() => {
    const all = Array.from(
      new Set(POSTS.map((p) => p.category))
    ) as Post["category"][];

    const preferred: Post["category"][] = [
      "Love",
      "Romance",
      "Chat & Connection",
      "Dating",
    ];

    return preferred.filter((c) => all.includes(c));
  }, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    POSTS.forEach((p) => {
      m.set(p.category, (m.get(p.category) ?? 0) + 1);
    });
    return m;
  }, []);

  const popularPosts = useMemo(() => {
    return POSTS.slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 3);
  }, []);

  const BLOG_ALL = "/blog";
  const BLOG_LOVE = "/blog/love";
  const BLOG_ROMANCE = "/blog/romance";
  const BLOG_DATING = "/blog/dating";
  const BLOG_CHAT = "/blog/chat%20%26%20connection";

  const blogDesc = activeCategory === "all"
    ? "Read articles about love, romance, dating, and online connections on the Chatrio blog."
    : `Explore ${pageTitle} articles — tips, stories, and insights about ${pageTitle.toLowerCase()} and online connections.`;

  return (
    <div className="blog-page">
      <Helmet>
        <title>{activeCategory === "all" ? "Blog – Love, Dating & Chat Tips" : `${pageTitle} Blog`} | Chatrio</title>
        <meta name="description" content={blogDesc} />
        <link rel="canonical" href={activeCategory === "all" ? "https://chatrio.app/blog" : `https://chatrio.app/blog/${activeCategory}`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${activeCategory === "all" ? "Chatrio Blog" : pageTitle} – Love, Dating & Chat`} />
        <meta property="og:description" content={blogDesc} />
        <meta property="og:url" content={activeCategory === "all" ? "https://chatrio.app/blog" : `https://chatrio.app/blog/${activeCategory}`} />
        <meta property="og:image" content="https://chatrio.app/branding/chatrio-512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`Chatrio Blog – ${pageTitle}`} />
        <meta name="twitter:description" content={blogDesc} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          "url": "https://chatrio.app/blog",
          "name": "Chatrio Blog",
          "description": "Articles about love, dating, romance, and online connections.",
          "publisher": { "@type": "Organization", "name": "Chatrio", "url": "https://chatrio.app", "logo": { "@type": "ImageObject", "url": "https://chatrio.app/branding/chatrio-512.png", "width": 512, "height": 512 } }
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
            className="blog-search"
          />
        </div>

        <div className="blog-pills">
          <NavLink to={BLOG_ALL} className="blog-pill">
            All
          </NavLink>
          <NavLink to={BLOG_LOVE} className="blog-pill">
            Love
          </NavLink>
          <NavLink to={BLOG_ROMANCE} className="blog-pill">
            Romance
          </NavLink>
          <NavLink to={BLOG_CHAT} className="blog-pill">
            Chat
          </NavLink>
          <NavLink to={BLOG_DATING} className="blog-pill">
            Dating
          </NavLink>
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
                    <img
                      src={normalizeAssetPath(getSlotImage(featured.thumbnail, "featured"))}
                      alt={featured.title}
                      fetchPriority="high"
                      loading="eager"
                      width={1200}
                      height={630}
                      className="blog-featured-img"
                    />
                  </div>

                  <div className="blog-featured-body">
                    <div className="blog-meta">
                      {featured.date} • {featured.category}
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
                {rest.map((p) => (
                  <article className="blog-card-row" key={p.slug}>
                    <picture style={{ display: "block" }}>
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
                      />
                    </picture>

                    <div className="blog-card-body">
                      <div className="blog-meta">
                        {p.date} • {p.category}
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
            </>
          )}
        </div>

        <aside className="blog-side">
          <div className="blog-side-card">
            <div className="blog-side-title">Popular Posts</div>

            <div className="blog-side-list">
              {popularPosts.map((p) => (
                <NavLink
                  key={p.slug}
                  to={`/blog/${p.slug}`}
                  className="blog-side-item"
                >
                  <img
                    src={normalizeAssetPath(getSlotImage(p.thumbnail, "thumb"))}
                    alt={p.title}
                    loading="lazy"
                    className="blog-side-thumb"
                  />
                  <div className="blog-side-text">
                    <div className="blog-side-item-title">{p.title}</div>
                    <div className="blog-side-item-meta">
                      {p.date} • {p.category}
                    </div>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>

          <div className="blog-side-card">
            <div className="blog-side-title">Categories</div>

            <div className="blog-side-pills">
              <NavLink to={BLOG_ALL} className="blog-side-pill">
                All <span className="blog-count">{POSTS.length}</span>
              </NavLink>

              {categories.map((c) => {
                const slug =
                  c.toLowerCase() === "chat & connection"
                    ? BLOG_CHAT
                    : `/blog/${c.toLowerCase()}`;
                return (
                  <NavLink key={c} to={slug} className="blog-side-pill">
                    {c.replace("Chat & Connection", "Chat")}
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
