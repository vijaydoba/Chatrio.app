// src/pages/ChildSafety.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export default function ChildSafety() {
  return (
    <article className="max-w-[900px] mx-auto py-10 px-5 font-sans leading-loose text-slate-600 dark:text-slate-300">
      <Helmet>
        <title>Child Safety Standards – Chatrio Circles</title>
        <meta name="description" content="How Chatrio Circles protects minors and prevents child sexual abuse and exploitation (CSAE): age requirements, reporting and blocking, and moderator review." />
        <link rel="canonical" href="https://chatrio.app/child-safety" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Child Safety Standards – Chatrio Circles" />
        <meta property="og:url" content="https://chatrio.app/child-safety" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      <header className="mb-12 border-b border-slate-200 dark:border-slate-700 pb-8">
        <h1 className="text-4xl md:text-5xl mb-4 font-bold text-slate-900 dark:text-slate-50">
          Child Safety Standards
        </h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-[700px]">
          Chatrio Circles ("Circles") is committed to protecting minors and
          preventing child sexual abuse and exploitation (CSAE) on our
          platform. This page describes the standards, tools, and practices we
          maintain.
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

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        1. Age Requirements
      </h2>
      <p>
        Circles requires all users to self-certify that they are{" "}
        <strong className="text-slate-900 dark:text-slate-100">
          18 years of age or older
        </strong>{" "}
        before using the app. This confirmation is required during onboarding
        and is enforced server-side before any location-based feature is
        enabled.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        2. Reporting and Blocking
      </h2>
      <p>
        Any user can report and block another user directly from within a
        chat, in a single action. Reporting a user automatically blocks
        them — they immediately disappear from that user's nearby list,
        direct messages, and group chats, and cannot contact them again.
        Users can review a full list of blocked accounts at any time and
        unblock them if they choose.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        3. Moderator Review
      </h2>
      <p>
        Every report is logged and reviewed by our moderation team through an
        internal admin dashboard, which flags repeat offenders and allows
        moderators to permanently ban an account — independent of individual
        user blocks.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        4. Privacy-First Design
      </h2>
      <p>
        Circles never displays a user's exact location. Positions shown to
        other users are fuzzed to an approximate area (roughly 2.2km),
        reducing the risk of real-world location tracking.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        5. Reporting Child Sexual Abuse Material (CSAM)
      </h2>
      <p>
        If you encounter content or behavior on Circles that you believe
        involves the exploitation of a minor, report it immediately using the
        in-app report tool, or contact us directly at{" "}
        <a
          href="mailto:vijay83061@gmail.com"
          className="text-sky-600 dark:text-sky-400 hover:underline"
        >
          vijay83061@gmail.com
        </a>
        . All such reports are treated with the highest priority.
      </p>

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
