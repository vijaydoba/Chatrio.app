import React from "react";
import { NavLink } from "react-router-dom";

const features = [
  { icon: "🎭", title: "100% Anonymous", desc: "No account, no email, no profile. Just open and chat instantly." },
  { icon: "⚡", title: "Instant Connect", desc: "Paired with a stranger in seconds. Zero waiting, zero friction." },
  { icon: "🎯", title: "Interest Matching", desc: "Pick topics like gaming, music, or travel to find your kind of person." },
  { icon: "📸", title: "Photo Sharing", desc: "Share images directly in the chat. Easy, instant, no uploads needed." },
  { icon: "🔒", title: "Privacy First", desc: "No messages stored. Your conversations vanish when you leave." },
  { icon: "🌙", title: "Dark Mode", desc: "Comfortable on the eyes, any time of day or night." },
];

const steps = [
  { num: "1", title: "Set your name", desc: "Choose any name you like — or just stay as Stranger." },
  { num: "2", title: "Pick interests", desc: "Optional: select topics to match with someone who gets you." },
  { num: "3", title: "Hit New Chat", desc: "One click and you're live. Meet a new person right now." },
];

export default function Home() {
  return (
    <div className="lp-page">

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-live-badge">
          <span className="lp-live-dot" />
          Live chat · No sign-up needed
        </div>

        <h1 className="lp-headline">
          Chat with strangers.<br />
          <span className="lp-gradient-text">Real talk, right now.</span>
        </h1>

        <p className="lp-sub">
          Anonymous one-on-one chat with smart interest matching.
          Meet someone new in seconds — no account, no history.
        </p>

        <div className="lp-cta-row">
          <NavLink to="/chat" className="lp-btn-primary">
            Start Chatting →
          </NavLink>
          <NavLink to="/blog" className="lp-btn-ghost">
            Read our blog
          </NavLink>
        </div>

        <div className="lp-trust-row">
          <span>✓ No account</span>
          <span>✓ No message logs</span>
          <span>✓ Free forever</span>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-section">
        <h2 className="lp-section-title">How it works</h2>
        <div className="lp-steps-grid">
          {steps.map((s) => (
            <div className="lp-step" key={s.num}>
              <div className="lp-step-num">{s.num}</div>
              <h3 className="lp-step-title">{s.title}</h3>
              <p className="lp-step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-section">
        <h2 className="lp-section-title">Everything you need</h2>
        <div className="lp-features-grid">
          {features.map((f) => (
            <div className="lp-feature-card" key={f.title}>
              <div className="lp-feature-icon">{f.icon}</div>
              <h3 className="lp-feature-title">{f.title}</h3>
              <p className="lp-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="lp-final-cta">
        <div className="lp-cta-logo">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="56" height="56">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6d28d9" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <rect x="2" y="4" width="44" height="30" rx="12" fill="url(#lg)" />
            <path d="M8 34 L4 44 L20 34Z" fill="url(#lg)" />
            <circle cx="14" cy="19" r="3" fill="white" />
            <circle cx="24" cy="19" r="3" fill="white" />
            <circle cx="34" cy="19" r="3" fill="white" />
          </svg>
        </div>
        <h2 className="lp-cta-title">Ready to meet someone new?</h2>
        <p className="lp-cta-sub">No sign-up. No fluff. Just connect.</p>
        <NavLink to="/chat" className="lp-btn-primary">
          Open Chat →
        </NavLink>
      </section>

    </div>
  );
}
