// client/src/pages/Contact.tsx
import React from "react";
export default function Contact() {
  return (
    <article className="doc">
      <h1>Contact</h1>
      <p>
        Have a question or need to report an issue? Email us at
        <a href="mailto:chatrioapp@gmail.com"> chatrioapp@gmail.com</a>.
      </p>

      <h2>Safety tips</h2>
      <ul>
        <li>Don’t share personal or financial information.</li>
        <li>Use “Report &amp; Next” if a chat feels unsafe.</li>
        <li>Be respectful and follow local laws.</li>
      </ul>
    </article>
  );
}
