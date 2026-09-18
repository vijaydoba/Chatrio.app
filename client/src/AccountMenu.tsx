// Instagram-style account control for the site header + mobile drawer.
// Signed out → a "Log in" affordance. Signed in → an avatar that opens a
// dropdown with the profile (name / email), quick links and Log out.
//
// Hydration note: this project hydrates prerendered HTML that was captured as a
// fresh, signed-out visitor. `user` is always null on the first client render
// too (it's only populated after /auth/me resolves), so keying UI off `user`
// keeps the initial tree identical to the prerender and avoids mismatches.
import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";

function initialsOf(name: string, email: string): string {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
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

  if (!user) {
    return (
      <NavLink to="/login" className="nav-login-btn">Log in</NavLink>
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
      <div className="m-account">
        <NavLink to="/login" className="m-login-btn" onClick={onNavigate}>
          Log in
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
