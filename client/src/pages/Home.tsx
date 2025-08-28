import { NavLink } from "react-router-dom";
import React from "react";

export default function Home() {
  return (
    <div className="landing">
      <section className="hero" aria-label="Chatrio hero">
        <h1>Welcome to Chatrio — meet strangers, chat instantly.</h1>

        <p className="lead">
          One-click anonymous chat with smart interest matching, photo sharing,
          and a fast, privacy-first design.
        </p>

        <div className="hero-actions">
          <NavLink to="/chat" className="btn btn-primary btn-lg">
            Start Chatting
          </NavLink>
          <NavLink to="/about" className="btn btn-lg">
            Learn More
          </NavLink>
        </div>

        <div className="badges" aria-label="Highlights">
          <span className="badge">No sign-up</span>
          <span className="badge">Interest matching</span>
          <span className="badge">Photo sharing</span>
          <span className="badge">Privacy-first</span>
        </div>

        <div className="cards" aria-label="Key features">
          <div className="card">
            <h3>Instant Match</h3>
            <p>
              Click <em>New Chat</em> and you’re paired in seconds.
            </p>
          </div>
          <div className="card">
            <h3>Smart Interests</h3>
            <p>Choose topics to find someone into the same things.</p>
          </div>
          <div className="card">
            <h3>Simple & Clean</h3>
            <p>No accounts, no clutter — just a modern chat experience.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
