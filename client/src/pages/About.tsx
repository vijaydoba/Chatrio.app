// client/src/pages/About.tsx
import React from "react";
export default function About() {
  return (
    <article className="doc">
      <h1>About</h1>
      <p>
        This is a simple, privacy‑first random chat app. It pairs you with a
        stranger using interests you select, supports photos with size limits,
        and includes basic moderation.
      </p>

      <h2>Features</h2>
      <ul>
        <li>Instant pairing with interest matching</li>
        <li>Typing indicator and delivery ticks</li>
        <li>Light/Dark theme + sound toggle</li>
        <li>Photo sharing with client‑side compression</li>
        <li>Report &amp; Next to leave unsafe chats</li>
      </ul>

      <h2>Roadmap</h2>
      <ul>
        <li>Optional PWA offline shell</li>
        <li>Localized UI strings</li>
        <li>Better on‑mobile keyboard handling</li>
      </ul>
    </article>
  );
}
