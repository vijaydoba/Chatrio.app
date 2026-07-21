import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, NavLink } from "react-router-dom";
import { useAuth, apiGet, apiPost } from "../auth";
import { API_BASE } from "../config";
import "./circles.css";

// Circles isn't fully live yet — until then, /circles shows a "notify me"
// email capture. Flip this to `true` to restore the real cohort experience.
const CIRCLES_LIVE = false;

export default function Circles() {
  return CIRCLES_LIVE ? <CirclesLive /> : <CirclesWaitlist />;
}

// ── Coming-soon email capture ──
function CirclesWaitlist() {
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
        body: JSON.stringify({ email: email.trim(), source: "circles" }),
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
        <title>Circles — Coming Soon | Chatrio</title>
        <meta name="description" content="Circles — small groups that meet again and again — is coming soon. Leave your email and we'll let you know the moment it opens." />
        <link rel="canonical" href="https://chatrio.app/circles" />
      </Helmet>

      <div className="wl-card">
        <span className="wl-badge">Coming soon</span>
        <h1 className="wl-h1">Circles</h1>
        <p className="wl-sub">
          Random chat is for a one-off spark. <strong>Circles</strong> is the opposite: a small
          group that meets at the same time each week, so the same faces become familiar.
        </p>
        <p className="wl-sub wl-sub-dim">
          We're putting the finishing touches on it. Drop your email and you'll be first to know
          when it opens.
        </p>

        {status === "done" ? (
          <div className="wl-done">
            <span className="wl-done-check">✓</span>
            You're on the list! We'll email you the moment Circles goes live.
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

type Circle = {
  id: number;
  topic: string;
  description: string;
  dayLabel: string;
  hour: number;
  capacity: number;
  memberCount: number;
  nextSessionAt: number;
  joined: boolean;
  cohortId: number | null;
};

function fmtHour(h: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:00 ${ampm}`;
}

function countdown(ts: number) {
  const ms = ts - Date.now();
  if (ms <= 0) return "now";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (d > 0) return `in ${d}d ${h}h`;
  const m = Math.floor((ms % 3600000) / 60000);
  return `in ${h}h ${m}m`;
}

// ── The real Circles experience (re-enable via CIRCLES_LIVE) ──
function CirclesLive() {
  const { user, token, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState<number | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!token) {
      navigate("/login", { state: { from: "/circles" }, replace: true });
      return;
    }
    apiGet("/circles", token)
      .then(setCircles)
      .catch((e) => setError(e.message))
      .finally(() => setFetching(false));
  }, [token, loading, navigate]);

  const join = async (id: number) => {
    if (!token) return;
    setJoining(id);
    setError("");
    try {
      const cohort = await apiPost(`/circles/${id}/join`, token);
      navigate(`/circles/${cohort.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join");
      setJoining(null);
    }
  };

  if (loading || fetching) {
    return <div className="circles-wrap"><p className="circles-sub">Loading…</p></div>;
  }

  return (
    <div className="circles-wrap">
      <Helmet>
        <title>Circles — Chatrio</title>
        <meta name="description" content="Join a small Circle that meets again and again. Real connection comes from seeing the same people repeatedly." />
        <link rel="canonical" href="https://chatrio.app/circles" />
      </Helmet>

      <header className="circles-head">
        <div>
          <h1 className="circles-h1">Circles</h1>
          <p className="circles-sub">
            Random chat is for a one-off spark. <strong>Circles</strong> is the opposite: a small
            group that meets at the same time each week, so the same faces become familiar.
          </p>
        </div>
        <div className="circles-user">
          {user && <span className="circles-hello">Hi, {user.name}</span>}
          <button className="circles-btn-ghost" onClick={() => { logout(); navigate("/"); }}>
            Log out
          </button>
        </div>
      </header>

      {error && <div className="auth-error">{error}</div>}

      <div className="circles-grid">
        {circles.map((c) => (
          <div className="circle-card" key={c.id}>
            <div className="circle-card-top">
              <h2 className="circle-topic">{c.topic}</h2>
              <span className="circle-badge">{c.memberCount} member{c.memberCount === 1 ? "" : "s"}</span>
            </div>
            <p className="circle-desc">{c.description}</p>
            <div className="circle-meta">
              <span>🗓 {c.dayLabel} · {fmtHour(c.hour)}</span>
              <span>⏳ Next session {countdown(c.nextSessionAt)}</span>
            </div>
            {c.joined ? (
              <NavLink className="circles-btn-primary circle-cta" to={`/circles/${c.cohortId}`}>
                Open your group →
              </NavLink>
            ) : (
              <button
                className="circles-btn-primary circle-cta"
                onClick={() => join(c.id)}
                disabled={joining === c.id}
              >
                {joining === c.id ? "Joining…" : "Join this Circle"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
