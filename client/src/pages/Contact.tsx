// client/src/pages/Contact.tsx
import React from "react";
import { Helmet } from "react-helmet-async";

export default function Contact() {
  return (
    <article className="doc max-w-[800px] mx-auto py-10 px-5 font-sans leading-loose text-slate-700 dark:text-slate-300">
      <Helmet>
        <title>Contact Chatrio – Get Help & Support</title>
        <meta name="description" content="Contact the Chatrio team for support, feedback, privacy requests, or partnership enquiries. We respond within 24–48 hours." />
        <link rel="canonical" href="https://chatrio.app/contact" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Contact Chatrio – Get Help & Support" />
        <meta property="og:description" content="Reach out to the Chatrio team for support, feedback, or partnership enquiries." />
        <meta property="og:url" content="https://chatrio.app/contact" />
        <meta property="og:image" content="https://chatrio.app/branding/chatrio-512.png" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Contact Chatrio" />
        <meta name="twitter:description" content="Reach out to the Chatrio team for support or feedback." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "url": "https://chatrio.app/contact",
          "name": "Contact Chatrio",
          "description": "Contact the Chatrio support team.",
          "publisher": { "@type": "Organization", "name": "Chatrio", "url": "https://chatrio.app" }
        })}</script>
      </Helmet>
      <header className="mb-10 border-b border-slate-200 dark:border-slate-700 pb-5">
        <h1 className="text-4xl mb-2 font-bold text-slate-900 dark:text-slate-50">
          Contact Us
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400">
          We are here to help with any questions or concerns.
        </p>
      </header>

      <section className="mb-10">
        <p>
          We value your feedback and are here to assist with any inquiries
          regarding our service, privacy practices, or partnership
          opportunities.
        </p>
      </section>

      <h2 className="text-2xl font-semibold mt-8 mb-4 text-slate-800 dark:text-slate-100">
        General Inquiries
      </h2>
      <p>
        For general questions, bug reports, or feature requests, please email us
        directly:
      </p>

      {/* Email Box - Switches from Light Gray (Light Mode) to Translucent (Dark Mode) */}
      <div className="inline-block mt-4 p-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-white/5">
        <strong className="text-slate-800 dark:text-slate-100">Email:</strong>{" "}
        <a
          href="mailto:chatrioapp@gmail.com"
          className="ml-2 text-lg no-underline font-medium text-sky-600 dark:text-sky-400 hover:underline"
        >
          chatrioapp@gmail.com
        </a>
      </div>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-800 dark:text-slate-100">
        Legal & Privacy
      </h2>
      <p>
        If you have concerns regarding data privacy, DMCA takedown requests, or
        wish to exercise your GDPR/CCPA rights, please include{" "}
        <strong>"Privacy Request"</strong> or <strong>"Legal"</strong> in the
        subject line of your email to ensure a faster response.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-800 dark:text-slate-100">
        Response Time
      </h2>
      <p>
        We are a small team, but we strive to respond to all legitimate
        inquiries within <strong>24-48 hours</strong>.
      </p>
    </article>
  );
}
