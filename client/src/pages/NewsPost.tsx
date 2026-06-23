import React from "react";
import { useParams, NavLink } from "react-router-dom";
import { POSTS, Post } from "../data/posts";
import { Helmet } from "react-helmet-async";

function buildToc(html: string): { tocItems: { id: string; text: string }[]; bodyHtml: string } {
  const tocItems: { id: string; text: string }[] = [];
  let counter = 0;

  const bodyHtml = html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (match, attrs, inner) => {
    const existingId = (attrs as string).match(/id="([^"]+)"/);
    if (existingId) {
      tocItems.push({ id: existingId[1], text: inner.replace(/<[^>]+>/g, "").trim() });
      return match;
    }
    counter++;
    const id = `s${counter}`;
    tocItems.push({ id, text: inner.replace(/<[^>]+>/g, "").trim() });
    return `<h2${attrs} id="${id}">${inner}</h2>`;
  });

  return { tocItems, bodyHtml };
}

function extractFaq(html: string): Array<{ question: string; answer: string }> | null {
  const faqMatch = html.match(/<h2[^>]*>[\s\S]*?(?:FAQ|Frequently Asked)[\s\S]*?<\/h2>([\s\S]*?)(?=<h2|$)/i);
  if (!faqMatch) return null;
  const items: Array<{ question: string; answer: string }> = [];
  const qaRe = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = qaRe.exec(faqMatch[1])) !== null) {
    const question = m[1].replace(/<[^>]+>/g, "").trim();
    const answer = m[2].replace(/<[^>]+>/g, "").trim();
    if (question && answer) items.push({ question, answer });
  }
  return items.length > 0 ? items : null;
}

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

  const hasInlineToc = post.contentHtml.includes('table-of-contents');
  const { tocItems, bodyHtml } = React.useMemo(() => buildToc(post.contentHtml), [post]);
  const faqItems = React.useMemo(() => extractFaq(post.contentHtml), [post]);

  const canonicalUrl = `https://chatrio.app/blog/post/${post.slug}`;
  const ogImage = `https://chatrio.app/${String(post.thumbnail || "").replace(/^\/?/, "")}`;
  const xShareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(canonicalUrl)}&via=chatrioapp`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.excerpt,
    "url": canonicalUrl,
    "datePublished": post.date,
    "dateModified": post.date,
    "image": post.thumbnail ? ogImage : "https://chatrio.app/branding/chatrio-512.png",
    "author": { "@type": "Organization", "name": "Chatrio", "url": "https://chatrio.app" },
    "publisher": {
      "@type": "Organization",
      "name": "Chatrio",
      "url": "https://chatrio.app",
      "logo": { "@type": "ImageObject", "url": "https://chatrio.app/branding/chatrio-512.png" }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": canonicalUrl }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://chatrio.app/" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://chatrio.app/blog" },
      { "@type": "ListItem", "position": 3, "name": post.title, "item": canonicalUrl }
    ]
  };

  const faqSchema = faqItems ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map(({ question, answer }) => ({
      "@type": "Question",
      "name": question,
      "acceptedAnswer": { "@type": "Answer", "text": answer }
    }))
  } : null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 12 }}>
      <NavLink to="/news">← Back to News</NavLink>

      <Helmet>
        <title>{post.title} | Chatrio Blog</title>
        <meta name="description" content={post.excerpt} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Chatrio" />
        {post.thumbnail ? <meta property="og:image" content={ogImage} /> : null}
        {post.thumbnail ? <meta property="og:image:width" content="1200" /> : null}
        {post.thumbnail ? <meta property="og:image:height" content="630" /> : null}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt} />
        {post.thumbnail ? <meta name="twitter:image" content={ogImage} /> : null}
        <meta property="article:published_time" content={post.date} />
        <meta property="article:author" content="Chatrio" />
        <meta property="article:section" content={post.category} />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        {faqSchema ? <script type="application/ld+json">{JSON.stringify(faqSchema)}</script> : null}
      </Helmet>

      <h1 style={{ marginTop: 12 }}>{post.title}</h1>

      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>
        {post.date} • {post.category}
      </div>

      {!hasInlineToc && tocItems.length >= 3 && (
        <div className="table-of-contents auto-toc">
          <h3>Article Overview</h3>
          <ul>
            {tocItems.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>{item.text}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className="post-body"
        style={{ lineHeight: 1.8, opacity: 0.95 }}
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      <div className="post-share-row">
        <span className="post-share-label">Share this article</span>
        <a
          href={xShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="post-share-x"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </a>
      </div>
    </div>
  );
}
