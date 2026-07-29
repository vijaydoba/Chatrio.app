import React, { useEffect, useMemo, useState } from "react";
import { useParams, NavLink, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { POSTS, Post, POST_REDIRECTS } from "../data/posts";
import { getPostKeywords, relatedPostScore } from "../data/blog-topics";

function readingTime(html: string): number {
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function seoTitle(title: string): string {
  const SUFFIX = " | Chatrio";
  const MAX_TOTAL_LENGTH = 60;
  if ((title + SUFFIX).length <= MAX_TOTAL_LENGTH) return title + SUFFIX;

  const available = MAX_TOTAL_LENGTH - SUFFIX.length - 1;
  const cut = title.slice(0, available).trimEnd();
  const lastSpace = cut.lastIndexOf(" ");
  const short = lastSpace > available * 0.6 ? cut.slice(0, lastSpace) : cut;
  return short + "…" + SUFFIX;
}

export function seoDescription(description: string): string {
  const MAX_LENGTH = 155;
  const clean = description.replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_LENGTH) return clean;

  const cut = clean.slice(0, MAX_LENGTH - 1).trimEnd();
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > MAX_LENGTH * 0.7 ? cut.slice(0, lastSpace) : cut}…`;
}

type ImageDimensions = { width: number; height: number };

// Article bodies are stored as HTML strings, so React cannot add intrinsic
// dimensions to their images for us. Supplying the real aspect ratios here
// lets the browser reserve space before each image downloads, preventing CLS.
function articleImageDimensions(src: string): ImageDimensions | undefined {
  if (/\/images\/portraits\/girl-[^/]+\.png$/.test(src)) return { width: 1000, height: 1000 };
  if (/\/images\/hero-(?:36-questions|green-flags|micro-connections|conversation-games|good-goodbye)\.jpg$/.test(src)) {
    return { width: 940, height: 627 };
  }
  if (/\/images\/hero-[^/]+\.png$/.test(src)) return { width: 1200, height: 630 };

  const imageNumber = src.match(/\/images\/image(\d*)\.png$/)?.[1];
  if (imageNumber === undefined) return undefined;
  if (imageNumber === "" || imageNumber === "10") return { width: 1536, height: 1024 };

  const number = Number(imageNumber);
  if ([2, 3, 5, 6, 7, 8, 9].includes(number)) return { width: 400, height: 266 };
  if (number === 4) return { width: 266, height: 400 };
  if ([11, 12].includes(number)) return { width: 400, height: 218 };
  if (number === 13) return { width: 1024, height: 559 };
  if (number >= 14 && number <= 18) return { width: 1200, height: 630 };
  if (number >= 19 && number <= 22) return { width: 1600, height: 900 };
  if (number === 23) return { width: 1059, height: 556 };
  return undefined;
}

export function stabilizeArticleImages(html: string): string {
  return html.replace(/<img\b([^>]*)>/gi, (tag, attributes: string) => {
    const src = attributes.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    const dimensions = src ? articleImageDimensions(src) : undefined;
    if (!dimensions) return tag;

    const width = /\bwidth=/i.test(attributes) ? "" : ` width="${dimensions.width}"`;
    const height = /\bheight=/i.test(attributes) ? "" : ` height="${dimensions.height}"`;
    const loading = /\bloading=/i.test(attributes) ? "" : ' loading="lazy"';
    const decoding = /\bdecoding=/i.test(attributes) ? "" : ' decoding="async"';
    return `<img${attributes}${width}${height}${loading}${decoding}>`;
  });
}

function prerenderedArticleHtml(slug: string | undefined): string | null {
  if (!slug || typeof document === "undefined") return null;
  const existing = document.querySelector<HTMLElement>(
    `.post-body[data-blog-slug="${slug}"]`
  );
  return existing?.innerHTML || null;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post: Post | undefined = POSTS.find((p) => p.slug === slug);
  // Production HTML already contains the article body. Seed the first client
  // render from that markup so hydration does not replace a full article with
  // "Loading article…" before the content asset is fetched again.
  const [rawContentHtml, setRawContentHtml] = useState<string | null>(() =>
    prerenderedArticleHtml(post?.slug)
  );
  const [contentError, setContentError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const postKeywords = useMemo(() => (post ? getPostKeywords(post) : []), [post]);

  const relatedPosts = useMemo(() => {
    if (!post) return [];
    return POSTS.filter((candidate) => candidate.slug !== post.slug)
      .map((candidate) => ({
        candidate,
        score: relatedPostScore(post, candidate),
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          (a.candidate.date < b.candidate.date ? 1 : -1)
      )
      .slice(0, 3)
      .map(({ candidate }) => candidate);
  }, [post]);

  useEffect(() => {
    if (!post) return;

    const controller = new AbortController();
    setContentError(false);

    fetch(`/blog-content/${encodeURIComponent(post.slug)}.html`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Article content request failed: ${response.status}`);
        }
        return response.text();
      })
      .then((html) => setRawContentHtml(html))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setContentError(true);
      });

    return () => controller.abort();
  }, [post, retryCount]);

  const contentHtml = useMemo(
    () => stabilizeArticleImages(rawContentHtml || ""),
    [rawContentHtml]
  );

  // Consolidated duplicate posts: redirect old slugs to their canonical keeper.
  if (slug && POST_REDIRECTS[slug]) {
    return <Navigate to={`/blog/${POST_REDIRECTS[slug]}`} replace />;
  }

  if (!post) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 12 }}>
        <Helmet>
          <title>Article Not Found | Chatrio</title>
          <meta name="description" content="The requested Chatrio article could not be found." />
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <h1>Article not found</h1>
        <p>The article may have moved or the address may be incorrect.</p>
        <NavLink to="/blog">← Back to Blog</NavLink>
      </div>
    );
  }

  const canonicalUrl = `https://chatrio.app/blog/${post.slug}`;
  const ogImage = post.thumbnail ? `https://chatrio.app/${String(post.thumbnail).replace(/^\/?/, "")}` : "https://chatrio.app/branding/chatrio-512.png?v=2";
  const metaDescription = seoDescription(post.excerpt);
  const mins = rawContentHtml ? readingTime(contentHtml) : null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 12 }}>
      <Helmet>
        <title>{seoTitle(post.title)}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={ogImage} />
        <meta property="article:published_time" content={post.date} />
        <meta property="article:section" content={post.category} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={ogImage} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.title,
          "description": metaDescription,
          "keywords": postKeywords.join(", "),
          "image": {
            "@type": "ImageObject",
            "url": ogImage,
            "width": post.thumbnail ? 1200 : 512,
            "height": post.thumbnail ? 630 : 512
          },
          "datePublished": post.date,
          "dateModified": post.date,
          "url": canonicalUrl,
          "author": {
            "@type": "Person",
            "name": "Vijay",
            "url": "https://chatrio.app/about",
            "jobTitle": "Founder",
            "description": "Founder of Chatrio, writing about anonymous chat, online safety, and digital connection.",
            "worksFor": { "@type": "Organization", "name": "Chatrio", "url": "https://chatrio.app" }
          },
          "publisher": {
            "@type": "Organization",
            "name": "Chatrio",
            "url": "https://chatrio.app",
            "logo": { "@type": "ImageObject", "url": "https://chatrio.app/branding/chatrio-512.png?v=2", "width": 512, "height": 512 }
          },
          "mainEntityOfPage": { "@type": "WebPage", "@id": canonicalUrl }
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://chatrio.app/" },
            { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://chatrio.app/blog" },
            { "@type": "ListItem", "position": 3, "name": post.category, "item": `https://chatrio.app/blog/${encodeURIComponent(String(post.category).toLowerCase())}` },
            { "@type": "ListItem", "position": 4, "name": post.title, "item": canonicalUrl }
          ]
        })}</script>
      </Helmet>
      <NavLink to="/blog">← Back to Blog</NavLink>

      <h1 style={{ marginTop: 12 }}>{post.title}</h1>
      <div className="blog-meta-row">
        <span>By <NavLink to="/about" className="post-author-link" rel="author">Vijay</NavLink></span>
        <span>·</span>
        <span>{post.date}</span>
        <span>·</span>
        <span>{post.category}</span>
        {mins !== null && (
          <>
            <span>·</span>
            <span className="post-read-time">{`${mins} min read`}</span>
          </>
        )}
      </div>

      {postKeywords.length > 0 && (
        <nav className="post-topic-tags" aria-label="Article topics">
          <span className="post-topic-label">Explore topics:</span>
          {postKeywords.map((keyword) => (
            <NavLink
              key={keyword}
              to={`/blog?search=${encodeURIComponent(keyword)}`}
              className="post-topic-chip"
            >
              {keyword}
            </NavLink>
          ))}
        </nav>
      )}

      {contentError ? (
        <div className="post-content-state" role="alert">
          <p>The article body could not be loaded.</p>
          <button type="button" onClick={() => setRetryCount((count) => count + 1)}>
            Try again
          </button>
        </div>
      ) : rawContentHtml === null ? (
        <div className="post-content-state" role="status">
          Loading article…
        </div>
      ) : (
        <div
          className="post-body google-anno-skip"
          data-blog-slug={post.slug}
          style={{ lineHeight: 1.8, opacity: 0.95 }}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )}

      <aside className="post-author-box" aria-label="About the author">
        <div className="post-author-avatar" aria-hidden="true">V</div>
        <div>
          <div className="post-author-name">Vijay · Founder of Chatrio</div>
          <p className="post-author-bio">
            {"Vijay is the founder of Chatrio. He built the platform to make anonymous, judgment-free conversation with strangers simple and safe, and writes about online connection, chat safety, and digital loneliness. Every article here is written and reviewed against our "}
            <NavLink to="/editorial-standards">editorial standards</NavLink>.
          </p>
        </div>
      </aside>

      {relatedPosts.length > 0 && (
        <nav aria-label="Related posts" style={{ marginTop: 48, borderTop: "1px solid var(--border, #e2e8f0)", paddingTop: 32 }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 16 }}>You May Also Like</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {relatedPosts.map((p) => {
              const sharedKeyword =
                getPostKeywords(p).find((keyword) => postKeywords.includes(keyword)) ||
                p.category;
              return (
                <li key={p.slug} className="post-related-card">
                  <NavLink to={`/blog/${p.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    <div className="post-related-topic">{sharedKeyword}</div>
                    <div className="post-related-title">{p.title}</div>
                    <p className="post-related-excerpt">{seoDescription(p.excerpt)}</p>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
