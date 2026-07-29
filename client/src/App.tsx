// src/App.tsx
import React, { useEffect, useState, Suspense } from "react";
import { Capacitor } from "@capacitor/core";
import {
  Routes,
  Route,
  NavLink,
  useLocation,
  useParams,
  Navigate,
} from "react-router-dom";
import { initPush } from "./push";
import About from "./pages/About";
import EditorialStandards from "./pages/EditorialStandards";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Home from "./pages/Home";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";
import { Helmet } from "react-helmet-async";
import { BLIND_DATE_LIVE } from "./config";

import "./App.css";

// Route-level code splitting keeps interactive product routes out of the
// content bundle. Blog routes stay eager because this project hydrates
// prerendered HTML: suspending while a blog chunk loads replaces the visible
// article during hydration and creates a measurable layout shift.
const Chat = React.lazy(() => import("./Chat"));
const CirclesLocal = React.lazy(() => import("./pages/CirclesLocal"));
const BlindDate = React.lazy(() => import("./pages/BlindDate"));
const BlindDateOnboarding = React.lazy(() => import("./pages/BlindDateOnboarding"));
const BlindDateChat = React.lazy(() => import("./pages/BlindDateChat"));
const CirclesAdmin = React.lazy(() => import("./pages/CirclesAdmin"));
const CohortRoom = React.lazy(() => import("./pages/CohortRoom"));
const Auth = React.lazy(() => import("./pages/Auth"));

type Theme = "light" | "dark";

/* ---------------- Pages (inline) ---------------- */

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
  // A key guarantees a fresh content state when navigating directly between
  // articles in the SPA.
  return <BlogPost key={slug} />;
}

function NotFound() {
  return (
    <section className="not-found-page">
      <Helmet>
        <title>Page Not Found | Chatrio</title>
        <meta name="description" content="The requested Chatrio page could not be found." />
        <meta name="robots" content="noindex,follow" />
      </Helmet>
      <h1>Page not found</h1>
      <p>The page may have moved or the address may be incorrect.</p>
      <NavLink to="/">Return home</NavLink>
      <span aria-hidden="true"> · </span>
      <NavLink to="/blog">Browse the blog</NavLink>
    </section>
  );
}

/* ---------------- Cookie Banner ---------------- */

function CookieBanner() {
  // Default to visible: the prerendered HTML is always snapshotted from a
  // fresh, no-consent-stored crawler session, so that's what's baked into the
  // static file. Matching that on first client render avoids a hydration
  // mismatch; returning visitors who already answered get it hidden right
  // after mount instead.
  const [visible, setVisible] = useState(true);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  useEffect(() => {
    if (localStorage.getItem("cookie_consent")) setVisible(false);
  }, []);

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
              {"Chatrio uses essential cookies to keep the platform running, and optional cookies for analytics and advertising. You can accept all, choose your preferences, or decline optional ones. Your choice is saved for 12 months. "}
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

// Running inside the Capacitor-wrapped Android app: it ships Circles only,
// so skip the marketing chrome (nav/blog/footer) and land straight on it.
const isNative = Capacitor.isNativePlatform();

export default function App() {
  // Initial state must match the prerendered HTML (which always assumes a fresh
  // visitor with no saved prefs) to avoid a hydration mismatch; any saved
  // preference is applied right after mount instead, in the effect below.
  const [theme, setTheme] = useState<Theme>("dark");
  const [soundOn, setSoundOn] = useState<boolean>(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme && savedTheme !== "dark") setTheme(savedTheme);
    if (localStorage.getItem("soundOn") === "off") setSoundOn(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("soundOn", soundOn ? "on" : "off");
  }, [soundOn]);

  useEffect(() => {
    if (isNative) initPush();
  }, []);

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
  const usesLazyProductRoute =
    pathname === "/chat" ||
    pathname === "/circles" ||
    pathname === "/blind-date" ||
    pathname.startsWith("/blind-date/") ||
    pathname === "/circles-admin" ||
    pathname.startsWith("/circles/") ||
    pathname === "/login" ||
    pathname === "/signup";

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
      {!isNative && (
      <>
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
      </>
      )}

      {/* --------------------------- */}

      <main className="site-main">
        <div className="site-wrap">
          {usesLazyProductRoute ? (
            <Suspense fallback={<div className="route-loading" role="status">Loading…</div>}>
              <Routes>
                <Route path="/chat" element={<Chat theme={theme} setTheme={setTheme} soundOn={soundOn} setSoundOn={setSoundOn} />} />
                <Route path="/circles" element={<CirclesLocal />} />
                <Route path="/blind-date" element={<BlindDate />} />
                <Route
                  path="/blind-date/onboarding"
                  element={BLIND_DATE_LIVE ? <BlindDateOnboarding /> : <Navigate to="/blind-date" replace />}
                />
                <Route
                  path="/blind-date/chat"
                  element={BLIND_DATE_LIVE ? <BlindDateChat /> : <Navigate to="/blind-date" replace />}
                />
                <Route path="/circles-admin" element={<CirclesAdmin />} />
                <Route path="/circles/:cohortId" element={<CohortRoom />} />
                <Route path="/login" element={<Auth mode="login" />} />
                <Route path="/signup" element={<Auth mode="signup" />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          ) : (
            <Routes>
              <Route path="/blog" element={<BlogList />} />
              <Route path="/blog/:slug" element={<BlogRoute />} />
              <Route path="/" element={isNative ? <Navigate to="/circles" replace /> : <Home />} />
              <Route path="/nearby" element={<Navigate to="/circles" replace />} />
              <Route path="/about" element={<About />} />
              <Route path="/editorial-standards" element={<EditorialStandards />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          )}
        </div>
      </main>

      {!isNative && (
      <>
      <CookieBanner />

      <footer className="site-footer">
        <div className="site-wrap footer-grid">
          <div className="footer-brand">
            {`© ${new Date().getFullYear()} Chatrio`}
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
            <NavLink to="/editorial-standards" className="footer-link">Editorial Standards</NavLink>
            <NavLink to="/contact" className="footer-link">Contact</NavLink>
            <span style={{ opacity: 0.3 }}>|</span>
            <NavLink to="/privacy" className="footer-link">Privacy Policy</NavLink>
            <NavLink to="/terms" className="footer-link">Terms of Service</NavLink>
            <span style={{ opacity: 0.3 }}>|</span>
            <a
              href="https://x.com/Chatrioapp1"
              className="footer-link footer-social-link"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Chatrio on X (opens in a new tab)"
            >
              X
            </a>
            <a
              href="https://discord.gg/289JDCJtRj"
              className="footer-link footer-social-link"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Join the Chatrio Discord (opens in a new tab)"
            >
              Discord
            </a>
          </div>
          <div className="footer-badges" style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
            <a href="https://startupfa.me/s/chatrio?utm_source=chatrio.app" target="_blank" rel="noopener noreferrer">
              <img
                src="https://startupfa.me/badges/featured-badge-small.webp"
                alt="Chatrio - Featured on Startup Fame"
                width="224"
                height="36"
              />
            </a>
          </div>
        </div>
      </footer>
      </>
      )}
    </div>
  );
}
