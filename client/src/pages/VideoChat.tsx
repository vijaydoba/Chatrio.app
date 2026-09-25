import React, { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { createRandomVideoCall, RandomVideoCallController } from "../randomVideoCall";
import { useAuth } from "../auth";
import "./video-chat.css";

type Mode = "lobby" | "waiting" | "connected";
type MsgStatus = "sending" | "sent" | "delivered";
type ChatMessage = {
  msgId: string;
  text: string;
  fromId: string;
  ts: number;
  status?: MsgStatus;
};
type FriendStatus = "idle" | "sent" | "accepted";

const VC_URL = "https://chatrio.app/video-chat";
const VC_TITLE = "Random Video Chat – Talk Face to Face with Strangers | Chatrio";
const VC_DESCRIPTION =
  "Free random video chat with strangers. Sign in with an email code or Google, then get matched instantly — no download needed.";
const VC_OG_TITLE = "Random Video Chat – Chatrio";
const VC_OG_DESCRIPTION =
  "Get matched instantly for free, face-to-face video chat with strangers. Sign in with an email code or Google — no download needed.";
const VC_IMAGE = "https://chatrio.app/branding/chatrio-social-card-2026.png";
const VC_IMAGE_ALT = "Chatrio Random Video Chat — talk face to face with strangers.";

function VideoChatHead() {
  return (
    <Helmet>
      <title>{VC_TITLE}</title>
      <meta name="description" content={VC_DESCRIPTION} />
      <link rel="canonical" href={VC_URL} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={VC_OG_TITLE} />
      <meta property="og:description" content={VC_OG_DESCRIPTION} />
      <meta property="og:url" content={VC_URL} />
      <meta property="og:image" content={VC_IMAGE} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={VC_IMAGE_ALT} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={VC_OG_TITLE} />
      <meta name="twitter:description" content={VC_OG_DESCRIPTION} />
      <meta name="twitter:image" content={VC_IMAGE} />
      <meta name="twitter:image:alt" content={VC_IMAGE_ALT} />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "@id": `${VC_URL}#app`,
        "name": "Chatrio Random Video Chat",
        "url": VC_URL,
        "applicationCategory": "CommunicationApplication",
        "operatingSystem": "All",
        "offers": {
          "@type": "Offer",
          "price": 0,
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
        },
        "description": "Free random video chat — get matched instantly with strangers for face-to-face video conversations.",
      })}</script>
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "How to Start a Random Video Chat on Chatrio",
        "description": "Start a free, instant video chat with a stranger in seconds.",
        "step": [
          { "@type": "HowToStep", "position": 1, "name": "Sign in", "text": "Sign in with an email code or Google — no password needed." },
          { "@type": "HowToStep", "position": 2, "name": "Start Video Chat", "text": "Allow camera and microphone access, then click Start Video Chat." },
          { "@type": "HowToStep", "position": 3, "name": "Get matched instantly", "text": "You're matched with a real stranger and video starts immediately — no invite step." },
        ],
        "totalTime": "PT1M",
        "tool": [{ "@type": "HowToTool", "name": "Web browser with camera and microphone" }],
      })}</script>
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "Is Chatrio video chat free?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Random video chat on Chatrio is completely free — there are no per-minute fees, credits, or premium paywall to get matched. You just need a browser with a camera and microphone." } },
          { "@type": "Question", "name": "Do I need to download an app?", "acceptedAnswer": { "@type": "Answer", "text": "No. Chatrio runs in your web browser on phone or desktop, so there's nothing to install. Open the page, sign in, and start matching." } },
          { "@type": "Question", "name": "Why do I need to sign in?", "acceptedAnswer": { "@type": "Answer", "text": "A quick sign-in — an emailed code or Google, with no password — keeps the community accountable, reduces bots and throwaway accounts, and lets you add friends and reconnect with people you enjoyed talking to. It's free and takes a few seconds." } },
          { "@type": "Question", "name": "Can I video chat without turning on my camera?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. If you'd rather not be on camera, use Chatrio Text Chat instead — it matches you with a stranger for a typed conversation, with no camera or microphone needed." } },
          { "@type": "Question", "name": "Is random video chat safe?", "acceptedAnswer": { "@type": "Answer", "text": "Chatrio is for adults 18 and over. Your camera and microphone are only active during a call, you can skip anyone instantly, and you should never share personal or financial details with a stranger. See our Child Safety policy for how we handle abuse and underage use." } },
          { "@type": "Question", "name": "How does matching work?", "acceptedAnswer": { "@type": "Answer", "text": "Matching is random and instant — tap Start Video Chat and you're connected with another available person right away, with no invite or scheduling step. If you don't click, skip and you'll meet someone new in seconds." } }
        ]
      })}</script>
    </Helmet>
  );
}

function VideoChatSEO() {
  return (
    <section className="vc-seo" aria-label="About Chatrio random video chat">
      <p className="vc-seo-intro">
        Random video chat connects you face to face with a stranger, live, in a single tap.
        Chatrio matches you instantly with real people for free, browser-based video
        conversations — a modern, free alternative to classic random video chat sites like
        Omegle. Meet someone new, have a real conversation, and add the people you click with
        as friends.
      </p>

      <h2 className="vc-seo-h2">How random video chat works</h2>
      <ol className="vc-seo-steps">
        <li>
          <span className="vc-seo-step-n">1</span>
          <div>
            <b>Sign in</b>
            <p>Use an emailed code or Google — no password, and nothing to download.</p>
          </div>
        </li>
        <li>
          <span className="vc-seo-step-n">2</span>
          <div>
            <b>Start video chat</b>
            <p>Allow camera and microphone access, then tap <em>Start Video Chat</em>.</p>
          </div>
        </li>
        <li>
          <span className="vc-seo-step-n">3</span>
          <div>
            <b>Get matched instantly</b>
            <p>You're connected with a real stranger and video starts right away — no invite step. Skip anytime to meet someone new.</p>
          </div>
        </li>
      </ol>

      <h2 className="vc-seo-h2">Why chat on Chatrio</h2>
      <ul className="vc-seo-features">
        <li><b>Instant, random matching</b> — no invites, no scheduling, no waiting rooms.</li>
        <li><b>Add friends</b> — clicked with someone? Send a friend request and pick the conversation back up later.</li>
        <li><b>Prefer to type?</b> <Link to="/chat">Text Chat</Link> matches you with a stranger with no camera or mic needed.</li>
        <li><b>Skip anytime</b> — one tap moves you on to the next person.</li>
        <li><b>Free &amp; browser-based</b> — nothing to download; works on phone and desktop.</li>
      </ul>

      <h2 className="vc-seo-h2">Staying safe on video chat</h2>
      <p className="vc-seo-body">
        Chatrio is for adults 18 and over. Your camera and microphone are only active while
        you're in a call, you can skip anyone instantly, and you should never share personal
        or financial details with someone you've just met. Read our{" "}
        <Link to="/child-safety">Child Safety policy</Link> for how we handle abuse and
        underage use — or, if you'd rather meet people near you, explore local interest rooms
        in <Link to="/circles">Circles</Link>.
      </p>

      <h2 className="vc-seo-h2">Frequently asked questions</h2>
      <div className="vc-seo-faq">
        <details>
          <summary>Is Chatrio video chat free?</summary>
          <p>Yes. Random video chat on Chatrio is completely free — there are no per-minute fees, credits, or premium paywall to get matched. You just need a browser with a camera and microphone.</p>
        </details>
        <details>
          <summary>Do I need to download an app?</summary>
          <p>No. Chatrio runs in your web browser on phone or desktop, so there's nothing to install. Open the page, sign in, and start matching.</p>
        </details>
        <details>
          <summary>Why do I need to sign in?</summary>
          <p>A quick sign-in — an emailed code or Google, with no password — keeps the community accountable, reduces bots and throwaway accounts, and lets you add friends and reconnect with people you enjoyed talking to. It's free and takes a few seconds.</p>
        </details>
        <details>
          <summary>Can I video chat without turning on my camera?</summary>
          <p>Yes. If you'd rather not be on camera, use Chatrio <Link to="/chat">Text Chat</Link> instead — it matches you with a stranger for a typed conversation, with no camera or microphone needed.</p>
        </details>
        <details>
          <summary>Is random video chat safe?</summary>
          <p>Chatrio is for adults 18 and over. Your camera and microphone are only active during a call, you can skip anyone instantly, and you should never share personal or financial details with a stranger. See our <Link to="/child-safety">Child Safety policy</Link> for how we handle abuse and underage use.</p>
        </details>
        <details>
          <summary>How does matching work?</summary>
          <p>Matching is random and instant — tap Start Video Chat and you're connected with another available person right away, with no invite or scheduling step. If you don't click, skip and you'll meet someone new in seconds.</p>
        </details>
      </div>
    </section>
  );
}

export default function VideoChat() {
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("lobby");
  const [partnerId, setPartnerId] = useState<string>("");
  const [partnerUserId, setPartnerUserId] = useState<number | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const [notice, setNotice] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [countdownDeadline, setCountdownDeadline] = useState<number | null>(null);
  const [countdownNow, setCountdownNow] = useState(Date.now());
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("idle");
  const [hadCall, setHadCall] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const myIdRef = useRef<string>("");
  const localStreamRef = useRef<MediaStream | null>(null);
  const callRef = useRef<RandomVideoCallController | null>(null);
  const modeRef = useRef<Mode>("lobby");
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const lastTypingEmitRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const reconnectTargetRef = useRef<number | null>(
    Number(new URLSearchParams(window.location.search).get("reconnect")) || null
  );

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (countdownDeadline === null) return;
    const id = window.setInterval(() => setCountdownNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [countdownDeadline]);

  const showNotice = (text: string, ms = 2500) => {
    setNotice(text);
    if (ms > 0) setTimeout(() => setNotice(""), ms);
  };

  const ensureSocket = (): Socket => {
    if (socketRef.current) return socketRef.current;
    const socket = io(process.env.REACT_APP_API_BASE || "https://api.chatrio.app", {
      autoConnect: true,
      transports: ["websocket"],
      withCredentials: true,
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      myIdRef.current = socket.id || "";
    });

    socket.on("vc_waiting", () => setMode("waiting"));

    socket.on("vc_error", ({ code }) => {
      if (code === "AUTH_REQUIRED") {
        showNotice("Please log in again to use video chat.", 3000);
        navigate("/login", { state: { from: "/video-chat" }, replace: true });
      }
    });

    socket.on("vc_partner_found", ({ partnerId: pid, partnerUserId: puid }) => {
      reconnectTargetRef.current = null;
      setPartnerId(pid || "");
      setPartnerUserId(typeof puid === "number" ? puid : null);
      setRemoteStream(null);
      setMuted(false);
      setCameraOff(false);
      setMessages([]);
      setPartnerTyping(false);
      setFriendStatus("idle");
      setCountdownDeadline(null);
      setMode("connected");
      setHadCall(true);

      if (localStreamRef.current) {
        callRef.current = createRandomVideoCall({
          socket,
          myId: myIdRef.current,
          partnerId: pid,
          localStream: localStreamRef.current,
          onRemoteStream: setRemoteStream,
          onState: (state) => {
            if (state === "active") socket.emit("vc_connected");
          },
          onError: (msg) => showNotice(msg, 3000),
        });
      }
    });

    socket.on("vc_match_countdown", ({ seconds }) => {
      setCountdownDeadline(Date.now() + (Number(seconds) || 15) * 1000);
    });

    socket.on("vc_countdown_expired", () => {
      callRef.current?.teardown();
      callRef.current = null;
      setRemoteStream(null);
      setPartnerId("");
      setPartnerUserId(null);
      setPartnerTyping(false);
      setCountdownDeadline(null);
      showNotice("Time's up — finding someone new…", 2000);
      setTimeout(() => {
        setMode("waiting");
        socketRef.current?.emit("vc_ready_to_chat");
      }, 1200);
    });

    socket.on("vc_friend_left", () => {
      callRef.current?.teardown();
      callRef.current = null;
      setRemoteStream(null);
      setPartnerId("");
      setPartnerUserId(null);
      setPartnerTyping(false);
      setCountdownDeadline(null);
      showNotice("They left. Finding someone new…", 2000);
      setTimeout(() => {
        setMode("waiting");
        socketRef.current?.emit("vc_ready_to_chat");
      }, 1200);
    });

    socket.on("vc_friend_offline", () => {
      showNotice("That friend isn't in the video chat lobby right now.", 3000);
      reconnectTargetRef.current = null;
      setMode("waiting");
      socketRef.current?.emit("vc_ready_to_chat");
    });

    socket.on("vc_friend_request_sent", ({ status }) => {
      setFriendStatus(status === "accepted" ? "accepted" : "sent");
      showNotice(status === "accepted" ? "You're now friends! 🎉" : "Friend request sent.", 2500);
    });

    socket.on("vc_friend_request_received", ({ fromName, status }) => {
      if (status === "accepted") {
        setFriendStatus("accepted");
        showNotice("You're now friends! 🎉", 2500);
      } else {
        showNotice(`${fromName || "Stranger"} wants to add you as a friend.`, 3000);
      }
    });

    socket.on("vc_idle", () => setMode("lobby"));
    socket.on("vc_waiting_count", (n) => setWaitingCount(Number(n) || 0));

    ["vc_offer", "vc_answer", "vc_ice_candidate", "vc_end"].forEach((event) => {
      socket.on(event, (payload) => callRef.current?.handleSignal(event, payload));
    });

    socket.on("vc_message", (msg) => {
      setMessages((prev) => [...prev, { ...msg, status: undefined }]);
      socket.emit("vc_delivered", { msgId: msg.msgId });
    });
    socket.on("vc_partner_typing", ({ typing }) => setPartnerTyping(!!typing));
    socket.on("vc_msg_sent", ({ msgId }) => {
      setMessages((prev) => prev.map((m) => (m.msgId === msgId ? { ...m, status: "sent" } : m)));
    });
    socket.on("vc_msg_delivered", ({ msgId }) => {
      setMessages((prev) => prev.map((m) => (m.msgId === msgId ? { ...m, status: "delivered" } : m)));
    });

    return socket;
  };

  useEffect(() => {
    return () => {
      callRef.current?.teardown();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
  }, [mode]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, partnerTyping]);

  const startVideoChat = async () => {
    setPermissionError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const socket = ensureSocket();
      const friendId = reconnectTargetRef.current;
      const startEvent = () =>
        friendId
          ? socket.emit("vc_direct_connect", { friendUserId: friendId })
          : socket.emit("vc_ready_to_chat");
      if (socket.connected) startEvent();
      else socket.once("connect", startEvent);
      setMode("waiting");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotFoundError" || name === "OverconstrainedError") {
        setPermissionError("No camera or microphone found on this device.");
      } else {
        setPermissionError("Camera and microphone access is needed for video chat.");
      }
    }
  };

  const nextPartner = () => {
    setSkipConfirm(false);
    callRef.current?.teardown();
    callRef.current = null;
    setRemoteStream(null);
    setPartnerId("");
    setPartnerUserId(null);
    setMessages([]);
    setPartnerTyping(false);
    setCountdownDeadline(null);
    setFriendStatus("idle");
    setMode("waiting");
    socketRef.current?.emit("vc_next");
  };

  const addFriend = () => {
    if (!partnerUserId || friendStatus !== "idle") return;
    socketRef.current?.emit("vc_friend_request", { toUserId: partnerUserId });
  };

  const leaveVideoChat = () => {
    setSkipConfirm(false);
    callRef.current?.teardown();
    callRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setRemoteStream(null);
    setPartnerId("");
    setPartnerUserId(null);
    setMessages([]);
    setPartnerTyping(false);
    setCountdownDeadline(null);
    setFriendStatus("idle");
    socketRef.current?.emit("vc_disconnect_request");
    setMode("lobby");
  };

  const makeMsgId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const sendChatMessage = () => {
    const text = chatInput.trim();
    if (!text || mode !== "connected") return;
    const msgId = makeMsgId();
    setMessages((prev) => [...prev, { msgId, text, fromId: myIdRef.current, ts: Date.now(), status: "sending" }]);
    socketRef.current?.emit("vc_message", { msgId, text });
    setChatInput("");
    socketRef.current?.emit("vc_typing", { typing: false });
  };

  const handleChatInputChange = (val: string) => {
    setChatInput(val);
    if (mode !== "connected") return;
    const now = Date.now();
    if (now - lastTypingEmitRef.current > 250) {
      socketRef.current?.emit("vc_typing", { typing: val.trim().length > 0 });
      lastTypingEmitRef.current = now;
    }
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      socketRef.current?.emit("vc_typing", { typing: false });
    }, 1200);
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !cameraOff;
    stream.getVideoTracks().forEach((t) => (t.enabled = !next));
    setCameraOff(next);
  };

  if (authLoading) {
    return <div className="vc-page route-loading" role="status">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="vc-page vc-page-landing">
        <VideoChatHead />
        <div className="vc-lobby">
          <div className="vc-lobby-icon">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <h1 className="vc-lobby-title">Random Video Chat</h1>
          <p className="vc-lobby-sub">Instant · Face to face · Add friends</p>
          <button
            className="vc-start-btn"
            onClick={() => navigate("/login", { state: { from: "/video-chat" } })}
          >
            Sign In to Start
          </button>
          <p className="vc-lobby-note">
            Free with an email code or Google — takes a few seconds.
          </p>
        </div>
        <VideoChatSEO />
      </div>
    );
  }

  const countdownSeconds =
    countdownDeadline !== null ? Math.max(0, Math.ceil((countdownDeadline - countdownNow) / 1000)) : null;

  return (
    <div className="vc-page">
      <VideoChatHead />

      {mode === "lobby" && (
        <div className="vc-lobby">
          <div className="vc-lobby-icon">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <h1 className="vc-lobby-title">Random Video Chat</h1>
          <p className="vc-lobby-sub">
            {reconnectTargetRef.current ? "Reconnect · Instant · Face to face" : "Instant · Face to face · Add friends"}
          </p>
          {!!permissionError && <div className="vc-lobby-error">{permissionError}</div>}
          <button className="vc-start-btn" onClick={startVideoChat}>
            {reconnectTargetRef.current ? "Reconnect" : "Start Video Chat"}
          </button>
          <p className="vc-lobby-note">We'll ask for camera &amp; mic access when you start.</p>
        </div>
      )}

      {mode === "waiting" && (
        <div className="vc-waiting">
          <video ref={localVideoRef} className="vc-waiting-preview" autoPlay playsInline muted />
          <div className="vc-waiting-status">
            <span className="vc-spinner" />
            Finding someone for video chat…
          </div>
          {waitingCount > 1 && <p className="vc-waiting-count">{waitingCount} people waiting</p>}
          {!!notice && <div className="vc-notice">{notice}</div>}
          <button className="vc-cancel-btn" onClick={leaveVideoChat}>Cancel</button>
          <Link to="/chat" className="waiting-circles-promo">
            <span className="wcp-head">
              <span className="wcp-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </span>
              <span className="wcp-text">
                <b>{hadCall ? "Rather type than wait?" : "Camera shy or waiting too long?"}</b>
                <span>Text Chat matches you instantly — no camera or mic needed.</span>
              </span>
            </span>
            <span className="wcp-cta">Start Text Chat →</span>
          </Link>
        </div>
      )}

      {mode === "connected" && (
        <div className="video-call-overlay vc-connected">
          <video ref={remoteVideoRef} className="video-remote" autoPlay playsInline />
          {!remoteStream && <div className="video-calling-label">Connecting…</div>}
          <video ref={localVideoRef} className={`video-local${chatOpen ? " vc-shift-local" : ""}`} autoPlay playsInline muted />

          {countdownSeconds !== null && (
            <div className="vc-countdown-badge" aria-live="polite">{countdownSeconds}s</div>
          )}

          {!!notice && <div className="banner warning vc-connected-banner">{notice}</div>}

          <div className={`vc-chat-panel${chatOpen ? " vc-chat-open" : ""}`}>
            <div className="vc-chat-header">
              <span>Chat with Stranger</span>
              <button className="vc-chat-close" onClick={() => setChatOpen(false)} aria-label="Close chat">✕</button>
            </div>
            <div className="vc-chat-messages" role="log" aria-live="polite">
              {messages.map((m) => {
                const isYou = m.fromId === myIdRef.current;
                const ticks = isYou && (m.status === "delivered" ? "✓✓" : m.status === "sent" ? "✓" : "");
                return (
                  <div key={m.msgId} className={`vc-chat-row ${isYou ? "vc-chat-me" : "vc-chat-them"}`}>
                    <div className="vc-chat-bubble">
                      <span className="vc-chat-text">{m.text}</span>
                      <span className="vc-chat-meta">
                        {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {ticks && <span className="vc-chat-ticks"> {ticks}</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
              {partnerTyping && (
                <div className="vc-chat-row vc-chat-them">
                  <div className="vc-chat-bubble vc-chat-typing">
                    <span className="vc-typing-dot" /><span className="vc-typing-dot" /><span className="vc-typing-dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="vc-chat-composer">
              <input
                className="vc-chat-input"
                type="text"
                value={chatInput}
                placeholder="Message…"
                onChange={(e) => handleChatInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
              />
              <button className="vc-chat-send" onClick={sendChatMessage} disabled={!chatInput.trim()} aria-label="Send message">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>

          <div className="video-call-controls">
            <button className="video-ctrl-btn" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} title={muted ? "Unmute" : "Mute"}>
              {muted ? "🔇" : "🎙️"}
            </button>
            <button className="video-ctrl-btn" onClick={toggleCamera} aria-label={cameraOff ? "Turn camera on" : "Turn camera off"} title={cameraOff ? "Turn camera on" : "Turn camera off"}>
              {cameraOff ? "📷" : "🎥"}
            </button>
            <button className={`video-ctrl-btn${chatOpen ? " vc-ctrl-active" : ""}`} onClick={() => setChatOpen((v) => !v)} aria-label={chatOpen ? "Hide chat" : "Show chat"} title={chatOpen ? "Hide chat" : "Show chat"}>
              💬
            </button>
            {!!partnerUserId && (
              <button
                className={`vc-friend-btn${friendStatus !== "idle" ? " vc-friend-added" : ""}`}
                onClick={addFriend}
                disabled={friendStatus !== "idle"}
                aria-label="Add friend"
                title={friendStatus === "accepted" ? "You're friends!" : friendStatus === "sent" ? "Request sent" : "Add this person as a friend"}
              >
                {friendStatus === "accepted" ? "✓ Friends" : friendStatus === "sent" ? "Request sent" : "👋 Add Friend"}
              </button>
            )}
            {skipConfirm ? (
              <>
                <button className="video-hangup-btn" onClick={nextPartner}>Skip</button>
                <button className="video-ctrl-btn" onClick={() => setSkipConfirm(false)} aria-label="Cancel skip">✕</button>
              </>
            ) : (
              <button className="vc-skip-btn" onClick={() => setSkipConfirm(true)}>Skip</button>
            )}
            <button className="video-hangup-btn" onClick={leaveVideoChat} aria-label="End call" title="End call">
              End
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
