import React, { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { NavLink, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useAuth, apiGet, apiPost } from "../auth";
import { SOCKET_URL } from "../config";
import Avatar from "../components/Avatar";
import "./circles.css";
import "./messages.css";

type LastMessage = { text: string; createdAt: number; fromMe: boolean };
type Conversation = {
  id: number;
  name: string;
  online: boolean;
  lastSeen: number | null;
  unread: number;
  lastMessage: LastMessage | null;
};
type RequestUser = { id: number; name: string };
type Inbox = {
  conversations: Conversation[];
  requests: { incoming: RequestUser[]; sent: RequestUser[] };
};

// "2:14 PM" today, "Tue" this week, else "Mar 3".
function timeLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function lastSeenLabel(lastSeen: number | null): string {
  if (!lastSeen) return "Offline";
  const mins = Math.floor((Date.now() - lastSeen) / 60000);
  if (mins < 1) return "Active just now";
  if (mins < 60) return `Active ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Active ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Active yesterday";
  if (days < 7) return `Active ${days}d ago`;
  return "Offline";
}

// Public, indexable landing shown to logged-out visitors (and crawlers — the
// prerenderer runs with no token, so this is the snapshot Google gets). The
// authenticated inbox below stays noindex. This is the one public state, so
// it carries the real content + canonical + schema that makes /friends worth
// indexing instead of a thin auth wall.
const FRIENDS_FAQS = [
  {
    q: "Do I need an account to add friends?",
    a: "Yes — Friends and direct messages need a free Chatrio account (an email code or Google sign-in, no password). Random text chat and Circles still work with no account at all.",
  },
  {
    q: "How do I add someone as a friend?",
    a: "During or right after a video chat, tap Add Friend. If you both add each other it connects instantly; otherwise it becomes a pending request the other person can accept here on the Friends page.",
  },
  {
    q: "Can I message my friends any time?",
    a: "Yes. Once you're connected you can send direct messages whenever you like — your conversations are waiting here, and you can see when a friend was last online.",
  },
  {
    q: "What does \"Reconnect\" do?",
    a: "Accepted friends get a Reconnect button that pairs you directly the next time you're both in the video-chat lobby, skipping the random queue so you land straight back with each other.",
  },
];

function FriendsPublic() {
  return (
    <div className="circles-wrap friends-lp">
      <Helmet>
        <title>Friends &amp; Messages on Chatrio</title>
        <meta
          name="description"
          content="Add friends from Chatrio video chat, message them any time, see when they're online, and jump back into a video call together. Here's how Friends works."
        />
        <link rel="canonical" href="https://chatrio.app/friends" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Friends & Messages on Chatrio" />
        <meta property="og:description" content="Add friends from video chat, message them any time, and reconnect with a direct video match — no random queue." />
        <meta property="og:url" content="https://chatrio.app/friends" />
        <meta property="og:image" content="https://chatrio.app/branding/chatrio-social-card-2026.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Friends & Messages on Chatrio" />
        <meta name="twitter:description" content="Add friends from video chat, message them any time, and reconnect with a direct video match." />
        <meta name="twitter:image" content="https://chatrio.app/branding/chatrio-social-card-2026.png" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FRIENDS_FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        })}</script>
      </Helmet>

      <div className="friends-lp-hero">
        <div className="friends-lp-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h1 className="circles-h1">Friends &amp; Messages</h1>
        <p className="circles-sub">
          Most Chatrio chats are one-off and anonymous. But when you meet someone
          you click with on video chat, Friends lets you keep that connection —
          add them, message any time, and reconnect later.
        </p>
        <div className="friends-lp-cta-row">
          <NavLink to="/video-chat" className="circles-btn-primary">Start a video chat</NavLink>
          <NavLink to="/login" className="friends-lp-ghost-btn">Log in to your friends</NavLink>
        </div>
      </div>

      <section className="friends-lp-section">
        <h2>How adding a friend works</h2>
        <p>
          During a <NavLink to="/video-chat">random video chat</NavLink>, or in the
          moment right after, either person can tap <strong>Add Friend</strong>. If
          you both add each other it connects instantly; if only one of you does,
          it becomes a pending request the other can accept here on the Friends
          page. No phone numbers or profiles change hands — just a mutual nod that
          you'd like to talk again.
        </p>
      </section>

      <section className="friends-lp-section">
        <h2>Direct messages, any time</h2>
        <p>
          Once you're connected, your conversations live here as a simple inbox.
          Send a message whenever you think of it — there's no pressure to reply in
          real time, and no feed, followers, or public profile attached. It's a
          quiet, private line between two people who chose to stay in touch.
        </p>
      </section>

      <section className="friends-lp-section">
        <h2>See who's online and reconnect</h2>
        <p>
          Friends shows you when someone was last active, so you know when it's a
          good time to say hi. And when you're both around, the{" "}
          <strong>Reconnect</strong> button pairs you directly in the video lobby —
          skipping the random queue so you land straight back with each other
          instead of hoping to get matched again.
        </p>
      </section>

      <section className="friends-lp-section">
        <h2>Frequently asked questions</h2>
        <div className="friends-lp-faq">
          {FRIENDS_FAQS.map((f) => (
            <div className="friends-lp-faq-item" key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="friends-lp-section friends-lp-outro">
        <h2>Ready to meet someone worth keeping?</h2>
        <p>
          Friends start with a conversation. Jump into a video chat, and if you hit
          it off, add them before you skip.
        </p>
        <div className="friends-lp-cta-row">
          <NavLink to="/video-chat" className="circles-btn-primary">Start a video chat</NavLink>
          <NavLink to="/chat" className="friends-lp-ghost-btn">Try text chat first</NavLink>
        </div>
      </section>
    </div>
  );
}

export default function Friends() {
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiGet("/dm/inbox", token);
      setInbox(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load messages");
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && user) load();
  }, [authLoading, user, load]);

  // Live inbox: presence changes + incoming messages while this screen is open.
  useEffect(() => {
    if (!token || !user) return;
    const socket = io(SOCKET_URL, { transports: ["websocket"], withCredentials: true, auth: { token } });
    socketRef.current = socket;

    socket.on("friend_presence", ({ userId, online, lastSeen }: { userId: number; online: boolean; lastSeen?: number }) => {
      setInbox((prev) =>
        prev
          ? {
              ...prev,
              conversations: prev.conversations.map((c) =>
                c.id === userId ? { ...c, online, lastSeen: online ? null : lastSeen ?? c.lastSeen } : c
              ),
            }
          : prev
      );
    });

    socket.on("dm_message", (m: { fromUserId: number; text: string; ts: number }) => {
      setInbox((prev) => {
        if (!prev) return prev;
        const idx = prev.conversations.findIndex((c) => c.id === m.fromUserId);
        if (idx === -1) {
          load(); // a brand-new friend not in the list yet — refetch
          return prev;
        }
        const updated: Conversation = {
          ...prev.conversations[idx],
          unread: prev.conversations[idx].unread + 1,
          online: true,
          lastMessage: { text: m.text, createdAt: m.ts, fromMe: false },
        };
        const rest = prev.conversations.filter((_, i) => i !== idx);
        return { ...prev, conversations: [updated, ...rest] };
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user, load]);

  const respond = async (friendId: number, action: "accept" | "decline") => {
    if (!token) return;
    setBusyId(friendId);
    try {
      await apiPost(`/friends/${friendId}/${action}`, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="circles-wrap route-loading" role="status">
        <Helmet><meta name="robots" content="noindex" /></Helmet>
        Loading…
      </div>
    );
  }

  // Logged-out visitors (and the prerenderer/crawlers) get the public landing.
  if (!user) {
    return <FriendsPublic />;
  }

  const convos = inbox?.conversations || [];
  const incoming = inbox?.requests.incoming || [];
  const sent = inbox?.requests.sent || [];
  const onlineCount = convos.filter((c) => c.online).length;
  const isEmpty = inbox !== null && convos.length === 0 && incoming.length === 0 && sent.length === 0;

  return (
    <div className="circles-wrap friends-inbox">
      <Helmet>
        <title>Messages — Chatrio</title>
        <meta name="description" content="Your Chatrio friends and direct messages — chat any time, and jump into a video call when you're both online." />
        <link rel="canonical" href="https://chatrio.app/friends" />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="msg-head">
        <h1 className="circles-h1">Messages</h1>
        {convos.length > 0 && (
          <span className="msg-head-sub">
            {onlineCount > 0 && <span className="msg-online-dot" aria-hidden="true" />}
            {`${convos.length} friend${convos.length === 1 ? "" : "s"}${onlineCount ? ` · ${onlineCount} online` : ""}`}
          </span>
        )}
      </div>

      {error && <div className="auth-error">{error}</div>}

      {incoming.length > 0 && (
        <section className="msg-section">
          <h2 className="msg-label">{incoming.length} request{incoming.length === 1 ? "" : "s"}</h2>
          {incoming.map((f) => (
            <div className="msg-request" key={f.id}>
              <Avatar name={f.name} size={44} />
              <div className="msg-req-meta">
                <div className="msg-req-name">{f.name}</div>
                <div className="msg-req-sub">wants to connect</div>
              </div>
              <div className="msg-req-actions">
                <button className="msg-req-accept" disabled={busyId === f.id} onClick={() => respond(f.id, "accept")}>Accept</button>
                <button className="msg-req-decline" disabled={busyId === f.id} onClick={() => respond(f.id, "decline")}>Decline</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {inbox === null ? (
        <p className="circles-sub msg-loading">Loading…</p>
      ) : isEmpty ? (
        <div className="msg-empty">
          <div className="msg-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2>No friends yet</h2>
          <p>Add someone at the end of a video chat, then pick the conversation back up here any time.</p>
          <button className="circles-btn-primary" onClick={() => navigate("/video-chat")}>Start a video chat</button>
        </div>
      ) : (
        convos.length > 0 && (
          <section className="msg-section">
            <h2 className="msg-label">Chats</h2>
            <div className="msg-list">
              {convos.map((c) => (
                <button className={`msg-row${c.unread ? " msg-unread" : ""}`} key={c.id} onClick={() => navigate(`/friends/${c.id}`)}>
                  <Avatar name={c.name} size={48} presence={c.online ? "online" : "offline"} />
                  <div className="msg-row-meta">
                    <div className="msg-row-top">
                      <span className="msg-row-name">{c.name}</span>
                      {c.lastMessage && <span className="msg-row-time">{timeLabel(c.lastMessage.createdAt)}</span>}
                    </div>
                    <div className="msg-row-prev">
                      {c.lastMessage
                        ? `${c.lastMessage.fromMe ? "You: " : ""}${c.lastMessage.text}`
                        : c.online
                        ? "Online now · say hi 👋"
                        : lastSeenLabel(c.lastSeen)}
                    </div>
                  </div>
                  {c.unread > 0 && <span className="msg-badge">{c.unread > 9 ? "9+" : c.unread}</span>}
                </button>
              ))}
            </div>
          </section>
        )
      )}

      {sent.length > 0 && (
        <section className="msg-section">
          <h2 className="msg-label">Pending</h2>
          <div className="msg-list">
            {sent.map((f) => (
              <div className="msg-row msg-row-static" key={f.id}>
                <Avatar name={f.name} size={48} />
                <div className="msg-row-meta">
                  <div className="msg-row-name">{f.name}</div>
                  <div className="msg-row-prev">Waiting for them to accept</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
