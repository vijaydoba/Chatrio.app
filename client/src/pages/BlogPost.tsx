import React from "react";
import { useParams, NavLink, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { POSTS, Post, POST_REDIRECTS } from "../data/posts";
import { POST_CONTENT } from "../data/posts-content";

function readingTime(html: string): number {
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  // Consolidated duplicate posts: redirect old slugs to their canonical keeper.
  if (slug && POST_REDIRECTS[slug]) {
    return <Navigate to={`/blog/post/${POST_REDIRECTS[slug]}`} replace />;
  }

  const post: Post | undefined = POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 12 }}>
        <p>Post not found.</p>
        <NavLink to="/blog">← Back to Blog</NavLink>
      </div>
    );
  }

  const contentHtml = POST_CONTENT[post.slug] || "";
  const canonicalUrl = `https://chatrio.app/blog/post/${post.slug}`;
  const ogImage = post.thumbnail ? `https://chatrio.app/${String(post.thumbnail).replace(/^\/?/, "")}` : "https://chatrio.app/branding/chatrio-512.png";
  const mins = readingTime(contentHtml);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 12 }}>
      <Helmet>
        <title>{post.title} | Chatrio Blog</title>
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
          "@type": "Article",
          "headline": post.title,
          "description": post.excerpt,
          "image": ogImage,
          "datePublished": post.date,
          "url": canonicalUrl,
          "author": { "@type": "Organization", "name": "Chatrio" },
          "publisher": {
            "@type": "Organization",
            "name": "Chatrio",
            "url": "https://chatrio.app",
            "logo": { "@type": "ImageObject", "url": "https://chatrio.app/branding/chatrio-512.png" }
          },
          "mainEntityOfPage": { "@type": "WebPage", "@id": canonicalUrl }
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://chatrio.app/" },
            { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://chatrio.app/blog" },
            { "@type": "ListItem", "position": 3, "name": post.category, "item": `https://chatrio.app/blog/${String(post.category).toLowerCase()}` },
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
    </div>
  );
}
