import React from "react";
import { useParams, NavLink } from "react-router-dom";
import { POSTS, Post } from "../data/posts";
import { Helmet } from "react-helmet-async";

export default function NewsPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = POSTS.find((p: Post) => p.slug === slug);

  if (!post) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
        <p>Post not found.</p>
        <NavLink to="/news">← Back to News</NavLink>
      </div>
    );
  }

  const canonicalUrl = `https://chatrio.app/news/${post.slug}`;
  const ogImage = `https://chatrio.app/${String(post.thumbnail || "").replace(
    /^\/?/,
    ""
  )}`;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 12 }}>
      <NavLink to="/news">← Back to News</NavLink>

      <Helmet>
        <title>{post.title} | Chatrio News</title>
        <meta name="description" content={post.excerpt} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:url" content={canonicalUrl} />
        {post.thumbnail ? <meta property="og:image" content={ogImage} /> : null}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt} />
        {post.thumbnail ? (
          <meta name="twitter:image" content={ogImage} />
        ) : null}
      </Helmet>

      <h1 style={{ marginTop: 12 }}>{post.title}</h1>

      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>
        {post.date} • {post.category}
      </div>

      <div
        className="post-body"
        style={{ lineHeight: 1.8, opacity: 0.95 }}
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </div>
  );
}
