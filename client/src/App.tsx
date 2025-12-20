// src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Routes,
  Route,
  NavLink,
  useLocation,
  Navigate,
  useParams,
} from "react-router-dom";

import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import ChatComingSoon from "./pages/ChatComingSoon";
import Comments from "./pages/Comments";
import Chat from "./Chat";

import { POSTS, Post } from "./data/posts";

import "./App.css";

type Theme = "light" | "dark";

/* ---------------- Helpers ---------------- */
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

// Your posts.ts currently has thumbnails like "images/image2.png" (missing leading "/").
// This helper makes it work either way.
function normalizeAssetPath(path?: string) {
  if (!path) return "/images/default-thumb.png";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return path;
  return `/${path}`;
}

/* ---------------- Pages (inline) ---------------- */

function BlogList() {
  const { category } = useParams<{ category?: string }>();
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

    // Keep a stable order for UI pills
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
    // Simple “popular”: newest 3 across all posts
    return POSTS.slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 3);
  }, []);

  // Blog route slugs used in your header
  const BLOG_ALL = "/blog";
  const BLOG_LOVE = "/blog/love";
  const BLOG_ROMANCE = "/blog/romance";
  const BLOG_DATING = "/blog/dating";
  const BLOG_CHAT = "/blog/chat%20%26%20connection";

  return (
    <div className="blog-page">
      {/* Hero */}
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
        {/* Main */}
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
              {/* Featured */}
              {featured && (
                <article className="blog-featured">
                  <div className="blog-featured-media">
                    <img
                      src={normalizeAssetPath(featured.thumbnail)}
                      alt={featured.title}
                      className="blog-featured-img"
                    />
                  </div>

                  <div className="blog-featured-body">
                    <div className="blog-meta">
                      {featured.date} • {featured.category}
                    </div>

                    <h2 className="blog-featured-title">
                      <NavLink
                        to={`/blog/post/${featured.slug}`}
                        className="blog-link"
                      >
                        {featured.title}
                      </NavLink>
                    </h2>

                    <p className="blog-featured-excerpt">{featured.excerpt}</p>

                    <NavLink
                      to={`/blog/post/${featured.slug}`}
                      className="blog-cta"
                    >
                      Read More <span aria-hidden="true">→</span>
                    </NavLink>
                  </div>
                </article>
              )}

              {/* Recent */}
              <h3 className="blog-section-title">Recent Articles</h3>

              <div className="blog-list">
                {rest.map((p) => (
                  <article className="blog-card-row" key={p.slug}>
                    <img
                      className="blog-thumb"
                      src={normalizeAssetPath(p.thumbnail)}
                      alt={p.title}
                    />

                    <div className="blog-card-body">
                      <div className="blog-meta">
                        {p.date} • {p.category}
                      </div>

                      <h3 className="blog-card-title">
                        <NavLink
                          to={`/blog/post/${p.slug}`}
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

        {/* Sidebar */}
        <aside className="blog-side">
          <div className="blog-side-card">
            <div className="blog-side-title">Popular Posts</div>

            <div className="blog-side-list">
              {popularPosts.map((p) => (
                <NavLink
                  key={p.slug}
                  to={`/blog/post/${p.slug}`}
                  className="blog-side-item"
                >
                  <img
                    src={normalizeAssetPath(p.thumbnail)}
                    alt={p.title}
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

function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post: Post | undefined = POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 12 }}>
        <p>Post not found.</p>
        <NavLink to="/blog">← Back to Blog</NavLink>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 12 }}>
      <NavLink to="/blog">← Back to Blog</NavLink>

      <h1 style={{ marginTop: 12 }}>{post.title}</h1>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 16 }}>
        {post.date} • {post.category}
      </div>

      <div
        style={{ lineHeight: 1.8, opacity: 0.95 }}
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      {/* Comments Section */}
      <Comments slug={post.slug} />
    </div>
  );
}

/* ---------------- App ---------------- */

export default function App() {
  const systemPrefersDark = useMemo(
    () =>
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
    []
  );

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    return saved ?? (systemPrefersDark ? "dark" : "light");
  });

  const [soundOn, setSoundOn] = useState<boolean>(
    () => localStorage.getItem("soundOn") !== "off"
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("soundOn", soundOn ? "on" : "off");
  }, [soundOn]);

  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 900) setNavOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  const BLOG_ALL = "/blog";
  const BLOG_LOVE = "/blog/love";
  const BLOG_ROMANCE = "/blog/romance";
  const BLOG_DATING = "/blog/dating";
  const BLOG_CHAT = "/blog/chat%20%26%20connection";

  return (
    <div className="site">
      <header className="site-header">
        <div className="site-wrap header">
          <NavLink to="/" className="brand" onClick={() => setNavOpen(false)}>
            <span className="brand-logo">
              <img src="/branding/chatrio-64.png" alt="Chatrio" />
              <span className="wordmark">Chatrio</span>
            </span>
          </NavLink>

          <div className="site-header-right desktop-only">
            <nav className="nav" aria-label="Primary">
              <NavLink className="nav-link" to={BLOG_ALL}>
                Blog
              </NavLink>
              <NavLink className="nav-link" to={BLOG_LOVE}>
                Love
              </NavLink>
              <NavLink className="nav-link" to={BLOG_ROMANCE}>
                Romance
              </NavLink>
              <NavLink className="nav-link" to={BLOG_CHAT}>
                Chat
              </NavLink>
              <NavLink className="nav-link" to={BLOG_DATING}>
                Dating
              </NavLink>
            </nav>

            <div className="row gap">
              <button
                className="btn theme-toggle"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
              <button
                className="btn theme-toggle"
                onClick={() => setSoundOn((s) => !s)}
                aria-label="Toggle sound"
              >
                {soundOn ? "🔊 Sound" : "🔈 Muted"}
              </button>
            </div>
          </div>

          <button
            className="hamburger mobile-only"
            aria-label="Open menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="hb-bar" />
            <span className="hb-bar" />
            <span className="hb-bar" />
          </button>
        </div>

        <div className={`mobile-drawer ${navOpen ? "open" : ""}`}>
          <nav className="mobile-nav" aria-label="Mobile">
            <NavLink
              className="m-link"
              to={BLOG_ALL}
              onClick={() => setNavOpen(false)}
            >
              Blog
            </NavLink>
            <NavLink
              className="m-link"
              to={BLOG_LOVE}
              onClick={() => setNavOpen(false)}
            >
              Love
            </NavLink>
            <NavLink
              className="m-link"
              to={BLOG_ROMANCE}
              onClick={() => setNavOpen(false)}
            >
              Romance
            </NavLink>
            <NavLink
              className="m-link"
              to={BLOG_CHAT}
              onClick={() => setNavOpen(false)}
            >
              Chat
            </NavLink>
            <NavLink
              className="m-link"
              to={BLOG_DATING}
              onClick={() => setNavOpen(false)}
            >
              Dating
            </NavLink>
          </nav>

          <div className="mobile-controls">
            <div className="row gap">
              <button
                className="btn theme-toggle"
                onClick={() => {
                  setTheme(theme === "dark" ? "light" : "dark");
                  setNavOpen(false);
                }}
              >
                {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
              <button
                className="btn theme-toggle"
                onClick={() => {
                  setSoundOn((s) => !s);
                  setNavOpen(false);
                }}
              >
                {soundOn ? "🔊 Sound" : "🔈 Muted"}
              </button>
            </div>
          </div>
        </div>

        {navOpen && (
          <div className="drawer-backdrop" onClick={() => setNavOpen(false)} />
        )}
      </header>

      <main className="site-main">
        <div className="site-wrap">
          <Routes>
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:category" element={<BlogList />} />
            <Route path="/blog/post/:slug" element={<BlogPost />} />

            <Route path="/" element={<Chat />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            <Route path="*" element={<Navigate to="/blog" replace />} />
          </Routes>
        </div>
      </main>

      <footer className="site-footer">
        <div className="site-wrap footer-grid">
          <div className="footer-brand">
            © {new Date().getFullYear()} Chatrio
          </div>
          <div
            className="footer-links"
            style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
          >
            <NavLink to="/privacy" className="footer-link">
              Privacy
            </NavLink>
            <NavLink to="/terms" className="footer-link">
              Terms
            </NavLink>
            <NavLink to="/contact" className="footer-link">
              Contact
            </NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
