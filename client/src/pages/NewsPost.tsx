import React from "react";
import { useParams, Link } from "react-router-dom";
import { POSTS, Post } from "../data/posts";

export default function NewsPost() {
  const { slug } = useParams();
  const post = POSTS.find((p: Post) => p.slug === slug);

  if (!post) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
        <p>Post not found.</p>
        <Link to="/news">Back to News</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <Link to="/news">← Back to News</Link>
      <h1 style={{ marginTop: 12 }}>{post.title}</h1>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>
        {post.date} • {post.category}
      </div>

      <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
    </div>
  );
}
