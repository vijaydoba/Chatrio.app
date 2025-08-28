// src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";

import Chat from "./Chat";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

import "./App.css";

type Theme = "light" | "dark";

export default function App() {
  // Prefer system theme on first load
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

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("soundOn", soundOn ? "on" : "off");
  }, [soundOn]);

  // Header / nav
  const [navOpen, setNavOpen] = useState(false);

  // Close drawer on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Auto-close drawer if we resize back to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 900) setNavOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Scroll to top on route change
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return (
    <div className="site">
      {/* Header */}
      <header className="site-header">
        <div className="site-wrap header">
          {/* Brand */}
          <NavLink to="/" className="brand" onClick={() => setNavOpen(false)}>
            <span className="brand-logo">
              <img src="/branding/chatrio-64.png" alt="Chatrio" />
              <span className="wordmark">Chatrio</span>
            </span>
          </NavLink>

          {/* Desktop nav + controls (hidden below 900px) */}
          <div className="header-right desktop-only">
            <nav className="nav" aria-label="Primary">
              <NavLink className="nav-link" to="/chat">
                Start Chat
              </NavLink>
              <NavLink className="nav-link" to="/about">
                About
              </NavLink>
              <NavLink className="nav-link" to="/contact">
                Contact
              </NavLink>
              <NavLink className="nav-link" to="/privacy">
                Privacy
              </NavLink>
              <NavLink className="nav-link" to="/terms">
                Terms
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

          {/* Mobile hamburger (only appears below 900px) */}
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

        {/* Mobile drawer */}
        <div className={`mobile-drawer ${navOpen ? "open" : ""}`}>
          <nav className="mobile-nav" aria-label="Mobile">
            <NavLink
              className="m-link"
              to="/chat"
              onClick={() => setNavOpen(false)}
            >
              Start Chat
            </NavLink>
            <NavLink
              className="m-link"
              to="/about"
              onClick={() => setNavOpen(false)}
            >
              About
            </NavLink>
            <NavLink
              className="m-link"
              to="/contact"
              onClick={() => setNavOpen(false)}
            >
              Contact
            </NavLink>
            <NavLink
              className="m-link"
              to="/privacy"
              onClick={() => setNavOpen(false)}
            >
              Privacy
            </NavLink>
            <NavLink
              className="m-link"
              to="/terms"
              onClick={() => setNavOpen(false)}
            >
              Terms
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

        {/* Backdrop */}
        {navOpen && (
          <div className="drawer-backdrop" onClick={() => setNavOpen(false)} />
        )}
      </header>

      {/* Main */}
      <main className="site-main">
        <div className="site-wrap">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </div>
      </main>

      {/* Footer */}
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
