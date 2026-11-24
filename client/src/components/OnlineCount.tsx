import React, { useEffect, useState } from "react";

// ── Shared "online now" social-proof counter ────────────────────────────────
// Used on the homepage hero, the text-chat lobby, and the video-chat lobby so
// all three stay in sync. This is an *illustrative* figure, not a precise
// reading: Chatrio's random-chat backend doesn't expose a live global presence
// count to these pages, so the number seeds from the time of day (quieter
// overnight, busier in the evening) and drifts with a gentle random walk. It
// never claims an exact real number.
//
// IMPORTANT: the first render must be byte-identical on the prerender capture
// and the client's first hydration, or React throws #418 on these prerendered
// pages (see deploy-hydration-418 history). Two rules enforce that:
//   1. start from a fixed seed — no Date/Math.random at initial render time;
//   2. format digits with a hand-rolled separator, never toLocaleString, whose
//      output can differ between the Node prerender and a browser locale.
// The time-of-day base and drift only start inside useEffect, after hydration.
const ONLINE_SEED = 1200;

// Deterministic thousands separator (always a comma) — safe across environments.
export function formatCount(n: number) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function useOnlineCount() {
  const [count, setCount] = useState(ONLINE_SEED);

  useEffect(() => {
    // Smooth daily curve: trough ~8am, peak ~8pm. Range ≈ 480–1,980.
    const baseFor = (date: Date) => {
      const hour = date.getHours() + date.getMinutes() / 60;
      const phase = (((hour - 20 + 24) % 24) / 24) * 2 * Math.PI;
      const curve = (Math.cos(phase) + 1) / 2; // 1 at 20:00, 0 at 08:00
      return 480 + curve * 1500;
    };

    let current = baseFor(new Date()) + (Math.random() - 0.5) * 60;
    setCount(current);

    const id = window.setInterval(() => {
      const base = baseFor(new Date());
      // Gentle random walk, nudged back toward the time-of-day base so it never
      // wanders off, and clamped to a believable band around it.
      current += (Math.random() - 0.5) * 12 + (base - current) * 0.04;
      current = Math.max(base - 90, Math.min(base + 90, current));
      setCount(current);
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  return Math.round(count);
}

// Self-contained "online now" pill for lobby / landing screens. The homepage
// hero renders its own copy inline (it folds the count into an existing badge),
// so this component is for the Chat and Video Chat lobbies.
export function OnlineNowBadge({ className }: { className?: string }) {
  const online = useOnlineCount();
  return (
    <span className={`online-now-badge${className ? ` ${className}` : ""}`} aria-live="polite">
      <span className="online-now-dot" aria-hidden="true" />
      <span className="online-now-count">{formatCount(online)}</span>
      &nbsp;online now
    </span>
  );
}
