// client/src/pages/Terms.tsx
import React from "react";
export default function Terms() {
  return (
    <article className="doc">
      <h1>Terms of Service</h1>
      <p>
        <em>Last updated: {new Date().toLocaleDateString()}</em>
      </p>

      <h2>Use of Service</h2>
      <p>
        You may use this app for lawful, personal communication only. You must
        be at least the age of majority in your jurisdiction to use it.
      </p>

      <h2>Acceptable Use</h2>
      <ul>
        <li>No harassment, hate speech, or illegal content.</li>
        <li>No spam or automated messaging.</li>
        <li>
          No sharing of personal or sensitive data you don’t want others to see.
        </li>
      </ul>

      <h2>Disclaimers</h2>
      <p>
        This service is provided “as is” without warranties. We are not
        responsible for user‑generated content.
      </p>

      <h2>Termination</h2>
      <p>
        We reserve the right to terminate access for abuse or violations without
        notice.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these Terms. Continued use signifies acceptance of the
        updated Terms.
      </p>
    </article>
  );
}
