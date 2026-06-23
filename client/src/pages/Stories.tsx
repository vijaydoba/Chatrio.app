import React, { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { NavLink, useParams, useNavigate } from "react-router-dom";
import { STORIES, Story } from "../data/stories";

const CHAR_IMAGES: Record<string, string[]> = {
  girl:   ["/images/image7.png", "/images/image8.png", "/images/image6.png", "/images/image4.png"],
  boy:    ["/images/image2.png", "/images/image3.png", "/images/image5.png"],
  couple: ["/images/image9.png", "/images/image11.png", "/images/image12.png"],
};
function charSrc(character: string, slideIdx: number): string {
  const imgs = CHAR_IMAGES[character] ?? [];
  return imgs[slideIdx % imgs.length] ?? "";
}

/* ── Full-screen Story Page (own URL) ── */
export function StoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const storyIndex = STORIES.findIndex((s) => s.id === id);
  const story = STORIES[storyIndex];

  const [slide, setSlide] = useState(0);

  const goBack = useCallback(() => navigate("/web-stories"), [navigate]);

  const nextStory = useCallback(() => {
    const next = STORIES[storyIndex + 1];
    if (next) navigate(`/web-stories/${next.id}`, { replace: true });
    else goBack();
  }, [storyIndex, navigate, goBack]);

  const next = useCallback(() => {
    if (!story) return;
    if (slide < story.slides.length - 1) setSlide((s) => s + 1);
    else nextStory();
  }, [slide, story, nextStory]);

  const prev = useCallback(() => {
    if (slide > 0) setSlide((s) => s - 1);
    else {
      const prevStory = STORIES[storyIndex - 1];
      if (prevStory) navigate(`/web-stories/${prevStory.id}`, { replace: true });
    }
  }, [slide, storyIndex, navigate]);

  /* Reset slide when story changes */
  useEffect(() => { setSlide(0); }, [id]);

  /* Keyboard navigation */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") goBack();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, goBack]);

  /* Auto-advance */
  useEffect(() => {
    const t = setTimeout(next, 6000);
    return () => clearTimeout(t);
  }, [slide, next]);

  if (!story) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p>Story not found.</p>
        <NavLink to="/web-stories">← Back to Web Stories</NavLink>
      </div>
    );
  }

  const current = story.slides[slide];
  const total = story.slides.length;
  const canonicalUrl = `https://chatrio.app/web-stories/${story.id}`;

  return (
    <div className="story-page-fullscreen">
      <Helmet>
        <title>{story.title} | Chatrio Web Stories</title>
        <meta name="description" content={story.slides[0].heading + " — " + story.slides[0].text.slice(0, 120)} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={story.title} />
        <meta property="og:description" content={story.slides[0].text.slice(0, 160)} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content="https://chatrio.app/branding/chatrio-512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={story.title} />
        <meta name="twitter:description" content={story.slides[0].text.slice(0, 160)} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": story.title,
          "description": story.slides[0].text.slice(0, 160),
          "url": canonicalUrl,
          "author": { "@type": "Organization", "name": "Chatrio" },
          "publisher": {
            "@type": "Organization",
            "name": "Chatrio",
            "url": "https://chatrio.app",
            "logo": { "@type": "ImageObject", "url": "https://chatrio.app/branding/chatrio-512.png" }
          }
        })}</script>
      </Helmet>

      {/* Phone-card: gradient background, constrained width on desktop */}
      <div className="story-card-inner" style={{ background: story.gradient }}>

        {/* Background image overlay */}
        {current.bgImage && (
          <div
            key={`bg-${slide}`}
            className="story-bg-image"
            style={{ backgroundImage: `url(${current.bgImage})` }}
          />
        )}

        {/* Progress bars */}
        <div className="story-progress">
          {story.slides.map((_, i) => (
            <div key={i} className="story-progress-bar">
              <div className={`story-progress-fill ${i < slide ? "done" : i === slide ? "active" : ""}`} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="story-header">
          <div className="story-header-left">
            <div className="story-avatar-sm" style={{ background: story.gradient }}>
              {story.emoji}
            </div>
            <div>
              <div className="story-meta-title">{story.title}</div>
              <div className="story-meta-sub">{story.category} · {story.readTime}</div>
            </div>
          </div>
          <button className="story-close" onClick={goBack} aria-label="Close story">
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        {/* Tap zones */}
        <div className="story-tap-zones">
          <button className="story-tap-prev" onClick={prev} aria-label="Previous" />
          <button className="story-tap-next" onClick={next} aria-label="Next" />
        </div>

        {/* Content */}
        <div className={`story-content story-anim-${current.animation ?? "fade-up"}`}>
          {current.character ? (
            <img
              key={`char-${slide}`}
              src={charSrc(current.character, slide)}
              alt={current.character}
              className="story-character-img"
            />
          ) : (
            <div className="story-slide-emoji" key={`emoji-${slide}`}>{current.emoji}</div>
          )}
          <h1 className="story-slide-heading" key={`heading-${slide}`}>{current.heading}</h1>
          <p className="story-slide-text" key={`text-${slide}`}>{current.text}</p>
          {current.cta && (
            <NavLink
              to={current.cta.href}
              className="story-slide-cta"
              key={`cta-${slide}`}
              onClick={(e) => e.stopPropagation()}
            >
              {current.cta.label}
            </NavLink>
          )}
        </div>

        {/* Footer: counter + next story hint */}
        <div className="story-footer">
          <div className="story-counter">{slide + 1} / {total}</div>
          {storyIndex < STORIES.length - 1 && slide === total - 1 && (
            <div className="story-next-hint">
              Up next: {STORIES[storyIndex + 1].title} →
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

/* ── Story Bubble (links to URL) ── */
function StoryBubble({ story }: { story: Story }) {
  return (
    <NavLink
      to={`/web-stories/${story.id}`}
      className="story-bubble-btn"
      aria-label={`Open story: ${story.title}`}
    >
      <div className="story-bubble-ring">
        <div className="story-bubble-avatar" style={{ background: story.gradient }}>
          <span className="story-bubble-emoji">{story.emoji}</span>
        </div>
      </div>
      <span className="story-bubble-label">{story.shortTitle}</span>
    </NavLink>
  );
}

/* ── Story Card (links to URL) ── */
function StoryCard({ story }: { story: Story }) {
  return (
    <div className="story-card-wrap">
      <NavLink
        to={`/web-stories/${story.id}`}
        className="story-card"
        aria-label={`Read: ${story.title}`}
      >
        <div className="story-card-bg" style={{ background: story.gradient }}>
          <span className="story-card-emoji">{story.emoji}</span>
          <div className="story-card-badge">{story.readTime}</div>
        </div>
        <div className="story-card-body">
          <div className="story-card-cat">{story.category}</div>
          <h3 className="story-card-title">{story.title}</h3>
          <p className="story-card-preview">{story.slides[0].heading}</p>
          <div className="story-card-dots">
            {story.slides.map((_, i) => (
              <span key={i} className="story-card-dot" />
            ))}
          </div>
        </div>
      </NavLink>
      <a
        href={`/web-stories/${story.id}/`}
        className="story-card-amp-link"
        target="_blank"
        rel="noopener noreferrer"
        title="View as Google Web Story"
        onClick={(e) => e.stopPropagation()}
      >
        ⚡ Web Story
      </a>
    </div>
  );
}

/* ── Stories Listing Page ── */
/* Featured photo stories shown first — in bubbles row and grids */
const FEATURED_IDS = [
  "5-signs-youve-found-your-person-online",
  "why-3am-chats-feel-like-magic",
  "how-to-create-instant-attraction-in-chat",
  "the-truth-about-meeting-people-online",
  "first-message-formula-that-gets-replies",
  "is-your-online-crush-real-5-ways-to-know",
  "from-strangers-to-something-real-online",
  "loneliness-cure-nobody-talks-about",
  "the-app-replacing-dating-apps-2026",
  "one-conversation-away-from-everything",
];

/* 7 visible categories — kept in a fixed, curated order */
const VISIBLE_CATEGORIES = [
  "Dating",
  "Romance",
  "Connection",
  "Chat Tips",
  "Mental Health",
  "Safety",
  "Psychology",
];

const orderedStories = [
  ...STORIES.filter((s) => FEATURED_IDS.includes(s.id)),
  ...STORIES.filter((s) => !FEATURED_IDS.includes(s.id)),
];

export default function Stories() {
  const categories = VISIBLE_CATEGORIES.filter((cat) =>
    orderedStories.some((s) => s.category === cat)
  );

  return (
    <div className="stories-page">
      <Helmet>
        <title>Web Stories – Chat Tips, Connection & Wellbeing | Chatrio</title>
        <meta name="description" content="Quick web stories on chat tips, building connections, love languages, online safety, and more. Bite-sized reads on Chatrio." />
        <link rel="canonical" href="https://chatrio.app/web-stories" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Chatrio Web Stories – Chat Tips & Connection" />
        <meta property="og:description" content="Bite-sized web stories on chat tips, love, connection, and digital wellbeing." />
        <meta property="og:url" content="https://chatrio.app/web-stories" />
        <meta property="og:image" content="https://chatrio.app/branding/chatrio-512.png" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "Chatrio Stories",
          "url": "https://chatrio.app/web-stories",
          "itemListElement": orderedStories.map((s, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "url": `https://chatrio.app/web-stories/${s.id}`,
            "name": s.title
          }))
        })}</script>
      </Helmet>

      <section className="stories-hero">
        <h1 className="stories-title">Web Stories</h1>
        <p className="stories-sub">Bite-sized reads on chat, connection, and modern relationships.</p>
      </section>

      {/* Bubbles: show only the 8 featured photo stories */}
      <section className="stories-bubbles-section">
        <div className="stories-bubbles-scroll">
          {orderedStories.slice(0, 8).map((s) => (
            <StoryBubble key={s.id} story={s} />
          ))}
        </div>
      </section>

      {categories.map((cat) => {
        const catStories = orderedStories.filter((s) => s.category === cat);
        return (
          <section key={cat} className="stories-category-section">
            <h2 className="stories-cat-title">{cat}</h2>
            <div className="stories-grid">
              {catStories.map((s) => (
                <StoryCard key={s.id} story={s} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
