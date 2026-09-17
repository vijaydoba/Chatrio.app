// src/pages/CirclesApp.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import "./circles-app.css";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=app.chatrio.circles";

function PlayStoreButton() {
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Get Chatrio Circles on Google Play"
      className="ca-play-btn"
    >
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <path d="M3.6 2.2c-.4.3-.6.8-.6 1.4v17c0 .6.2 1.1.6 1.4l9.4-9.9-9.4-9.9z" fill="#00D2FF" />
        <path d="M17 9.4l-3.4-2-4.5-2.6 8.6 8.7 3.3-1.9c.9-.5.9-1.7 0-2.2L17 9.4z" fill="#00F076" />
        <path d="M13.6 12.5L4.6 21.4c.3.1.7.1 1.1-.1l8.9-5.1-1-1.7z" fill="#FF3A44" />
        <path d="M13.6 11.5l1-1.7-8.9-5.1c-.4-.2-.8-.2-1.1-.1l8.9 8.9z" fill="#FFCF00" />
      </svg>
      <span className="ca-play-btn-label">
        <span className="ca-play-btn-eyebrow">GET IT ON</span>
        <span className="ca-play-btn-name">Google Play</span>
      </span>
    </a>
  );
}

export default function CirclesApp() {
  return (
    <article className="ca-page">
      <Helmet>
        <title>Chatrio Circles for Android – Download on Google Play</title>
        <meta
          name="description"
          content="Get Chatrio Circles on Android: anonymous nearby chat with real push notifications for replies. Free, 18+, no sign-up. Download on Google Play."
        />
        <link rel="canonical" href="https://chatrio.app/circles/app" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Chatrio Circles for Android – Download on Google Play" />
        <meta
          property="og:description"
          content="Anonymous nearby chat with real push notifications for replies. Free, 18+, no sign-up. Download Chatrio Circles on Google Play."
        />
        <meta property="og:url" content="https://chatrio.app/circles/app" />
        <meta property="og:image" content="https://chatrio.app/images/circles-app-icon.png" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="192" />
        <meta property="og:image:height" content="192" />
        <meta property="og:image:alt" content="Chatrio Circles app icon" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Chatrio Circles for Android – Download on Google Play" />
        <meta
          name="twitter:description"
          content="Anonymous nearby chat with real push notifications for replies. Free, 18+, no sign-up."
        />
        <meta name="twitter:image" content="https://chatrio.app/images/circles-app-icon.png" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <header className="ca-hero">
        <picture>
          <source type="image/webp" srcSet="/images/circles-app-icon.webp" />
          <img
            className="ca-icon"
            src="/images/circles-app-icon.png"
            alt="Chatrio Circles app icon"
            width={96}
            height={96}
          />
        </picture>
        <div>
          <h1>Chatrio Circles, now on Android</h1>
          <p>
            The same anonymous nearby chat you know from the browser — plus real
            push notifications, so you actually know when someone replies.
          </p>
          <PlayStoreButton />
        </div>
      </header>

      <section className="ca-features">
        <div>
          <h2>Nearby, not everywhere</h2>
          <p>See who's around your approximate area — never an exact pin.</p>
        </div>
        <div>
          <h2>Real push notifications</h2>
          <p>Get notified the moment someone replies, even with the app closed.</p>
        </div>
        <div>
          <h2>No sign-up required</h2>
          <p>Pick a nickname and go. No email, no phone number, 18+.</p>
        </div>
      </section>

      <section>
        <h2 className="ca-shots-title">A look inside the app</h2>
        <div className="ca-shots">
          {[
            { file: "circles-app-shot-onboarding", alt: "Chatrio Circles onboarding screen" },
            { file: "circles-app-shot-nearby", alt: "Chatrio Circles nearby map" },
            { file: "circles-app-shot-cards", alt: "Chatrio Circles swipe cards" },
            { file: "circles-app-shot-chats", alt: "Chatrio Circles chat thread" },
          ].map((shot) => (
            <picture key={shot.file}>
              <source type="image/webp" srcSet={`/images/${shot.file}.webp`} />
              <img
                src={`/images/${shot.file}.png`}
                alt={shot.alt}
                width={180}
                height={320}
                loading="lazy"
              />
            </picture>
          ))}
        </div>
      </section>

      <section className="ca-cta">
        <PlayStoreButton />
        <p className="ca-cta-note">Free · 18+ · Android only, for now</p>
      </section>

      <div className="ca-back">
        <Link to="/circles">&larr; Prefer the browser? Use Circles on the web</Link>
      </div>
    </article>
  );
}
