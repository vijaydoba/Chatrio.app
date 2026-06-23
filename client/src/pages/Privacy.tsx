// src/pages/Privacy.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export default function Privacy() {
  return (
    <article className="max-w-[900px] mx-auto py-10 px-5 font-sans leading-loose text-slate-600 dark:text-slate-300">
      <Helmet>
        <title>Privacy Policy – Chatrio Anonymous Chat</title>
        <meta name="description" content="Read Chatrio's privacy policy. We don't store your messages, don't track you, and don't require any personal information to use our anonymous chat service." />
        <link rel="canonical" href="https://chatrio.app/privacy" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Privacy Policy – Chatrio" />
        <meta property="og:url" content="https://chatrio.app/privacy" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      <header className="mb-12 border-b border-slate-200 dark:border-slate-700 pb-8">
        <h1 className="text-4xl md:text-5xl mb-4 font-bold text-slate-900 dark:text-slate-50">
          Privacy Policy
        </h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-[700px]">
          We value your anonymity. This document explains how Chatrio handles
          your data, manages advertisements, and protects your rights.
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-5 italic">
          Last Updated:{" "}
          {new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      <section className="mb-10">
        <p>
          At{" "}
          <strong className="text-slate-900 dark:text-slate-100">
            Chatrio
          </strong>{" "}
          ("we," "our," or "us"), we operate with a fundamental respect for your
          privacy. Unlike social networks that profit from building detailed
          profiles of your life, our goal is to facilitate ephemeral, anonymous
          connections.
        </p>
        <p className="mt-4">
          This Privacy Policy applies to our website (https://chatrio.com) and
          any related services. By accessing or using our Service, you agree to
          the collection and use of information in accordance with this policy.
        </p>
      </section>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        1. Information We Collect
      </h2>
      <p>
        To provide a functional chat service and maintain a safe environment, we
        collect two types of information:
      </p>

      <h3 className="text-xl font-medium mt-6 mb-2 text-slate-800 dark:text-slate-200">
        A. Information You Provide Voluntarily
      </h3>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong className="text-slate-900 dark:text-slate-100">
            Chat Content:
          </strong>{" "}
          Messages and images you send are transmitted via our servers to your
          chat partner. These messages are <em>ephemeral</em>—they are processed
          in Random Access Memory (RAM) to be delivered and are not permanently
          stored in a database once the chat session ends.
        </li>
        <li>
          <strong className="text-slate-900 dark:text-slate-100">
            Report Data:
          </strong>{" "}
          If you report a user for violating our terms, we temporarily store the
          chat logs associated with that specific session to review the
          violation and take moderation action.
        </li>
        <li>
          <strong className="text-slate-900 dark:text-slate-100">
            Support Inquiries:
          </strong>{" "}
          If you contact us via email, we collect your email address and the
          content of your message to respond to your inquiry.
        </li>
      </ul>

      <h3 className="text-xl font-medium mt-6 mb-2 text-slate-800 dark:text-slate-200">
        B. Information Collected Automatically
      </h3>
      <p>
        When you visit Chatrio, our servers and third-party service providers
        automatically collect certain technical data ("Log Data"). This
        includes:
      </p>
      <ul className="list-disc pl-5 mt-2 space-y-2">
        <li>
          <strong className="text-slate-900 dark:text-slate-100">
            IP Address:
          </strong>{" "}
          Used for moderation (banning abusive users) and coarse geolocation
          (country-level) to connect you with nearby users for faster speeds.
        </li>
        <li>
          <strong className="text-slate-900 dark:text-slate-100">
            User-Agent:
          </strong>{" "}
          Browser type, version, and operating system (e.g., Chrome on Windows).
        </li>
        <li>
          <strong className="text-slate-900 dark:text-slate-100">
            Referrer Data:
          </strong>{" "}
          The website you visited before coming to ours.
        </li>
        <li>
          <strong className="text-slate-900 dark:text-slate-100">
            Time Stamps:
          </strong>{" "}
          Date and time of your visit and session duration.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        2. Cookies and Tracking Technologies
      </h2>
      <p>
        We use cookies (small text files stored on your device) to enhance your
        experience. You can instruct your browser to refuse all cookies, but
        some parts of our Service may not function properly without them.
      </p>

      {/* Info Box - Adapted for Light Mode gray */}
      <div className="bg-slate-100 dark:bg-white/5 p-6 rounded-lg my-6 border border-slate-200 dark:border-slate-700">
        <h4 className="mt-0 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Types of Cookies We Use:
        </h4>
        <ul className="mb-0 mt-2 space-y-1 list-disc pl-5">
          <li>
            <strong className="text-slate-700 dark:text-slate-200">
              Essential Cookies:
            </strong>{" "}
            Required for the website to function (e.g., maintaining your chat
            session connection).
          </li>
          <li>
            <strong className="text-slate-700 dark:text-slate-200">
              Preference Cookies:
            </strong>{" "}
            Remember your settings, such as "Dark Mode" or topic preferences.
          </li>
          <li>
            <strong className="text-slate-700 dark:text-slate-200">
              Advertising Cookies:
            </strong>{" "}
            Used by third-party partners (like Google) to show ads relevant to
            you.
          </li>
        </ul>
      </div>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        3. Advertising and Google AdSense
      </h2>
      <p>
        We partner with third-party advertising companies to serve ads when you
        visit our website. This allows us to keep Chatrio free for everyone.
      </p>
      <p className="mt-4">
        <strong className="text-slate-900 dark:text-slate-100">
          Google AdSense & The DoubleClick DART Cookie:
        </strong>
      </p>
      <ul className="list-disc pl-5 mt-2 space-y-2">
        <li>
          Google, as a third-party vendor, uses cookies to serve ads on Chatrio.
        </li>
        <li>
          Google's use of the DART cookie enables it to serve ads to our users
          based on their visit to our site and other sites on the Internet.
        </li>
        <li>
          <strong>Opt-Out:</strong> You may opt-out of the use of the DART
          cookie by visiting the Google Ad and Content Network Privacy Policy at{" "}
          <a
            href="https://policies.google.com/technologies/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 dark:text-sky-400 hover:underline"
          >
            https://policies.google.com/technologies/ads
          </a>
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        4. How We Use Your Information
      </h2>
      <p>We use the collected data for the following specific purposes:</p>
      <ul className="list-disc pl-5 mt-2 space-y-2">
        <li>
          To provide and maintain the Service (connecting you to other users).
        </li>
        <li>To monitor usage trends and improve website performance.</li>
        <li>
          To prevent fraud, spam, and abuse (e.g., blocking IP addresses
          associated with bots).
        </li>
        <li>
          To comply with legal obligations and enforce our Terms of Service.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        5. Data Retention and Security
      </h2>
      <p>
        <strong className="text-slate-900 dark:text-slate-100">
          Ephemeral Messaging:
        </strong>{" "}
        We are a privacy-first platform. We do not retain your private chat
        history. Once a chat is disconnected, the text data is flushed from our
        active memory.
      </p>
      <p className="mt-4">
        <strong className="text-slate-900 dark:text-slate-100">
          Security Measures:
        </strong>{" "}
        We employ industry-standard security measures, including SSL/TLS
        encryption (HTTPS) for all data in transit. However, no method of
        transmission over the Internet is 100% secure. While we strive to
        protect your data, we cannot guarantee its absolute security.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        6. GDPR Rights (For European Users)
      </h2>
      <p>
        If you are located in the European Economic Area (EEA), you have certain
        data protection rights under the General Data Protection Regulation
        (GDPR). Since we do not maintain user accounts, our ability to identify
        you is limited to your IP address.
      </p>
      <p className="mt-4">You have the right to:</p>
      <ul className="list-disc pl-5 mt-2 space-y-2">
        <li>Request access to the personal data we hold about you (if any).</li>
        <li>
          Request deletion of your personal data ("Right to be Forgotten").
        </li>
        <li>Object to the processing of your data.</li>
      </ul>
      <p className="mt-4">
        To exercise these rights, please contact us at chatrioapp@gmail.com.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        7. CCPA/CPRA Privacy Rights (For California Users)
      </h2>
      <p>
        Under the California Consumer Privacy Act (CCPA), California residents
        have the right to:
      </p>
      <ul className="list-disc pl-5 mt-2 space-y-2">
        <li>Know what personal data is being collected about them.</li>
        <li>
          Know whether their personal data is sold or disclosed and to whom.
        </li>
        <li>Say "No" to the sale of personal data.</li>
      </ul>
      <p className="mt-4">
        <strong className="text-slate-900 dark:text-slate-100">
          We do not sell your personal data.
        </strong>{" "}
        However, we work with advertising partners who may collect data via
        cookies as described in Section 3.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        8. Children's Privacy (COPPA)
      </h2>
      <p>
        Our Service is{" "}
        <strong className="text-slate-900 dark:text-slate-100">
          strictly for individuals aged 18 and older
        </strong>
        . We do not knowingly collect personally identifiable information from
        anyone under the age of 18. If we become aware that we have collected
        personal data from a minor without parental consent, we take steps to
        remove that information from our servers immediately.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        9. Links to External Sites
      </h2>
      <p>
        Our Service may contain links to other sites that are not operated by us
        (e.g., in advertisements). If you click on a third-party link, you will
        be directed to that third party's site. We strongly advise you to review
        the Privacy Policy of every site you visit. We have no control over and
        assume no responsibility for the content, privacy policies, or practices
        of any third-party sites.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        10. Changes to This Privacy Policy
      </h2>
      <p>
        We may update our Privacy Policy from time to time. We will notify you
        of any changes by posting the new Privacy Policy on this page and
        updating the "Last Updated" date at the top. You are advised to review
        this Privacy Policy periodically for any changes.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        11. Contact Us
      </h2>
      <p>
        If you have any questions about this Privacy Policy, please contact us:
      </p>
      <ul className="list-none pl-0 mt-4">
        <li>
          <strong className="text-slate-900 dark:text-slate-100">Email:</strong>{" "}
          <a
            href="mailto:chatrioapp@gmail.com"
            className="text-sky-600 dark:text-sky-400 hover:underline"
          >
            chatrioapp@gmail.com
          </a>
        </li>
      </ul>

      <div className="mt-16 pt-5 border-t border-slate-200 dark:border-slate-700">
        <Link
          to="/"
          className="inline-flex items-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 no-underline transition-colors"
        >
          <span className="mr-2">&larr;</span> Back to Home
        </Link>
      </div>
    </article>
  );
}
