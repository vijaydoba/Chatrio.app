import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
        <path d="M8.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM15.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
      </svg>
    ),
    title: "100% Anonymous",
    desc: "No account, no email, no profile. Open and chat instantly with zero identity required.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    title: "Instant Connect",
    desc: "Paired with a stranger in seconds. Zero waiting, zero friction.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    title: "Interest Matching",
    desc: "Pick topics like gaming, music, or travel to find someone who gets you.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
    title: "Photo Sharing",
    desc: "Share images directly in the chat. Easy, instant, no uploads needed.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    ),
    title: "Privacy First",
    desc: "No messages stored. Your conversations vanish the moment you leave.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
      </svg>
    ),
    title: "Dark Mode",
    desc: "Easy on the eyes, any time of day or night. Switches with one tap.",
  },
];

const steps = [
  { num: "01", title: "Set your name", desc: "Choose any name — or stay as Stranger." },
  { num: "02", title: "Pick interests", desc: "Optional topics to match with someone who gets you." },
  { num: "03", title: "Hit New Chat", desc: "One click and you're live with a new person right now." },
];

const faqs = [
  {
    q: "Is Chatrio completely free?",
    a: "Yes — always. Chatrio has no subscription fees, no premium tiers, and no hidden costs. The anonymous chat experience is free for everyone.",
  },
  {
    q: "Do I need to create an account?",
    a: "No account is needed. Visit Chatrio, choose a nickname (or stay as \"Stranger\"), pick your interests, and click New Chat. No email, no password, no profile required.",
  },
  {
    q: "Is my chat history saved anywhere?",
    a: "No. Messages are delivered in real time but never stored on Chatrio's servers. The moment you close the chat, your conversation is gone permanently.",
  },
  {
    q: "How does interest matching work?",
    a: "Pick interests like gaming, music, travel, or fitness. Chatrio pairs you with someone who selected the same or similar topics, so you always have something to talk about.",
  },
  {
    q: "Can I talk to strangers online for free?",
    a: "Yes. Chatrio lets you talk to strangers online free — no sign-up, no app, and no payment. Just set a nickname, pick your interests, and hit New Chat to connect with someone new instantly.",
  },
  {
    q: "Is Chatrio a good Omegle alternative?",
    a: "Chatrio launched as a modern alternative to Omegle, with a cleaner mobile-first interface, interest-based matching, photo sharing, and a stronger commitment to privacy.",
  },
  {
    q: "How does Chatrio handle inappropriate content?",
    a: "Users can report inappropriate behavior with one click. Repeated violations result in bans. Automated filters also detect and block the most harmful content categories.",
  },
  {
    q: "Can I use Chatrio on my phone?",
    a: "Yes. Chatrio is fully responsive and works on any modern smartphone browser — iOS Safari and Android Chrome included. No app download required.",
  },
  {
    q: "What makes Chatrio different from other random chat sites?",
    a: "Three things: instant connections (no waiting rooms), real interest matching (not just random pairing), and genuine privacy (no data stored, no accounts, no tracking).",
  },
  {
    q: "What is Circles?",
    a: "Circles is Chatrio's newest feature — an anonymous local chat to meet people near you. Your location is only ever shared approximately (never exact), you send one intro message before a chat opens, and you can join local group rooms too. No account required.",
  },
  {
    q: "Can I video chat on Chatrio?",
    a: "Yes — two ways. Escalate any text chat to a live video call with one tap using the camera icon, or go straight to Random Video Chat for a match where video starts the instant you're connected. No account needed for either.",
  },
];

export default function Home() {
  // Reveal sections as they scroll into view (the hero animates on load instead).
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".lp-reveal"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="lp-page">
      <Helmet>
        <title>Anonymous Chat – Talk to Strangers Online Free | Chatrio</title>
        <meta name="description" content="Talk to strangers online free on Chatrio — anonymous chat with no sign-up and no app download. Pick your interests and connect with someone new in seconds. Start chatting now." />
        <link rel="canonical" href="https://chatrio.app/" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Chatrio – Free Anonymous Chat with Strangers" />
        <meta property="og:description" content="Chat with strangers anonymously. No sign-up needed. Free, instant, private random chat." />
        <meta property="og:url" content="https://chatrio.app/" />
        <meta property="og:image" content="https://chatrio.app/branding/chatrio-social-card-2026.png" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Chatrio — anonymous chat with strangers. Real talk, right now." />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Chatrio – Free Anonymous Chat with Strangers" />
        <meta name="twitter:description" content="Chat with strangers anonymously. No sign-up needed. Free, instant, private random chat." />
        <meta name="twitter:image" content="https://chatrio.app/branding/chatrio-social-card-2026.png" />
        <meta name="twitter:image:alt" content="Chatrio — anonymous chat with strangers. Real talk, right now." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "How to Chat with Strangers on Chatrio",
          "description": "Start an anonymous chat with a stranger in seconds — no account required.",
          "step": [
            { "@type": "HowToStep", "position": 1, "name": "Set your name", "text": "Choose any name or stay as Stranger — no registration needed." },
            { "@type": "HowToStep", "position": 2, "name": "Pick interests", "text": "Select optional topics like gaming, music, or travel to match with the right person." },
            { "@type": "HowToStep", "position": 3, "name": "Hit New Chat", "text": "Click once and you are live with a new person instantly." }
          ],
          "totalTime": "PT30S",
          "tool": [{ "@type": "HowToTool", "name": "Web browser" }]
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.map(f => ({
            "@type": "Question",
            "name": f.q,
            "acceptedAnswer": { "@type": "Answer", "text": f.a }
          }))
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "@id": "https://chatrio.app/#app",
          "name": "Chatrio",
          "url": "https://chatrio.app/chat",
          "applicationCategory": "CommunicationApplication",
          "operatingSystem": "All",
          "offers": {
            "@type": "Offer",
            "price": 0,
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock"
          },
          "description": "Free anonymous chat app — talk to strangers instantly without signing up."
        })}</script>
      </Helmet>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-live-badge lp-anim-fade-up" style={{ animationDelay: "0ms" }}>
          <span className="lp-live-dot" />
          Live chat · No sign-up needed
        </div>

        <h1 className="lp-headline lp-anim-fade-up" style={{ animationDelay: "80ms" }}>
          Anonymous chat with strangers.<br />
          <span className="lp-gradient-text">Real talk, right now.</span>
        </h1>

        <p className="lp-sub lp-anim-fade-up" style={{ animationDelay: "160ms" }}>
          Talk to strangers online free with smart interest matching.
          Meet someone new in seconds — no account, no history.
        </p>

        <div className="lp-cta-row lp-anim-fade-up" style={{ animationDelay: "240ms" }}>
          <NavLink to="/video-chat" className="lp-btn-video">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            Start Video Chat
          </NavLink>
          <NavLink to="/chat" className="lp-btn-primary">
            Start Chatting
          </NavLink>
          <NavLink to="/circles" className="lp-btn-circles">
            <span className="lp-live-dot" />
            Explore Circles
          </NavLink>
          <a
            href="https://discord.gg/289JDCJtRj"
            className="lp-btn-discord"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join the Chatrio Discord community (opens in a new tab)"
          >
            Join Discord
          </a>
        </div>

        <div className="lp-trust-row lp-anim-fade-up" style={{ animationDelay: "320ms" }}>
          <span>No account</span>
          <span>No message logs</span>
          <span>Free forever</span>
        </div>
      </section>

      {/* ── VIDEO CHAT PROMO ── */}
      <section className="lp-video-promo lp-reveal">
        <div className="lp-video-inner">
          <div className="lp-video-copy">
            <span className="lp-video-tag">
              <span className="lp-live-dot" />
              New on Chatrio
            </span>
            <h2 className="lp-video-title">Now with video chat</h2>
            <p className="lp-video-desc">
              See who you're talking to. Start a text chat and escalate to video anytime
              with one tap, or skip straight to <NavLink to="/video-chat">Random Video Chat</NavLink> for
              a face-to-face match from the very first second — camera on, no waiting.
            </p>
            <ul className="lp-video-list">
              <li>Start with text, add video anytime — either side can invite</li>
              <li>Or jump straight into Random Video Chat, matched instantly</li>
              <li>Mute, camera toggle, and instant end — you're always in control</li>
            </ul>
            <div className="lp-video-cta-row">
              <NavLink to="/video-chat" className="lp-btn-primary">
                Try Video Chat
              </NavLink>
              <NavLink to="/chat" className="lp-btn-ghost">
                Start with text instead
              </NavLink>
            </div>
          </div>
          <div className="lp-video-visual" aria-hidden="true">
            <div className="lp-video-ring lp-video-ring-1" />
            <div className="lp-video-ring lp-video-ring-2" />
            <div className="lp-video-center">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ── CIRCLES PROMO ── */}
      <section className="lp-circles-promo lp-reveal">
        <div className="lp-circles-inner">
          <div className="lp-circles-copy">
            <span className="lp-circles-tag">
              <span className="lp-live-dot" />
              New on Chatrio
            </span>
            <h2 className="lp-circles-title">Circles — meet people near you</h2>
            <p className="lp-circles-desc">
              Our newest way to connect: anonymous local chat. See who's nearby, send
              one intro message, or join a local group room — all without an account
              or your exact location.
            </p>
            <ul className="lp-circles-list">
              <li>Approximate location only — never exact</li>
              <li>One intro message, no spam DMs</li>
              <li>Local group rooms to meet more people at once</li>
            </ul>
            <NavLink to="/circles" className="lp-btn-primary">
              Explore Circles
            </NavLink>
          </div>
          <div className="lp-circles-radar" aria-hidden="true">
            <div className="lp-radar-ring lp-radar-ring-1" />
            <div className="lp-radar-ring lp-radar-ring-2" />
            <div className="lp-radar-ring lp-radar-ring-3" />
            <div className="lp-radar-center" />
            <span className="lp-radar-blip" style={{ top: "18%", left: "68%" }} />
            <span className="lp-radar-blip" style={{ top: "62%", left: "22%", animationDelay: ".6s" }} />
            <span className="lp-radar-blip" style={{ top: "72%", left: "68%", animationDelay: "1.2s" }} />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-section">
        <h2 className="lp-section-title lp-reveal">How it works</h2>
        <div className="lp-steps-grid">
          {steps.map((s, i) => (
            <div className="lp-step lp-reveal" key={s.num} style={{ ["--reveal-delay" as any]: `${i * 80}ms` }}>
              <div className="lp-step-num">{s.num}</div>
              <h3 className="lp-step-title">{s.title}</h3>
              <p className="lp-step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-section">
        <h2 className="lp-section-title lp-reveal">Everything you need</h2>
        <div className="lp-features-grid">
          {features.map((f, i) => (
            <div className="lp-feature-card lp-reveal" key={f.title} style={{ ["--reveal-delay" as any]: `${i * 60}ms` }}>
              <div className="lp-feature-icon">{f.icon}</div>
              <h3 className="lp-feature-title">{f.title}</h3>
              <p className="lp-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY ANONYMOUS CHAT ── */}
      <section className="lp-narrative lp-reveal">
        <div className="lp-narrative-inner">
          <h2>Why anonymous chat?</h2>
          <p>
            There's something freeing about talking to someone who doesn't know you. No
            social pressure, no curated persona, no history to carry. Anonymous chat lets
            you be direct, curious, or vulnerable in ways that feel harder with people
            already in your life.
          </p>
          <p>
            Chatrio was built around that idea. Every conversation starts fresh. The
            person you're matched with shares at least one interest with you — but nothing
            else about you is shared or stored. When the chat ends, it's gone. No logs,
            no screenshots saved server-side, no profile to look up later.
          </p>
          <p>
            Interest matching changes the dynamic significantly. Instead of an opening
            message into the void, you start with common ground: gaming, music, travel,
            fitness, or dozens of other topics. That one shared thread is enough to turn
            a random connection into a real conversation.
          </p>
          <p>
            Chatrio works in your browser on any device — no download, no sign-up, no
            waiting. Just pick a name (or stay as Stranger), choose your interests, and
            you're live within seconds.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="lp-faq lp-reveal">
        <h2 className="lp-section-title">Frequently asked questions</h2>
        <div className="lp-faq-grid">
          {faqs.map((item) => (
            <div className="lp-faq-item" key={item.q}>
              <p className="lp-faq-q">{item.q}</p>
              <p className="lp-faq-a">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="lp-final-cta lp-reveal">
        <div className="lp-cta-logo">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="52" height="52">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6d28d9" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <rect x="2" y="4" width="44" height="30" rx="12" fill="url(#lg)" />
            <path d="M8 34 L4 44 L20 34Z" fill="url(#lg)" />
            <circle cx="14" cy="19" r="3" fill="white" />
            <circle cx="24" cy="19" r="3" fill="white" />
            <circle cx="34" cy="19" r="3" fill="white" />
          </svg>
        </div>
        <h2 className="lp-cta-title">Ready to meet someone new?</h2>
        <p className="lp-cta-sub">No sign-up. No fluff. Just connect.</p>
        <NavLink to="/chat" className="lp-btn-primary">
          Open Chat
        </NavLink>
      </section>

    </div>
  );
}
