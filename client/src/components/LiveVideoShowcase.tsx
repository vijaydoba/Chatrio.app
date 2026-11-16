import React, { useEffect, useRef, useState } from "react";

/**
 * LiveVideoShowcase — the homepage hero's "monkey.app-style" live montage.
 *
 * A stylised but convincing preview of what Chatrio looks like in use: a centre
 * video call that AUTO-SWIPES through several girl+boy matches (so a visitor
 * feels "lots of people are chatting right now"), ringed by floating "online
 * now" avatar bubbles.
 *
 * The centre faces are REAL people from free-license stock footage (Mixkit),
 * looped muted; the bubbles are AI-generated synthetic faces. Both are
 * representative, not real Chatrio users — the whole stage is aria-hidden and
 * names are generic; the real, accessible content (H1 + CTAs) is beside it in
 * Home.tsx. Only the active pair's clips play/download (preload="none"); each
 * tile shows a poster frame until its clip plays (and in environments that
 * can't decode the video, e.g. the prerenderer). Nothing moves until after
 * mount, and all motion is disabled for prefers-reduced-motion / prerender, so
 * hydration stays clean.
 *
 * To change a match: drop <id>.mp4 + <id>-poster.webp in /public/videos and
 * edit the PAIRS array. `posX` nudges the horizontal crop so the face stays in
 * frame (tiles are portrait; clips are landscape).
 */

type Feed = { name: string; flag: string; video: string; poster: string; posX: string; posY?: string };
type Pair = { interests: string; w: Feed; m: Feed };

const PAIRS: Pair[] = [
  {
    interests: "🎮 Gaming · 🎵 Music",
    w: { name: "Camila", flag: "🇧🇷", video: "/videos/p1-w.mp4", poster: "/videos/p1-w-poster.webp", posX: "58%" },
    m: { name: "Leo", flag: "🇺🇸", video: "/videos/p1-m.mp4", poster: "/videos/p1-m-poster.webp", posX: "50%" },
  },
  {
    interests: "🎵 Music · ✈️ Travel",
    w: { name: "Priya", flag: "🇮🇳", video: "/videos/p6-w.mp4", poster: "/videos/p6-w-poster.webp", posX: "50%", posY: "20%" },
    m: { name: "Arjun", flag: "🇮🇳", video: "/videos/p6-m.mp4", poster: "/videos/p6-m-poster.webp", posX: "50%", posY: "12%" },
  },
  {
    interests: "☕ Coffee · ✈️ Travel",
    w: { name: "Elena", flag: "🇪🇸", video: "/videos/p2-w.mp4", poster: "/videos/p2-w-poster.webp", posX: "52%" },
    m: { name: "Lucas", flag: "🇩🇪", video: "/videos/p2-m.mp4", poster: "/videos/p2-m-poster.webp", posX: "50%" },
  },
  {
    interests: "📸 Photography · 🎬 Movies",
    w: { name: "Chloé", flag: "🇫🇷", video: "/videos/p3-w.mp4", poster: "/videos/p3-w-poster.webp", posX: "62%" },
    m: { name: "Kofi", flag: "🇬🇭", video: "/videos/p3-m.mp4", poster: "/videos/p3-m-poster.webp", posX: "38%" },
  },
  {
    interests: "🎮 Gaming · 🎧 Music",
    w: { name: "Mei", flag: "🇸🇬", video: "/videos/p4-w.mp4", poster: "/videos/p4-w-poster.webp", posX: "50%" },
    m: { name: "Mateo", flag: "🇲🇽", video: "/videos/p4-m.mp4", poster: "/videos/p4-m-poster.webp", posX: "50%" },
  },
  {
    interests: "💃 Dancing · 🎵 Music",
    w: { name: "Nina", flag: "🇨🇴", video: "/videos/p5-w.mp4", poster: "/videos/p5-w-poster.webp", posX: "55%" },
    m: { name: "Andre", flag: "🇧🇷", video: "/videos/p5-m.mp4", poster: "/videos/p5-m-poster.webp", posX: "50%" },
  },
];

// Seed call-duration per match (implies each pair "just matched"). Fixed so the
// prerendered HTML matches the client's first render.
const MATCH_SECS = [134, 55, 47, 88, 21, 63];
const SWIPE_MS = 8000; // time on each match
const SPEAK_MS = 2800; // one conversation turn (speaker swaps every SPEAK_MS)

// Floating "online now" bubbles (order maps to .lv-bubble-1..7 positions).
type Person = { id: string; name: string; flag: string };
const CAST: Person[] = [
  { id: "aisha", name: "Aisha", flag: "🇳🇬" },
  { id: "kai", name: "Kai", flag: "🇰🇷" },
  { id: "sofia", name: "Sofia", flag: "🇧🇷" },
  { id: "noah", name: "Noah", flag: "🇬🇧" },
  { id: "emma", name: "Emma", flag: "🇸🇪" },
  { id: "diego", name: "Diego", flag: "🇲🇽" },
  { id: "yuki", name: "Yuki", flag: "🇯🇵" },
];

// One looping webcam clip for a call tile. Muted + loop; the carousel plays only
// the active pair. preload="none" so off-screen matches don't download.
function CallVideo({ feed }: { feed: Feed }) {
  return (
    <video
      className="lv-ava lv-ava-video"
      src={feed.video}
      poster={feed.poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      style={{ objectPosition: `${feed.posX} ${feed.posY ?? "28%"}` }}
    />
  );
}

// An AI-photo bubble face.
function BubbleFace({ id }: { id: string }) {
  return (
    <img
      className="lv-ava"
      src={`/images/people/${id}.webp`}
      alt=""
      aria-hidden="true"
      width={480}
      height={480}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}

function Equalizer() {
  return (
    <span className="lv-eq" aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  );
}

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
  const [idx, setIdx] = useState(0);
  const [secs, setSecs] = useState(MATCH_SECS[0]);
  const [live, setLive] = useState(false); // becomes true after mount (client, motion ok)
  const [speaker, setSpeaker] = useState(0); // 0 = left/woman talking, 1 = right/man talking
  const trackRef = useRef<HTMLDivElement>(null);

  // Go live only client-side and only when motion is welcome, so the prerendered
  // HTML (poster frames, pair 1) matches the first client render.
  useEffect(() => {
    if ((window as any).__PRERENDERING__) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setLive(true);
  }, []);

  // Call timer + auto-swipe through matches + swap who is talking.
  useEffect(() => {
    if (!live) return;
    const tick = window.setInterval(() => setSecs((s) => s + 1), 1000);
    const swipe = window.setInterval(() => setIdx((i) => (i + 1) % PAIRS.length), SWIPE_MS);
    const talk = window.setInterval(() => setSpeaker((s) => (s === 0 ? 1 : 0)), SPEAK_MS);
    return () => { window.clearInterval(tick); window.clearInterval(swipe); window.clearInterval(talk); };
  }, [live]);

  // On a new match: reset the "matched" timer and let the woman greet first.
  useEffect(() => { setSecs(MATCH_SECS[idx] ?? 30); setSpeaker(0); }, [idx]);

  // Turn-taking: in the ACTIVE match, only the current speaker's clip plays (and
  // is marked .is-speaking); the listener is paused + .is-listening (dimmed). Every
  // other match is fully paused — so you never see both people talking at once.
  useEffect(() => {
    if (!live) return;
    const track = trackRef.current;
    if (!track) return;
    Array.from(track.querySelectorAll<HTMLElement>(".lv-slide")).forEach((slide, i) => {
      Array.from(slide.querySelectorAll<HTMLElement>(".lv-feed")).forEach((feed, fi) => {
        const active = i === idx;
        const speaking = active && fi === speaker;
        feed.classList.toggle("is-speaking", speaking);
        feed.classList.toggle("is-listening", active && !speaking);
        const v = feed.querySelector("video");
        if (!v) return;
        if (speaking) {
          v.muted = true;
          const p = v.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } else {
          v.pause();
        }
      });
    });
  }, [idx, speaker, live]);

  const mm = Math.floor(secs / 60);
  const ss = secs % 60;
  const pair = PAIRS[idx];

  return (
    <div className="lv-stage" aria-hidden="true">
      <div className="lv-glow" />

      {/* ── Centre: the live call (auto-swipes through matches) ── */}
      <div className="lv-call lp-anim-pop">
        <div className="lv-call-top">
          <span className="lv-live">
            <span className="lp-live-dot" />
            LIVE
          </span>
          <span className="lv-timer">{pad(mm)}:{pad(ss)}</span>
        </div>

        <div className="lv-feeds">
          <div className="lv-feeds-track" ref={trackRef} style={{ transform: `translateX(-${idx * 100}%)` }}>
            {PAIRS.map((p, i) => (
              <div className="lv-slide" key={i}>
                <div className="lv-feed">
                  <CallVideo feed={p.w} />
                  <span className="lv-feed-dim" aria-hidden="true" />
                  <span className="lv-speak-ring" />
                  <span className="lv-name">
                    <span className="lv-flag">{p.w.flag}</span>{p.w.name}
                    <Equalizer />
                  </span>
                </div>
                <div className="lv-feed">
                  <CallVideo feed={p.m} />
                  <span className="lv-feed-dim" aria-hidden="true" />
                  <span className="lv-speak-ring" />
                  <span className="lv-name">
                    <span className="lv-flag">{p.m.flag}</span>{p.m.name}
                    <Equalizer />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lv-call-bottom">
          <span className="lv-shared">{pair.interests}</span>
          <CallControls />
        </div>

        {/* swipe dots */}
        <div className="lv-dots" aria-hidden="true">
          {PAIRS.map((_, i) => (
            <span key={i} className={`lv-dot${i === idx ? " is-active" : ""}`} />
          ))}
        </div>
      </div>

      {/* ── Floating "online now" bubbles ── */}
      {CAST.map((p, i) => (
        <div key={p.id} className={`lv-bubble lv-bubble-${i + 1}`}>
          <span className="lv-bubble-ava">
            <BubbleFace id={p.id} />
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
