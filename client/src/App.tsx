// src/App.tsx
import React, { useEffect, useMemo, useState, Suspense } from "react";
import {
  Routes,
  Route,
  NavLink,
  useLocation,
  Navigate,
  useParams,
} from "react-router-dom";
import { Helmet } from "react-helmet-async";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Home from "./pages/Home";
import Stories, { StoryPage } from "./pages/Stories";
import Chat from "./Chat";
import CirclesLocal from "./pages/CirclesLocal";
import CirclesAdmin from "./pages/CirclesAdmin";
import CohortRoom from "./pages/CohortRoom";
import Auth from "./pages/Auth";

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
          "publisher": { "@type": "Organization", "name": "Chatrio", "url": "https://chatrio.app", "logo": "https://chatrio.app/branding/chatrio-512.png" }
        })}</script>
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

const BlogPost = React.lazy(() => import("./pages/BlogPost"));

/* ---------------- Cookie Banner ---------------- */

function CookieBanner() {
  const [visible, setVisible] = useState(() => !localStorage.getItem("cookie_consent"));
  const [showPrefs, setShowPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  if (!visible) return null;

  function accept() {
    localStorage.setItem("cookie_consent", "all");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("cookie_consent", "essential");
    setVisible(false);
  }

  function savePrefs() {
    localStorage.setItem("cookie_consent", analytics ? "all" : "essential");
    setVisible(false);
  }

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
      <div className="cookie-inner">
        {!showPrefs ? (
          <>
            <div className="cookie-title">🍪 We use cookies</div>
            <p className="cookie-text">
              Chatrio uses essential cookies to keep the platform running, and optional cookies for analytics and
              advertising. You can accept all, choose your preferences, or decline optional ones. Your choice is saved for 12 months.{" "}
              <a href="/privacy" className="cookie-link">Privacy Policy</a>
            </p>
            <div className="cookie-actions">
              <button className="cookie-btn cookie-btn-outline" onClick={() => setShowPrefs(true)}>Manage Preferences</button>
              <button className="cookie-btn cookie-btn-outline" onClick={decline}>Decline Optional</button>
              <button className="cookie-btn cookie-btn-primary" onClick={accept}>Accept All</button>
            </div>
          </>
        ) : (
          <>
            <div className="cookie-title">🍪 Manage Preferences</div>
            <div className="cookie-pref-row">
              <div className="cookie-pref-info">
                <strong>Essential Cookies</strong>
                <span>Required for the platform to work. Cannot be disabled.</span>
              </div>
              <div className="cookie-toggle cookie-toggle-on">Always On</div>
            </div>
            <div className="cookie-pref-row">
              <div className="cookie-pref-info">
                <strong>Analytics & Advertising</strong>
                <span>Help us understand usage and show relevant ads.</span>
              </div>
              <button
                className={`cookie-toggle ${analytics ? "cookie-toggle-on" : "cookie-toggle-off"}`}
                onClick={() => setAnalytics((v) => !v)}
                aria-pressed={analytics}
              >
                {analytics ? "On" : "Off"}
              </button>
            </div>
            <div className="cookie-actions">
              <button className="cookie-btn cookie-btn-outline" onClick={() => setShowPrefs(false)}>Back</button>
              <button className="cookie-btn cookie-btn-primary" onClick={savePrefs}>Save Preferences</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- App ---------------- */

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    // First-time visitors default to dark mode; returning users keep their saved choice.
    const saved = localStorage.getItem("theme") as Theme | null;
    return saved ?? "dark";
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
  const [dropdownOpen, setDropdownOpen] = useState(false); // State for dropdown

  // ESC closes drawer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock background scroll when drawer is open
  useEffect(() => {
    const body = document.body;
    const prev = body.style.overflow;
    if (navOpen) body.style.overflow = "hidden";
    else body.style.overflow = prev || "";
    return () => {
      body.style.overflow = prev || "";
    };
  }, [navOpen]);

  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setNavOpen(false);
    setDropdownOpen(false); // Close dropdown on route change
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
              <svg className="brand-mark" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="bm" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#6d28d9" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <rect x="1" y="2" width="34" height="23" rx="9" fill="url(#bm)" />
                <path d="M5 25 L2 34 L15 25Z" fill="url(#bm)" />
                <circle cx="10" cy="13.5" r="2.2" fill="white" />
                <circle cx="18" cy="13.5" r="2.2" fill="white" />
                <circle cx="26" cy="13.5" r="2.2" fill="white" />
              </svg>
              <span className="wordmark">Chatrio</span>
            </span>
          </NavLink>

          {/* Desktop navbar */}
          <div className="site-header-right desktop-only">
            <nav className="nav" aria-label="Primary">
              <div
                className="nav-dropdown-container"
                onMouseEnter={() => setDropdownOpen(true)}
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <NavLink className="nav-link nav-link-dropdown" to={BLOG_ALL}>
                  Blog
                  <svg className="nav-chevron" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </NavLink>
                {dropdownOpen && (
                  <div className="nav-dropdown-menu">
                    <NavLink to={BLOG_LOVE} className="dropdown-item"><span className="dd-icon">💖</span>Love</NavLink>
                    <NavLink to={BLOG_ROMANCE} className="dropdown-item"><span className="dd-icon">🌹</span>Romance</NavLink>
                    <NavLink to={BLOG_DATING} className="dropdown-item"><span className="dd-icon">✨</span>Dating</NavLink>
                    <NavLink to={BLOG_CHAT} className="dropdown-item"><span className="dd-icon">💬</span>Chat & Connection</NavLink>
                  </div>
                )}
              </div>

              <NavLink className="nav-link nav-link-cta" to="/chat">Chat</NavLink>
              <NavLink className="nav-link" to="/circles">Circles</NavLink>
              <NavLink className="nav-link" to="/web-stories">Web Stories</NavLink>
              <NavLink className="nav-link" to="/about">About</NavLink>
              <NavLink className="nav-link" to="/contact">Contact</NavLink>
            </nav>

            <div className="nav-actions">
              <button
                className="nav-icon-btn"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 1.78a1 1 0 011.42 1.42l-.71.7a1 1 0 11-1.42-1.41l.71-.71zM18 9a1 1 0 110 2h-1a1 1 0 110-2h1zM4.22 4.78a1 1 0 010 1.42l-.71.71a1 1 0 01-1.42-1.42l.71-.71a1 1 0 011.42 0zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm6.36-2.64a1 1 0 010 1.41l-.71.71a1 1 0 11-1.41-1.41l.7-.71a1 1 0 011.42 0zM3 9a1 1 0 110 2H2a1 1 0 110-2h1zm1.22 4.36a1 1 0 011.41 0l.71.71a1 1 0 11-1.41 1.41l-.71-.7a1 1 0 010-1.42zM10 6a4 4 0 100 8 4 4 0 000-8z"/></svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
                )}
              </button>
              <button
                className="nav-icon-btn"
                onClick={() => setSoundOn((s) => !s)}
                aria-label="Toggle sound"
                title={soundOn ? "Mute sounds" : "Unmute sounds"}
              >
                {soundOn ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd"/></svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            className="hamburger mobile-only"
            aria-label={navOpen ? "Close menu" : "Open menu"}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="hb-bar" />
            <span className="hb-bar" />
            <span className="hb-bar" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div className={`mobile-drawer ${navOpen ? "open" : ""}`}>
        {/* Drawer header */}
        <div className="drawer-header">
          <div className="drawer-brand-mark">
            <svg viewBox="0 0 36 36" width="20" height="20" fill="none">
              <rect x="1" y="2" width="34" height="23" rx="9" fill="white" fillOpacity="0.9"/>
              <path d="M5 25 L2 34 L15 25Z" fill="white" fillOpacity="0.9"/>
              <circle cx="10" cy="13.5" r="2.2" fill="#7c3aed"/>
              <circle cx="18" cy="13.5" r="2.2" fill="#7c3aed"/>
              <circle cx="26" cy="13.5" r="2.2" fill="#7c3aed"/>
            </svg>
          </div>
          <span className="drawer-brand-name">Chatrio</span>
        </div>

        <nav className="mobile-nav" aria-label="Mobile">
          <NavLink className="m-link m-link-cta" to="/chat" onClick={() => setNavOpen(false)}>
            Chat
          </NavLink>

          <div className="mob-blog-group">
            <NavLink className="m-link" to={BLOG_ALL} onClick={() => setNavOpen(false)}>
              Blog
            </NavLink>
            <div className="mob-sub-links">
              <NavLink className="mob-sub-link" to={BLOG_LOVE} onClick={() => setNavOpen(false)}>Love</NavLink>
              <NavLink className="mob-sub-link" to={BLOG_ROMANCE} onClick={() => setNavOpen(false)}>Romance</NavLink>
              <NavLink className="mob-sub-link" to={BLOG_DATING} onClick={() => setNavOpen(false)}>Dating</NavLink>
              <NavLink className="mob-sub-link" to={BLOG_CHAT} onClick={() => setNavOpen(false)}>Chat & Connection</NavLink>
            </div>
          </div>

          <NavLink className="m-link" to="/circles" onClick={() => setNavOpen(false)}>Circles</NavLink>
          <NavLink className="m-link" to="/web-stories" onClick={() => setNavOpen(false)}>Web Stories</NavLink>
          <NavLink className="m-link" to="/about" onClick={() => setNavOpen(false)}>About</NavLink>
          <NavLink className="m-link" to="/contact" onClick={() => setNavOpen(false)}>Contact</NavLink>

          <div className="m-divider" />

          <NavLink className="m-link m-link-muted" to="/privacy" onClick={() => setNavOpen(false)}>Privacy</NavLink>
          <NavLink className="m-link m-link-muted" to="/terms" onClick={() => setNavOpen(false)}>Terms</NavLink>
        </nav>

        {/* Footer icon buttons */}
        <div className="drawer-footer">
          <button
            className="drawer-icon-btn"
            onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); setNavOpen(false); }}
            aria-label="Toggle theme"
          >
            {theme === "dark"
              ? <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 1.78a1 1 0 011.42 1.42l-.71.7a1 1 0 11-1.42-1.41l.71-.71zM18 9a1 1 0 110 2h-1a1 1 0 110-2h1zM4.22 4.78a1 1 0 010 1.42l-.71.71a1 1 0 01-1.42-1.42l.71-.71a1 1 0 011.42 0zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm6.36-2.64a1 1 0 010 1.41l-.71.71a1 1 0 11-1.41-1.41l.7-.71a1 1 0 011.42 0zM3 9a1 1 0 110 2H2a1 1 0 110-2h1zm1.22 4.36a1 1 0 011.41 0l.71.71a1 1 0 11-1.41 1.41l-.71-.7a1 1 0 010-1.42zM10 6a4 4 0 100 8 4 4 0 000-8z"/></svg>
              : <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
            }
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <button
            className="drawer-icon-btn"
            onClick={() => { setSoundOn((s) => !s); setNavOpen(false); }}
            aria-label="Toggle sound"
          >
            {soundOn
              ? <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd"/></svg>
              : <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
            }
            {soundOn ? "Mute" : "Sound"}
          </button>
        </div>
      </div>

      {/* Backdrop */}
      {navOpen && (
        <div className="drawer-backdrop" onClick={() => setNavOpen(false)} />
      )}

      {/* --------------------------- */}

      <main className="site-main">
        <div className="site-wrap">
          <Suspense fallback={null}>
          <Routes>
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:category" element={<BlogList />} />
            <Route path="/blog/post/:slug" element={<BlogPost />} />

            <Route path="/" element={<Home />} />
            <Route path="/web-stories" element={<Stories />} />
            <Route path="/web-stories/:id" element={<StoryPage />} />
            {/* legacy redirects */}
            <Route path="/stories" element={<Stories />} />
            <Route path="/stories/:id" element={<StoryPage />} />
            <Route path="/chat" element={<Chat theme={theme} setTheme={setTheme} soundOn={soundOn} setSoundOn={setSoundOn} />} />
            <Route path="/circles" element={<CirclesLocal />} />
            <Route path="/circles-admin" element={<CirclesAdmin />} />
            <Route path="/nearby" element={<Navigate to="/circles" replace />} />
            <Route path="/circles/:cohortId" element={<CohortRoom />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/signup" element={<Auth mode="signup" />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            <Route path="*" element={<Navigate to="/blog" replace />} />
          </Routes>
          </Suspense>
        </div>
      </main>

      <CookieBanner />

      <footer className="site-footer">
        <div className="site-wrap footer-grid">
          <div className="footer-brand">
            © {new Date().getFullYear()} Chatrio
          </div>
          <div
            className="footer-links"
            style={{
              display: "flex",
              gap: 15,
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <NavLink to="/about" className="footer-link">About</NavLink>
            <NavLink to="/contact" className="footer-link">Contact</NavLink>
            <span style={{ opacity: 0.3 }}>|</span>
            <NavLink to="/privacy" className="footer-link">Privacy Policy</NavLink>
            <NavLink to="/terms" className="footer-link">Terms of Service</NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
