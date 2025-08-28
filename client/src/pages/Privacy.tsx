// client/src/pages/Privacy.tsx
import React from "react";
export default function Privacy() {
  return (
    <article className="doc">
      <h1>Privacy Policy</h1>
      <p>
        <em>Last updated: {new Date().toLocaleDateString()}</em>
      </p>

      <h2>Overview</h2>
      <p>
        We designed this app to be simple and privacy‑friendly. You can chat
        without creating an account. We do not sell or share your information
        for advertising.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Ephemeral socket data</strong> to connect you with a partner.
        </li>
        <li>
          <strong>Anonymous metrics</strong> (pair counts, message counts) to
          keep the service healthy.
        </li>
        <li>
          <strong>Interests & display name</strong> you choose, stored only in
          memory for matching.
        </li>
      </ul>

      <h2>What we don’t collect</h2>
      <ul>
        <li>No account or email.</li>
        <li>No long‑term message storage or chat export.</li>
        <li>No third‑party advertising trackers.</li>
      </ul>

      <h2>Photo sharing</h2>
      <p>
        Images are sent peer‑to‑peer via our server relay and size‑limited for
        safety. We don’t persist images after delivery.
      </p>

      <h2>Moderation</h2>
      <p>
        “Report &amp; Next” immediately ends the match and moves you to a new
        one. The reported user is returned to idle.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? See <a href="/contact">Contact</a>.
      </p>
    </article>
  );
}
