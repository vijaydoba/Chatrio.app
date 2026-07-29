import React, { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { NavLink, useNavigate } from "react-router-dom";
import { Socket } from "socket.io-client";
import { useAuth } from "../auth";
import { blindDate, Message, MatchState, Profile } from "../blindDateApi";
import { connectBlindDateSocket, disconnectBlindDateSocket } from "../blindDateSocket";
import { createVideoCall, VideoCallController, VideoState } from "../blindDateWebRTC";
import "./circles.css";
import "./circles-local.css";

type Phase = "loading" | "no-profile" | "idle" | "waiting" | "chatting" | "ended" | "error";

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtCountdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function BlindDateChat() {
  const { token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(Date.now());
  const [confirmReport, setConfirmReport] = useState(false);
  const [videoState, setVideoState] = useState<VideoState>("off");
  const [videoError, setVideoError] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoCallRef = useRef<VideoCallController | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  const VIDEO_EVENTS = [
    "video_invite",
    "video_accept",
    "video_decline",
    "video_cancel",
    "video_offer",
    "video_answer",
    "video_ice_candidate",
    "video_end",
  ] as const;

  const attachSocket = (myProfile: Profile, matchState: MatchState) => {
    if (socketRef.current) return socketRef.current;
    if (!token) return null;
    const socket = connectBlindDateSocket(token);
    socketRef.current = socket;

    videoCallRef.current = createVideoCall({
      socket,
      matchId: matchState.matchId,
      myProfileId: myProfile.id,
      otherProfileId: matchState.otherProfileId,
      onLocalStream: setLocalStream,
      onRemoteStream: setRemoteStream,
      onState: setVideoState,
      onError: (msg) => setVideoError(msg),
    });

    socket.on("match_state", (state: MatchState) => setMatch((cur) => ({ ...(cur || state), ...state })));
    socket.on("message", (m: Message) =>
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
    );
    socket.on("match_ended", () => {
      videoCallRef.current?.teardown();
      setPhase("ended");
    });
    socket.on("match_error", (e: { error: string }) => setError(e.error));
    VIDEO_EVENTS.forEach((evt) => socket.on(evt, (payload: any) => videoCallRef.current?.handleSignal(evt, payload)));

    socket.emit("join_match");
    return socket;
  };

  const loadCurrent = async () => {
    if (!token) return;
    try {
      const [p, current] = await Promise.all([blindDate.getProfile(token), blindDate.currentMatch(token)]);
      setProfile(p);
      if (!p) return setPhase("no-profile");
      if (current) {
        setMatch(current);
        setMessages(current.messages || []);
        attachSocket(p, current);
        setPhase("chatting");
      } else {
        setPhase("idle");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("error");
    }
  };

  useEffect(() => {
    if (!authLoading && !token) {
      navigate("/login", { state: { from: "/blind-date/chat" }, replace: true });
      return;
    }
    if (!authLoading && token) loadCurrent();
    return () => {
      stopPolling();
      videoCallRef.current?.teardown();
      videoCallRef.current = null;
      disconnectBlindDateSocket();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // Live countdown to the 10-minute reveal fallback.
  useEffect(() => {
    if (phase !== "chatting" || !match || match.revealed) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase, match]);

  const findMatch = async () => {
    if (!token || !profile) return;
    setError("");
    try {
      const res = await blindDate.joinQueue(token);
      if (res.status === "matched") {
        const current = await blindDate.currentMatch(token);
        setMatch(current);
        setMessages(current?.messages || []);
        if (current) attachSocket(profile, current);
        setPhase("chatting");
        return;
      }
      setPhase("waiting");
      stopPolling();
      pollRef.current = setInterval(async () => {
        const s = await blindDate.queueStatus(token);
        if (s.status === "matched") {
          stopPolling();
          const current = await blindDate.currentMatch(token);
          setMatch(current);
          setMessages(current?.messages || []);
          if (current) attachSocket(profile, current);
          setPhase("chatting");
        }
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("error");
    }
  };

  const cancelWaiting = async () => {
    stopPolling();
    if (token) await blindDate.leaveQueue(token).catch(() => {});
    setPhase("idle");
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !match || !socketRef.current) return;
    socketRef.current.emit("send_message", { matchId: match.matchId, text });
    setDraft("");
  };

  const reveal = () => {
    if (!match || !socketRef.current) return;
    socketRef.current.emit("reveal_tap", { matchId: match.matchId });
  };

  const endDate = () => {
    if (!match || !socketRef.current) return;
    socketRef.current.emit("leave_match", { matchId: match.matchId });
  };

  const reportMatch = () => {
    if (!match || !socketRef.current) return;
    socketRef.current.emit("report_match", { matchId: match.matchId, reason: "user reported from chat" });
    setConfirmReport(false);
  };

  const startVideo = () => {
    setVideoError("");
    videoCallRef.current?.invite();
  };
  const acceptVideo = () => {
    setVideoError("");
    videoCallRef.current?.accept();
  };
  const declineVideo = () => videoCallRef.current?.decline();
  const cancelVideoInvite = () => videoCallRef.current?.cancel();
  const hangUpVideo = () => videoCallRef.current?.hangUp();

  const startNext = () => {
    videoCallRef.current?.teardown();
    videoCallRef.current = null;
    setVideoError("");
    disconnectBlindDateSocket();
    socketRef.current = null;
    setMatch(null);
    setMessages([]);
    setPhase("idle");
  };

  if (phase === "loading") {
    return <div className="circles-wrap"><p className="circles-sub">Loading…</p></div>;
  }

  if (phase === "no-profile") {
    return (
      <div className="circles-wrap">
        <div className="wl-card">
          <h1 className="wl-h1">Build your profile first</h1>
          <p className="wl-sub">You need a Blind Date profile before you can find a match.</p>
          <NavLink className="wl-btn" to="/blind-date/onboarding">Build profile</NavLink>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="circles-wrap">
        <div className="wl-card">
          <p className="wl-error">{error}</p>
          <button className="wl-btn" onClick={loadCurrent}>Retry</button>
        </div>
      </div>
    );
  }

  if (phase === "idle") {
    return (
      <div className="circles-wrap">
        <Helmet><meta name="robots" content="noindex" /></Helmet>
        <div className="wl-card">
          <span className="wl-badge">Blind Date</span>
          <h1 className="wl-h1">Ready when you are</h1>
          <p className="wl-sub">We'll match you with someone compatible. No names or photos until you both reveal.</p>
          <button className="wl-btn" onClick={findMatch}>Find a match</button>
        </div>
      </div>
    );
  }

  if (phase === "waiting") {
    return (
      <div className="circles-wrap">
        <div className="wl-card">
          <span className="wl-badge">Looking…</span>
          <h1 className="wl-h1">Finding your match</h1>
          <p className="wl-sub">Hang tight — this updates automatically the moment someone compatible is free.</p>
          <button className="wl-btn" onClick={cancelWaiting}>Cancel</button>
        </div>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="circles-wrap">
        <div className="wl-card">
          <span className="wl-badge">Date over</span>
          <h1 className="wl-h1">That one's ended</h1>
          <p className="wl-sub">Ready to meet someone else?</p>
          <button className="wl-btn" onClick={startNext}>Find another match</button>
        </div>
      </div>
    );
  }

  // phase === "chatting"
  const countdownMs = match ? match.fallbackAt - now : 0;

  return (
    <div className="circles-wrap room-wrap">
      <Helmet><meta name="robots" content="noindex" /></Helmet>

      <header className="room-head">
        <NavLink className="room-back" to="/blind-date">←</NavLink>
        <div className="room-title">
          <h1 className="circle-topic">{match?.revealed ? match.otherDisplayName : "Your date"}</h1>
          <span className="room-sub">
            {match?.revealed
              ? "Revealed"
              : match?.myRevealed
              ? "Waiting for them to reveal…"
              : `Blurred · reveals in ${fmtCountdown(countdownMs)}`}
          </span>
        </div>
      </header>

      <div className="room-members">
        {!match?.revealed && (
          <button className="circles-btn-ghost" onClick={reveal} disabled={match?.myRevealed}>
            {match?.myRevealed ? "You revealed" : "Reveal"}
          </button>
        )}
        {match?.revealed && videoState === "off" && (
          <button className="circles-btn-ghost" onClick={startVideo}>Start video</button>
        )}
        {videoState === "inviting" && (
          <button className="circles-btn-ghost" onClick={cancelVideoInvite}>Cancel call…</button>
        )}
        <button className="circles-btn-ghost" onClick={endDate}>End date</button>
        <button className="circles-btn-ghost" onClick={() => setConfirmReport(true)}>Report</button>
      </div>

      {error && <p className="wl-error">{error}</p>}
      {videoError && <p className="wl-error">{videoError}</p>}

      {videoState === "active" && (
        <div className="room-video">
          <video ref={remoteVideoRef} className="room-video-remote" autoPlay playsInline />
          {!remoteStream && <div className="room-video-waiting">Connecting…</div>}
          <video ref={localVideoRef} className="room-video-local" autoPlay playsInline muted />
          <div className="room-video-controls">
            <button className="room-video-hangup" onClick={hangUpVideo}>Hang up</button>
          </div>
        </div>
      )}

      <div className="room-messages">
        {messages.length === 0 && (
          <p className="room-empty">Say hi — you're both here for the same reason.</p>
        )}
        {messages.map((m) => {
          const mine = m.from_profile === profile?.id;
          return (
            <div key={m.id} className={`room-msg${mine ? " mine" : ""}`}>
              <span className="room-msg-bubble">{m.text}</span>
              <span className="room-msg-time">{fmtTime(m.created_at)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form className="room-input" onSubmit={send}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Say something…"
          maxLength={2000}
        />
        <button className="circles-btn-primary" type="submit" disabled={!draft.trim()}>
          Send
        </button>
      </form>

      {confirmReport && (
        <div className="cl-modal" role="dialog" aria-modal="true" aria-label="Report this date" onClick={() => setConfirmReport(false)}>
          <div className="cl-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="cl-modal-title">Report &amp; end this date?</h3>
            <p className="cl-fine">They'll be blocked from matching with you again and our moderators are alerted. This ends the date immediately.</p>
            <div className="cl-modal-actions">
              <button className="cl-btn cl-ghost cl-sm" onClick={() => setConfirmReport(false)}>Cancel</button>
              <button className="cl-btn cl-sm cl-danger" onClick={reportMatch}>Report &amp; end</button>
            </div>
          </div>
        </div>
      )}

      {videoState === "incoming" && (
        <div className="cl-modal" role="dialog" aria-modal="true" aria-label="Incoming video call" onClick={declineVideo}>
          <div className="cl-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="cl-modal-title">Incoming video call</h3>
            <p className="cl-fine">Your date wants to start a video call. Accepting will ask for camera and microphone access.</p>
            <div className="cl-modal-actions">
              <button className="cl-btn cl-ghost cl-sm" onClick={declineVideo}>Decline</button>
              <button className="cl-btn cl-sm" onClick={acceptVideo}>Accept</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
