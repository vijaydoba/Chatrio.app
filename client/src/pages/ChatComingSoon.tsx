// src/pages/ChatComingSoon.tsx
import React, { useState } from "react";

export default function ChatComingSoon() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;

    await fetch(
      "https://docs.google.com/forms/d/e/1FAIpQLScRyJ_GAQzqnT609sCQfPI6w4GxZG3Fom6o4JaIwr-qfN5yqw/formResponse",
      {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `entry.1187360114=${encodeURIComponent(email)}`,
      }
    );

    setSubmitted(true);
    setEmail("");
  };

  return (
    <section className="coming">
      <div className="coming-card">
        <div className="coming-badge">🚧 Chat Temporarily Unavailable</div>

        <h1 className="coming-title">We’ll Be Back Soon</h1>

        <p className="coming-lead">
          Chatrio is being built as a platform where strangers can talk,
          connect, and share meaningful conversations.
        </p>

        <p className="coming-lead">
          The chat feature is currently under development. Subscribe to get
          updates when we launch.
        </p>

        {!submitted ? (
          <form className="coming-form" onSubmit={submit}>
            <input
              className="coming-input"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="coming-btn" type="submit">
              Notify Me
            </button>
          </form>
        ) : (
          <div className="coming-success">
            ✅ Thanks! We’ll email you when chat is back.
          </div>
        )}

        <div className="coming-tags">
          <span className="coming-tag">Anonymous Chat</span>
          <span className="coming-tag">Real Conversations</span>
          <span className="coming-tag">Launching Soon</span>
        </div>

        {/* ✅ Contact info (NEW) */}
        <div className="coming-contact">
          <p>
            Questions or suggestions?
            <br />
            Contact us at{" "}
            <a href="mailto:chatrioapp@gmail.com">chatrioapp@gmail.com</a>
          </p>
        </div>
      </div>
    </section>
  );
}
