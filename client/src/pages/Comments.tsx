import React, { useEffect, useMemo, useState } from "react";

type CommentItem = {
  id: string;
  name: string;
  message: string;
  createdAt: string; // ISO
};

function storageKey(slug: string) {
  return `chatrio_comments_${slug}`;
}

function loadComments(slug: string): CommentItem[] {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as CommentItem[]) : [];
  } catch {
    return [];
  }
}

function saveComments(slug: string, comments: CommentItem[]) {
  localStorage.setItem(storageKey(slug), JSON.stringify(comments));
}

export default function Comments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setComments(loadComments(slug));
  }, [slug]);

  const count = useMemo(() => comments.length, [comments]);

  const addComment = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const n = name.trim();
    const m = message.trim();

    if (n.length < 2) return setError("Please enter your name.");
    if (m.length < 5) return setError("Comment is too short.");
    if (m.length > 800) return setError("Comment is too long (max 800 chars).");

    const newItem: CommentItem = {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: n,
      message: m,
      createdAt: new Date().toISOString(),
    };

    const next = [newItem, ...comments];
    setComments(next);
    saveComments(slug, next);

    setMessage("");
  };

  const removeComment = (id: string) => {
    const next = comments.filter((c) => c.id !== id);
    setComments(next);
    saveComments(slug, next);
  };

  return (
    <section className="comments">
      <div className="comments-head">
        <h2 className="comments-title">Comments</h2>
        <span className="comments-count">{count}</span>
      </div>

      <form className="comments-form" onSubmit={addComment}>
        <input
          className="comments-input"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
        />

        <textarea
          className="comments-textarea"
          placeholder="Write a comment..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={800}
        />

        {error ? <div className="comments-error">{error}</div> : null}

        <button className="comments-btn" type="submit">
          Post Comment
        </button>
      </form>

      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="comments-empty">Be the first to comment ✨</div>
        ) : (
          comments.map((c) => (
            <div className="comment" key={c.id}>
              <div className="comment-top">
                <div className="comment-name">{c.name}</div>
                <div className="comment-meta">
                  {new Date(c.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="comment-msg">{c.message}</div>

              {/* Optional: remove button (good for testing) */}
              <button
                className="comment-del"
                onClick={() => removeComment(c.id)}
                type="button"
                title="Delete"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
