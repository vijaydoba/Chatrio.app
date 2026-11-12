import { Helmet } from "react-helmet-async";
import { NavLink } from "react-router-dom";

const AUTHOR_URL = "https://chatrio.app/author/kathrin-vogel";

// A few representative, verified-live posts to surface on the author page.
const RECENT = [
  { slug: "the-truth-about-anonymous-chat-with-strangers", title: "What Most People Get Wrong About Anonymous Chat With Strangers" },
  { slug: "monkey-app-alternatives-2026", title: "Best Monkey App Alternatives in 2026 (Free, No Download)" },
  { slug: "why-omegle-shut-down-and-what-to-use-instead", title: "Why Omegle Shut Down — and What to Use Instead" },
  { slug: "online-friendships-are-real-friendships-heres-the-proof", title: "Online Friendships Are Real Friendships — Here's the Proof" },
];

export default function AuthorKathrinVogel() {
  return (
    <article className="doc" style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <Helmet>
        <title>Kathrin Vogel — Writer &amp; Editor at Chatrio</title>
        <meta name="description" content="Kathrin Vogel writes and edits Chatrio's guides on anonymous chat, online safety, and digital connection — grounded in first-hand experience running the platform." />
        <link rel="canonical" href={AUTHOR_URL} />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content="Kathrin Vogel — Writer & Editor at Chatrio" />
        <meta property="og:description" content="Writer and editor at Chatrio, covering anonymous chat, online safety, and digital connection." />
        <meta property="og:url" content={AUTHOR_URL} />
        <meta property="og:image" content="https://chatrio.app/branding/chatrio-social-card-2026.png" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Kathrin Vogel — Writer & Editor at Chatrio" />
        <meta name="twitter:description" content="Writer and editor at Chatrio, covering anonymous chat, online safety, and digital connection." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          "url": AUTHOR_URL,
          "mainEntity": {
            "@type": "Person",
            "@id": `${AUTHOR_URL}#person`,
            "name": "Kathrin Vogel",
            "url": AUTHOR_URL,
            "jobTitle": "Writer & Editor",
            "worksFor": { "@type": "Organization", "name": "Chatrio", "url": "https://chatrio.app" },
            "knowsAbout": ["anonymous chat", "online safety", "talking to strangers online", "digital connection", "Omegle alternatives"],
            "description": "Kathrin Vogel writes and edits Chatrio's guides on anonymous chat, online safety, and digital connection, grounded in first-hand experience building and running the platform since 2025."
          }
        })}</script>
      </Helmet>

      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
        <div
          aria-hidden="true"
          style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#06b6d4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, flex: "0 0 auto" }}
        >
          K
        </div>
        <div>
          <h1 style={{ margin: 0 }}>Kathrin Vogel</h1>
          <p style={{ margin: "4px 0 0", opacity: 0.75 }}>Writer &amp; Editor at Chatrio</p>
        </div>
      </div>

      <p className="lead">
        Kathrin Vogel writes and edits Chatrio's guides on anonymous chat, online
        safety, and digital connection. She covers how people actually meet and
        talk to strangers online — what makes a conversation click, how to stay
        safe, and how anonymous chat fits into modern friendship and dating.
      </p>

      <p>
        Her writing is grounded in first-hand experience building and running
        Chatrio since 2025 — a free, anonymous, no-sign-up chat platform — rather
        than in abstract theory. That operator's view shapes the guides here:
        they're written by people who watch how strangers actually connect (and
        where it goes wrong) every day, not by outside observers.
      </p>

      <h2>What Kathrin writes about</h2>
      <ul>
        <li><strong>Anonymous chat &amp; talking to strangers</strong> — how it works, why people open up, and how to get more out of it.</li>
        <li><strong>Online safety</strong> — practical, no-panic guidance on staying safe in random and anonymous chat.</li>
        <li><strong>Omegle &amp; Monkey alternatives</strong> — honest comparisons of the modern random-chat landscape.</li>
        <li><strong>Digital connection</strong> — online friendship, loneliness, and the psychology of meeting people online.</li>
      </ul>

      <h2>Recent articles</h2>
      <ul>
        {RECENT.map((p) => (
          <li key={p.slug}>
            <NavLink to={`/blog/${p.slug}`}>{p.title}</NavLink>
          </li>
        ))}
      </ul>
      <p>
        <NavLink to="/blog">See all of Kathrin's articles →</NavLink>
      </p>

      <h2>Editorial approach</h2>
      <p>
        Every article is written and reviewed against Chatrio's{" "}
        <NavLink to="/editorial-standards">editorial standards</NavLink>, so you
        know how the guidance here is researched and kept accurate. Questions or a
        correction? <NavLink to="/contact">Get in touch</NavLink>.
      </p>
    </article>
  );
}
