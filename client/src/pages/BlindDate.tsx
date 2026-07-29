import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { NavLink } from "react-router-dom";
import { API_BASE, BLIND_DATE_LIVE } from "../config";
import "./circles.css";

export default function BlindDate() {
  return BLIND_DATE_LIVE ? <BlindDateLive /> : <BlindDateWaitlist />;
}

function BlindDateWaitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || status === "submitting") return;
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch(`${API_BASE}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "blind-date" }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Something went wrong");
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  return (
    <div className="circles-wrap">
      <Helmet>
        <title>Blind Date — Coming Soon | Chatrio</title>
        <meta name="description" content="Blind Date — meet the person before you meet the face. A profile-matched chat where names and photos stay hidden until you both choose to reveal them. Coming soon to Chatrio." />
        <link rel="canonical" href="https://chatrio.app/blind-date" />
      </Helmet>

      <div className="wl-card">
        <span className="wl-badge">Coming soon</span>
        <h1 className="wl-h1">Blind Date</h1>
        <p className="wl-sub">
          Random chat is a one-off spark. Circles is familiar faces. <strong>Blind Date</strong> is
          the opposite of both: you're matched on personality, not looks, and the reveal only
          happens once you both want it to.
        </p>
        <p className="wl-sub wl-sub-dim">
          We're still building it. Drop your email and you'll be first to know when it opens.
        </p>

        {status === "done" ? (
          <div className="wl-done">
            <span className="wl-done-check">✓</span>
            You're on the list! We'll email you the moment Blind Date goes live.
          </div>
        ) : (
          <form className="wl-form" onSubmit={submit}>
            <input
              className="wl-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
              aria-label="Email address"
            />
            <button className="wl-btn" type="submit" disabled={!valid || status === "submitting"}>
              {status === "submitting" ? "Adding…" : "Notify me"}
            </button>
          </form>
        )}

        {status === "error" && <p className="wl-error">{error}</p>}
        {status !== "done" && <p className="wl-fineprint">No spam. One email when it launches, that's it.</p>}
      </div>
    </div>
  );
}

// ── The real Blind Date landing page (re-enable via BLIND_DATE_LIVE). The
// CTA links straight to /blind-date/chat — that page already handles every
// account state (logged out → /login, logged in but no profile → onboarding
// prompt, profile ready → find a match / resume an active date), so this
// page doesn't need to duplicate that branching. ──
function BlindDateLive() {
  return (
    <div className="circles-wrap">
      <Helmet>
        <title>Blind Date — Meet Someone Compatible, Not Just Nearby | Chatrio</title>
        <meta name="description" content="Blind Date matches you on personality and compatibility, not looks. Chat first — names and photos stay hidden until you both choose to reveal them." />
        <link rel="canonical" href="https://chatrio.app/blind-date" />
      </Helmet>

      <div className="wl-card">
        <span className="wl-badge">Live</span>
        <h1 className="wl-h1">Blind Date</h1>
        <p className="wl-sub">
          Random chat is a one-off spark. Circles is familiar faces. <strong>Blind Date</strong> is
          the opposite of both: you're matched on personality, not looks, and the reveal only
          happens once you both want it to.
        </p>
        <p className="wl-sub wl-sub-dim">
          Build a short profile, get matched with someone compatible, and talk — names and photos
          stay blurred until you both tap reveal, or after 10 minutes.
        </p>

        <NavLink className="wl-btn" to="/blind-date/chat">Get started</NavLink>
        <p className="wl-fineprint">Requires a free chatrio account. 18+ only.</p>
      </div>

      <section className="cl-seo">
        <h2>Learn more about Blind Date</h2>
        <ul className="cl-seo-links">
          <li><NavLink to="/blog/what-is-a-blind-date-app-how-it-works-2026">What is a blind date app? How they work in 2026</NavLink></li>
          <li><NavLink to="/blog/anonymous-dating-apps-guide-2026">Anonymous dating apps: what they are and why people are switching</NavLink></li>
          <li><NavLink to="/blog/virtual-dating-tips-video-dates-2026">Virtual dating: how to have a great video date</NavLink></li>
        </ul>
      </section>
    </div>
  );
}
