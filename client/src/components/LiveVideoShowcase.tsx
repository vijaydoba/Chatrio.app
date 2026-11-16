import React, { useEffect, useRef, useState } from "react";

/**
 * LiveVideoShowcase — the homepage hero's "monkey.app-style" live montage.
 *
 * A stylised but convincing preview of what a Chatrio match looks like: a
 * centre split-screen video call between two people (a girl and a boy),
 * ringed by floating "online now" avatar bubbles so the page feels busy and
 * alive — the single biggest driver of curiosity-clicks on apps like this.
 *
 * The faces are PHOTOREALISTIC but AI-GENERATED (synthetic people — nobody
 * real), produced via the repo's free Pollinations pipeline and baked into
 * /public/images/people as small WebP. There are no rights/privacy issues and
 * no real user is depicted. It is deliberately a *representation* of the
 * experience, so the whole stage is aria-hidden and the names are generic; the
 * real, accessible content (the H1 and CTAs) lives beside it in Home.tsx. The
 * only JS is a cosmetic call timer that ticks up after mount — seeded to a
 * fixed value, and paused during prerender, so hydration stays clean. All
 * motion is CSS and respects prefers-reduced-motion.
 *
 * To swap in different people: drop a square <id>.webp into
 * /public/images/people and point a cast entry's `id` at it.
 */

type Person = { id: string; name: string; flag: string };

// Centre call: a girl + a boy.
const MAYA: Person = { id: "maya", name: "Maya", flag: "🇮🇳" };
const LEO: Person = { id: "leo", name: "Leo", flag: "🇺🇸" };

// Floating "online now" bubbles (order maps to .lv-bubble-1..7 positions).
const CAST: Person[] = [
  { id: "aisha", name: "Aisha", flag: "🇳🇬" },
  { id: "kai", name: "Kai", flag: "🇰🇷" },
  { id: "sofia", name: "Sofia", flag: "🇧🇷" },
  { id: "noah", name: "Noah", flag: "🇬🇧" },
  { id: "emma", name: "Emma", flag: "🇸🇪" },
  { id: "diego", name: "Diego", flag: "🇲🇽" },
  { id: "yuki", name: "Yuki", flag: "🇯🇵" },
];

// A single face, filling its tile/bubble like a webcam feed.
function CallAvatar({ p, eager }: { p: Person; eager?: boolean }) {
  return (
    <img
      className="lv-ava"
      src={`/images/people/${p.id}.webp`}
      alt=""
      aria-hidden="true"
      width={480}
      height={480}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
    />
  );
}

// Speaking indicator (animated audio bars).
function Equalizer() {
  return (
    <span className="lv-eq" aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  );
}

// Call controls (mic / camera / end).
function CallControls() {
  return (
    <div className="lv-controls" aria-hidden="true">
      <span className="lv-ctrl">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
        </svg>
      </span>
      <span className="lv-ctrl">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      </span>
      <span className="lv-ctrl lv-ctrl-end">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92A3 3 0 0 1 19 20 17 17 0 0 1 4 5 3 3 0 0 1 7.08 2l1.9 4.2-2 1.6a12 12 0 0 0 5.2 5.2l1.6-2L22 14.9Z" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </svg>
      </span>
    </div>
  );
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export default function LiveVideoShowcase() {
  // Cosmetic call timer. Seeded to a fixed value so the prerendered HTML and the
  // first client render match (no hydration warning); only starts ticking after
  // mount, and pauses for reduced-motion users / during prerender.
  const SEED = 134; // 02:14
  const [secs, setSecs] = useState(SEED);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if ((window as any).__PRERENDERING__) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setSecs((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const mm = Math.floor(secs / 60);
  const ss = secs % 60;

  return (
    <div className="lv-stage" aria-hidden="true">
      <div className="lv-glow" />

      {/* ── Centre: the live two-person call ── */}
      <div className="lv-call lp-anim-pop">
        <div className="lv-call-top">
          <span className="lv-live">
            <span className="lp-live-dot" />
            LIVE
          </span>
          <span className="lv-timer">{pad(mm)}:{pad(ss)}</span>
        </div>

        <div className="lv-feeds">
          <div className="lv-feed">
            <CallAvatar p={MAYA} eager />
            <span className="lv-speak-ring lv-speak-a" />
            <span className="lv-name">
              <span className="lv-flag">{MAYA.flag}</span>{MAYA.name}
              <Equalizer />
            </span>
          </div>
          <div className="lv-feed">
            <CallAvatar p={LEO} eager />
            <span className="lv-speak-ring lv-speak-b" />
            <span className="lv-name">
              <span className="lv-flag">{LEO.flag}</span>{LEO.name}
            </span>
          </div>
        </div>

        <div className="lv-call-bottom">
          <span className="lv-shared">🎮 Gaming · 🎵 Music</span>
          <CallControls />
        </div>
      </div>

      {/* ── Floating "online now" bubbles ── */}
      {CAST.map((p, i) => (
        <div key={p.id} className={`lv-bubble lv-bubble-${i + 1}`}>
          <span className="lv-bubble-ava">
            <CallAvatar p={p} />
            <span className="lv-bubble-dot" />
          </span>
          <span className="lv-bubble-name">
            <span className="lv-flag">{p.flag}</span>{p.name}
          </span>
        </div>
      ))}
    </div>
  );
}
