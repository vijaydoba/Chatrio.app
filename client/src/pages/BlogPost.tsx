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
        <p>Post not found.</p>
        <NavLink to="/blog">← Back to Blog</NavLink>
      </div>
    );
  }

  const contentHtml = POST_CONTENT[post.slug] || "";
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
          "author": { "@type": "Organization", "name": "Chatrio", "url": "https://chatrio.app" },
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
        <span>{post.date}</span>
        <span>·</span>
        <span>{post.category}</span>
        <span>·</span>
        <span className="post-read-time">{mins} min read</span>
      </div>

      <div
        className="post-body"
        style={{ lineHeight: 1.8, opacity: 0.95 }}
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

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
