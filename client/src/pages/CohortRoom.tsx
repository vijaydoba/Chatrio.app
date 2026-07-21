import React, { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate, NavLink } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useAuth, apiGet } from "../auth";
import { API_BASE } from "../config";
import "./circles.css";

type Member = { id: number; name: string };
type CohortMsg = {
  id: number;
  text: string;
  created_at: number;
  user_id: number;
  author: string;
};
type Cohort = {
  id: number;
  topic: string;
  description: string;
  dayLabel: string;
  hour: number;
  nextSessionAt: number;
  members: Member[];
};

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function CohortRoom() {
  const { cohortId } = useParams();
  const id = Number(cohortId);
  const { user, token, loading } = useAuth();
  const navigate = useNavigate();

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [messages, setMessages] = useState<CohortMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [typingNames, setTypingNames] = useState<Record<number, string>>({});
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Load cohort detail + history.
  useEffect(() => {
    if (loading) return;
    if (!token) {
      navigate("/login", { state: { from: `/circles/${id}` }, replace: true });
      return;
    }
    Promise.all([apiGet(`/cohorts/${id}`, token), apiGet(`/cohorts/${id}/messages`, token)])
      .then(([detail, msgs]) => {
        setCohort(detail);
        setMessages(msgs);
      })
      .catch((e) => setError(e.message));
  }, [id, token, loading, navigate]);

  // Socket connection for live group chat.
  useEffect(() => {
    if (!token || !cohort) return;
    const socket = io(API_BASE, {
      autoConnect: true,
      transports: ["websocket"],
      withCredentials: true,
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("cohort_join", { cohortId: id }));
    socket.on("cohort_message", (m: CohortMsg & { cohortId: number }) => {
      if (m.cohortId !== id) return;
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    });
    socket.on("cohort_typing", (d: { cohortId: number; userId: number; name: string; typing: boolean }) => {
      if (d.cohortId !== id || d.userId === user?.id) return;
      setTypingNames((prev) => {
        const next = { ...prev };
        if (d.typing) next[d.userId] = d.name;
        else delete next[d.userId];
        return next;
      });
    });
    socket.on("cohort_error", (e: { error: string }) => setError(e.error));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id, token, cohort, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !socketRef.current) return;
    socketRef.current.emit("cohort_message", { cohortId: id, text });
    socketRef.current.emit("cohort_typing", { cohortId: id, typing: false });
    setDraft("");
  };

  let typingTimer: ReturnType<typeof setTimeout>;
  const onType = (v: string) => {
    setDraft(v);
    if (!socketRef.current) return;
    socketRef.current.emit("cohort_typing", { cohortId: id, typing: true });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(
      () => socketRef.current?.emit("cohort_typing", { cohortId: id, typing: false }),
      1500
    );
  };

  if (loading || (!cohort && !error)) {
    return <div className="circles-wrap"><p className="circles-sub">Loading…</p></div>;
  }
  if (error && !cohort) {
    return (
      <div className="circles-wrap">
        <div className="auth-error">{error}</div>
        <NavLink className="circles-btn-ghost" to="/circles">← Back to Circles</NavLink>
      </div>
    );
  }

  const typing = Object.values(typingNames);

  return (
    <div className="circles-wrap room-wrap">
      <Helmet>
        <title>{cohort?.topic} — Chatrio Circles</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className="room-head">
        <NavLink className="room-back" to="/circles">←</NavLink>
        <div className="room-title">
          <h1 className="circle-topic">{cohort?.topic}</h1>
          <span className="room-sub">
            🗓 {cohort?.dayLabel} · weekly · {cohort?.members.length} in your group
          </span>
        </div>
      </header>

      <div className="room-members">
        {cohort?.members.map((m) => (
          <span key={m.id} className={`member-chip${m.id === user?.id ? " is-me" : ""}`}>
            {m.name}{m.id === user?.id ? " (you)" : ""}
          </span>
        ))}
      </div>

      <div className="room-messages">
        {messages.length === 0 && (
          <p className="room-empty">
            No messages yet. Say hi — these are the people you'll keep meeting.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.user_id === user?.id;
          return (
            <div key={m.id} className={`room-msg${mine ? " mine" : ""}`}>
              {!mine && <span className="room-msg-author">{m.author}</span>}
              <span className="room-msg-bubble">{m.text}</span>
              <span className="room-msg-time">{fmtTime(m.created_at)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {typing.length > 0 && (
        <div className="room-typing">{typing.join(", ")} {typing.length === 1 ? "is" : "are"} typing…</div>
      )}

      <form className="room-input" onSubmit={send}>
        <input
          value={draft}
          onChange={(e) => onType(e.target.value)}
          placeholder="Message your Circle…"
          maxLength={2000}
        />
        <button className="circles-btn-primary" type="submit" disabled={!draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
