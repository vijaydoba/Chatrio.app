import React, { useMemo } from "react";
import { useParams, NavLink, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { POSTS, Post, POST_REDIRECTS } from "../data/posts";
import { POST_CONTENT } from "../data/posts-content";

function readingTime(html: string): number {
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function seoTitle(title: string): string {
  const SUFFIX = " | Chatrio";
  const MAX = 60;
  if (title.length <= MAX) return title + SUFFIX;
  const cut = title.slice(0, MAX).trimEnd();
  const lastSpace = cut.lastIndexOf(" ");
  const short = lastSpace > MAX * 0.6 ? cut.slice(0, lastSpace) : cut;
  return short + "…" + SUFFIX;
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

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post: Post | undefined = POSTS.find((p) => p.slug === slug);

  const relatedPosts = useMemo(() => {
    if (!post) return [];
    const sameCat = POSTS.filter((p) => p.slug !== post.slug && p.category === post.category).slice(0, 3);
    const other = POSTS.filter((p) => p.slug !== post.slug && p.category !== post.category).slice(0, 3 - sameCat.length);
    return [...sameCat, ...other];
  }, [post]);

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

  const contentHtml = stabilizeArticleImages(POST_CONTENT[post.slug] || "");
  const canonicalUrl = `https://chatrio.app/blog/${post.slug}`;
  const ogImage = post.thumbnail ? `https://chatrio.app/${String(post.thumbnail).replace(/^\/?/, "")}` : "https://chatrio.app/branding/chatrio-512.png";
  const mins = readingTime(contentHtml);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 12 }}>
      <Helmet>
        <title>{seoTitle(post.title)}</title>
        <meta name="description" content={post.excerpt} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={ogImage} />
        <meta property="article:published_time" content={post.date} />
        <meta property="article:section" content={post.category} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt} />
        <meta name="twitter:image" content={ogImage} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.title,
          "description": post.excerpt,
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
            "logo": { "@type": "ImageObject", "url": "https://chatrio.app/branding/chatrio-512.png", "width": 512, "height": 512 }
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
        <span>·</span>
        <span className="post-read-time">{mins} min read</span>
      </div>

      <div
        className="post-body google-anno-skip"
        style={{ lineHeight: 1.8, opacity: 0.95 }}
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      <aside className="post-author-box" aria-label="About the author">
        <div className="post-author-avatar" aria-hidden="true">V</div>
        <div>
          <div className="post-author-name">Vijay · Founder of Chatrio</div>
          <p className="post-author-bio">
            Vijay is the founder of Chatrio. He built the platform to make anonymous,
            judgment-free conversation with strangers simple and safe, and writes about
            online connection, chat safety, and digital loneliness. Every article here is
            written and reviewed against our{" "}
            <NavLink to="/editorial-standards">editorial standards</NavLink>.
          </p>
        </div>
      </aside>

      {relatedPosts.length > 0 && (
        <nav aria-label="Related posts" style={{ marginTop: 48, borderTop: "1px solid var(--border, #e2e8f0)", paddingTop: 32 }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 16 }}>Related Articles</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {relatedPosts.map((p) => (
              <li key={p.slug} style={{ border: "1px solid var(--border, #e2e8f0)", borderRadius: 8, padding: 16 }}>
                <NavLink to={`/blog/${p.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", marginBottom: 6 }}>{p.category}</div>
                  <div style={{ fontWeight: 600, lineHeight: 1.4 }}>{p.title}</div>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
