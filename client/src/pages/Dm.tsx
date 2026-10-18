import React, { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useAuth, apiGet } from "../auth";
import { SOCKET_URL } from "../config";
import Avatar from "../components/Avatar";
import "./circles.css";
import "./dm.css";

type DmMsg = {
  id: number | string; // string = optimistic (not yet acked)
  sender_id: number;
  text: string;
  created_at: number;
  read_at: number | null;
  pending?: boolean;
};
type Friend = { id: number; name: string; online: boolean; lastSeen: number | null };

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function presenceLabel(f: Friend): string {
  if (f.online) return "Active now";
  if (!f.lastSeen) return "Offline";
  const mins = Math.floor((Date.now() - f.lastSeen) / 60000);
  if (mins < 1) return "Active just now";
  if (mins < 60) return `Active ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Active ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Active yesterday" : `Active ${days}d ago`;
}

const makeMsgId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function Dm() {
  const { friendId } = useParams();
  const id = Number(friendId);
  const { user, token, loading } = useAuth();
  const navigate = useNavigate();

  const [friend, setFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<DmMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [theyTyping, setTheyTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load friend header + message history.
  useEffect(() => {
    if (loading) return;
    if (!token) {
      navigate("/login", { state: { from: `/friends/${id}` }, replace: true });
      return;
    }
    if (!Number.isFinite(id)) {
      setError("Unknown conversation");
      return;
    }
    apiGet(`/dm/${id}/messages`, token)
      .then((data: { friend: Friend; messages: DmMsg[] }) => {
        setFriend(data.friend);
        setMessages(data.messages);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't open this chat"));
  }, [id, token, loading, navigate]);

  // Live socket: incoming messages, typing, read receipts, presence.
  useEffect(() => {
    if (!token || !friend) return;
    const socket = io(SOCKET_URL, { transports: ["websocket"], withCredentials: true, auth: { token } });
    socketRef.current = socket;

    const markRead = () => socket.emit("dm_read", { fromUserId: id });
    socket.on("connect", markRead);

    socket.on("dm_message", (m: { id: number; fromUserId: number; text: string; ts: number }) => {
      if (m.fromUserId !== id) return;
      setMessages((prev) =>
        prev.some((x) => x.id === m.id)
          ? prev
          : [...prev, { id: m.id, sender_id: m.fromUserId, text: m.text, created_at: m.ts, read_at: null }]
      );
      markRead(); // we're looking at the thread, so their message is read
    });

    socket.on("dm_sent", ({ msgId, id: realId, ts }: { msgId: string; id: number; ts: number }) => {
      setMessages((prev) =>
        prev.map((x) => (x.id === msgId ? { ...x, id: realId, created_at: ts, pending: false } : x))
      );
    });

    socket.on("dm_read", ({ byUserId }: { byUserId: number }) => {
      if (byUserId !== id) return;
      setMessages((prev) => prev.map((x) => (x.sender_id === user?.id && !x.read_at ? { ...x, read_at: Date.now() } : x)));
    });

    socket.on("dm_typing", ({ fromUserId, typing }: { fromUserId: number; typing: boolean }) => {
      if (fromUserId === id) setTheyTyping(typing);
    });

    socket.on("friend_presence", ({ userId, online, lastSeen }: { userId: number; online: boolean; lastSeen?: number }) => {
      if (userId !== id) return;
      setFriend((f) => (f ? { ...f, online, lastSeen: online ? null : lastSeen ?? f.lastSeen } : f));
    });

    socket.on("dm_error", (e: { error: string }) => setError(e.error));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id, token, friend, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, theyTyping]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !socketRef.current || !user) return;
    const msgId = makeMsgId();
    setMessages((prev) => [
      ...prev,
      { id: msgId, sender_id: user.id, text, created_at: Date.now(), read_at: null, pending: true },
    ]);
    socketRef.current.emit("dm_send", { toUserId: id, msgId, text });
    socketRef.current.emit("dm_typing", { toUserId: id, typing: false });
    setDraft("");
  };

  const onType = (v: string) => {
    setDraft(v);
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("dm_typing", { toUserId: id, typing: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit("dm_typing", { toUserId: id, typing: false }), 1500);
  };

  if (loading || (!friend && !error)) {
    return (
      <div className="dm-wrap dm-centered">
        <Helmet><meta name="robots" content="noindex" /></Helmet>
        <p className="circles-sub">Loading…</p>
      </div>
    );
  }
  if (error && !friend) {
    return (
      <div className="dm-wrap dm-centered">
        <Helmet><meta name="robots" content="noindex" /></Helmet>
        <div className="auth-error">{error}</div>
        <button className="circles-btn-ghost" onClick={() => navigate("/friends")}>← Back to Messages</button>
      </div>
    );
  }

  // "Seen" shows under the newest outgoing message once the friend has read it.
  const lastMineIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].sender_id === user?.id) return i;
    return -1;
  })();
  const showSeen = lastMineIdx >= 0 && !!messages[lastMineIdx].read_at;

  return (
    <div className="dm-wrap">
      <Helmet>
        <title>{friend?.name} — Chatrio Messages</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className="dm-head">
        <button className="dm-back" onClick={() => navigate("/friends")} aria-label="Back to Messages">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <Avatar name={friend?.name || ""} size={38} presence={friend?.online ? "online" : "offline"} />
        <div className="dm-head-id">
          <div className="dm-head-name">{friend?.name}</div>
          <div className={`dm-head-status${friend?.online ? " online" : ""}`}>{friend ? presenceLabel(friend) : ""}</div>
        </div>
        <button
          className="dm-call-btn"
          onClick={() => navigate(`/video-chat?reconnect=${id}`)}
          aria-label={`Start a video call with ${friend?.name}`}
          title="Start a video call"
        >
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </button>
      </header>

      <div className="dm-body" role="log" aria-live="polite">
        {messages.length === 0 && (
          <p className="dm-empty">
            This is the start of your conversation with {friend?.name}. Say hi 👋
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`dm-msg${mine ? " me" : " them"}`}>
              <div className="dm-bubble">
                <span className="dm-bubble-text">{m.text}</span>
                <span className="dm-bubble-time">{fmtTime(m.created_at)}{mine && m.pending ? " ·" : ""}</span>
              </div>
              {mine && i === lastMineIdx && showSeen && <span className="dm-seen">Seen</span>}
            </div>
          );
        })}
        {theyTyping && (
          <div className="dm-msg them">
            <div className="dm-typing-bubble">
              <span className="dm-dot" /><span className="dm-dot" /><span className="dm-dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="dm-composer" onSubmit={send}>
        <input
          className="dm-input"
          value={draft}
          onChange={(e) => onType(e.target.value)}
          placeholder={`Message ${friend?.name || ""}…`}
          maxLength={2000}
          aria-label="Message"
        />
        <button className="dm-send" type="submit" disabled={!draft.trim()} aria-label="Send message">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
        </button>
      </form>
    </div>
  );
}
