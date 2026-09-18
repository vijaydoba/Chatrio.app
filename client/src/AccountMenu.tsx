// Instagram-style account control for the site header + mobile drawer.
// Signed out → a "Log in" button that opens a menu with a direct
// "Continue with Google" (plus an email-login fallback). Signed in → an
// avatar that opens a dropdown with the profile (name / email), quick links
// and Log out.
//
// Hydration note: this project hydrates prerendered HTML that was captured as a
// fresh, signed-out visitor. `user` is always null on the first client render
// too (it's only populated after /auth/me resolves), so keying UI off `user`
// keeps the initial tree identical to the prerender and avoids mismatches. The
// GoogleLogin widget is an async client-only iframe, so it is gated behind a
// `mounted` flag and never appears in the prerendered markup.
import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "./auth";
import { GOOGLE_CLIENT_ID } from "./config";

function initialsOf(name: string, email: string): string {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

/** Renders the Google button only after mount (client-only) and only when a
 *  Client ID is configured — keeps the iframe out of the prerendered HTML.
 *  The button width is measured from its container and clamped to Google's
 *  accepted 200–400px range, so it always fits (the mobile drawer is only
 *  ~260px of inner space — a hardcoded width overflowed and clipped the icon). */
function GoogleConnect({ onDone }: { onDone: () => void }) {
  const { googleSignIn } = useAuth();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const measure = () => {
      const w = wrapRef.current?.clientWidth ?? 0;
      if (w) setWidth(Math.max(200, Math.min(400, Math.floor(w))));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="account-google" ref={wrapRef}>
      {width > 0 && (
        <GoogleLogin
          onSuccess={async (cred) => {
            if (!cred.credential) return;
            try {
              await googleSignIn(cred.credential);
            } catch {
              /* surfaced on the /login page; header stays silent */
            } finally {
              onDone();
            }
          }}
          onError={onDone}
          width={String(width)}
          text="continue_with"
          shape="pill"
        />
      )}
    </div>
  );
}

/** Desktop header account menu (avatar + dropdown). */
export default function AccountMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Signed out → "Log in" button that opens a small auth menu.
  if (!user) {
    return (
      <div className="account-menu" ref={ref}>
        <button
          className="nav-login-btn"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          Log in
        </button>
        {open && (
          <div className="account-dropdown account-dropdown-auth" role="menu">
            <div className="account-auth-title">Log in or sign up</div>
            <GoogleConnect onDone={() => setOpen(false)} />
            <div className="account-or"><span>or</span></div>
            <NavLink to="/login" className="account-item" role="menuitem" onClick={() => setOpen(false)}>
              <span className="dd-icon">✉️</span> Log in with email
            </NavLink>
            <NavLink to="/signup" className="account-item" role="menuitem" onClick={() => setOpen(false)}>
              <span className="dd-icon">✨</span> Create an account
            </NavLink>
          </div>
        )}
      </div>
    );
  }

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/");
  };

  return (
    <div className="account-menu" ref={ref}>
      <button
        className={`account-avatar-btn${open ? " open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Your account"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="account-avatar">{initialsOf(user.name, user.email)}</span>
      </button>
      {open && (
        <div className="account-dropdown" role="menu">
          <div className="account-head">
            <span className="account-avatar account-avatar-lg">
              {initialsOf(user.name, user.email)}
            </span>
            <div className="account-id">
              <span className="account-name">{user.name || "You"}</span>
              <span className="account-email">{user.email}</span>
            </div>
          </div>
          <div className="account-sep" />
          <NavLink to="/friends" className="account-item" role="menuitem" onClick={() => setOpen(false)}>
            <span className="dd-icon">👥</span> Friends
          </NavLink>
          <NavLink to="/circles" className="account-item" role="menuitem" onClick={() => setOpen(false)}>
            <span className="dd-icon">🟣</span> Circles
          </NavLink>
          <div className="account-sep" />
          <button className="account-item account-logout" role="menuitem" onClick={handleLogout}>
            <span className="dd-icon">⏻</span> Log out
          </button>
        </div>
      )}
    </div>
  );
}

/** Account block for the mobile drawer. */
export function MobileAccount({ onNavigate }: { onNavigate: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="m-account m-account-out">
        <GoogleConnect onDone={onNavigate} />
        <NavLink to="/login" className="m-login-btn m-login-email" onClick={onNavigate}>
          Log in with email
        </NavLink>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    onNavigate();
    navigate("/");
  };

  return (
    <div className="m-account m-account-in">
      <span className="account-avatar account-avatar-lg">
        {initialsOf(user.name, user.email)}
      </span>
      <div className="account-id">
        <span className="account-name">{user.name || "You"}</span>
        <span className="account-email">{user.email}</span>
      </div>
      <button className="m-logout-btn" onClick={handleLogout} aria-label="Log out">
        Log out
      </button>
    </div>
  );
}
