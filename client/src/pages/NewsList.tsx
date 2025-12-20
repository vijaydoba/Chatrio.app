import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { POSTS } from "../data/posts";
import "../styles/news.css";

export default function NewsList() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");

  const categories = useMemo(() => {
    const c = Array.from(new Set(POSTS.map((p) => p.category)));
    return ["All", ...c];
  }, []);

  const filtered = useMemo(() => {
    return POSTS.slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .filter((p) => (cat === "All" ? true : p.category === cat))
      .filter((p) => {
        const s = (p.title + " " + p.excerpt).toLowerCase();
        return s.includes(q.toLowerCase().trim());
      });
  }, [q, cat]);

  return (
    <div className="news-list">
      <h1>News</h1>

      <div className="news-controls">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search news..."
          className="news-search"
        />

        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="news-select"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="news-grid">
        {filtered.map((p) => (
          <article className="blog-card blog-card-row" key={p.slug}>
            <img
              className="blog-thumb"
              src={p.thumbnail || "/images/default-thumb.png"}
              alt={p.title}
            />

            <div className="blog-card-body">
              <div className="blog-meta">
                {p.date} • {p.category}
              </div>

              <h3 className="blog-card-title">
                <Link to={`/blog/post/${p.slug}`}>{p.title}</Link>
              </h3>

              <p className="blog-card-excerpt">{p.excerpt}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
