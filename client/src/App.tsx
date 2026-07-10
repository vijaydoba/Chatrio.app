// src/App.tsx
import React, { useEffect, useState, Suspense } from "react";
import {
  Routes,
  Route,
  NavLink,
  useLocation,
  useParams,
  Navigate,
} from "react-router-dom";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Home from "./pages/Home";

import "./App.css";

// Route-level code splitting: keep the main bundle lean for content pages
// (mobile CWV) — chat/circles/stories code loads only when those routes open.
// BlogList pulls in data/posts.ts (~80KB) so it must stay lazy too, or every
// page — including Home — pays for it in the main bundle's parse/exec time.
const BlogList = React.lazy(() => import("./pages/BlogList"));
const Stories = React.lazy(() => import("./pages/Stories"));
const StoryPage = React.lazy(() => import("./pages/Stories").then((m) => ({ default: m.StoryPage })));
const Chat = React.lazy(() => import("./Chat"));
const CirclesLocal = React.lazy(() => import("./pages/CirclesLocal"));
const CirclesAdmin = React.lazy(() => import("./pages/CirclesAdmin"));
const CohortRoom = React.lazy(() => import("./pages/CohortRoom"));
const Auth = React.lazy(() => import("./pages/Auth"));

type Theme = "light" | "dark";

/* ---------------- Pages (inline) ---------------- */

const BlogPost = React.lazy(() => import("./pages/BlogPost"));

// /blog/:slug is shared by category listing pages and individual post pages —
// resolve which to render based on the param. Must cover every value in
// Post["category"] (posts.ts) lowercased, since useParams decodes the URL
// (the nav pill for "Chat & Connection" links to /blog/chat%20%26%20connection).
const BLOG_CATEGORY_SLUGS = new Set([
  "love", "romance", "dating", "relationships", "chat & connection", "mental health",
]);
function BlogRoute() {
  const { slug } = useParams<{ slug?: string }>();
  if (slug && BLOG_CATEGORY_SLUGS.has(slug.toLowerCase())) {
    return <BlogList />;
  }
  return <BlogPost />;
}

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
  const [mobBlogOpen, setMobBlogOpen] = useState(false); // State for mobile blog dropdown

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
    setMobBlogOpen(false);
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
              <NavLink className="nav-link nav-link-cta" to="/chat">Chat</NavLink>
              <NavLink className="nav-link" to="/circles">Circles</NavLink>

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
          <NavLink className="m-link" to="/circles" onClick={() => setNavOpen(false)}>Circles</NavLink>

          <div className="mob-blog-group">
            <button
              type="button"
              className={`mob-blog-toggle${pathname.startsWith("/blog") ? " active" : ""}`}
              onClick={() => setMobBlogOpen((v) => !v)}
              aria-expanded={mobBlogOpen}
            >
              Blog
              <svg className={`mob-blog-chevron${mobBlogOpen ? " open" : ""}`} viewBox="0 0 10 6" fill="none">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {mobBlogOpen && (
              <div className="mob-sub-links">
                <NavLink className="mob-sub-link" to={BLOG_LOVE} onClick={() => setNavOpen(false)}><span className="dd-icon">💖</span>Love</NavLink>
                <NavLink className="mob-sub-link" to={BLOG_ROMANCE} onClick={() => setNavOpen(false)}><span className="dd-icon">🌹</span>Romance</NavLink>
                <NavLink className="mob-sub-link" to={BLOG_DATING} onClick={() => setNavOpen(false)}><span className="dd-icon">✨</span>Dating</NavLink>
                <NavLink className="mob-sub-link" to={BLOG_CHAT} onClick={() => setNavOpen(false)}><span className="dd-icon">💬</span>Chat & Connection</NavLink>
              </div>
            )}
          </div>

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
            <Route path="/blog/:slug" element={<BlogRoute />} />

            <Route path="/" element={<Home />} />
            <Route path="/web-stories" element={<Stories />} />
            <Route path="/web-stories/:id" element={<StoryPage />} />
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
