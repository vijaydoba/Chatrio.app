import React, { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { io, Socket } from "socket.io-client";
import { createRandomVideoCall, RandomVideoCallController } from "../randomVideoCall";
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

export default function VideoChat() {
  const [mode, setMode] = useState<Mode>("lobby");
  const [partnerId, setPartnerId] = useState<string>("");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const [notice, setNotice] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);

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

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

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
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      myIdRef.current = socket.id || "";
    });

    socket.on("vc_waiting", () => setMode("waiting"));

    socket.on("vc_partner_found", ({ partnerId: pid }) => {
      setPartnerId(pid || "");
      setRemoteStream(null);
      setMuted(false);
      setCameraOff(false);
      setMessages([]);
      setPartnerTyping(false);
      setMode("connected");

      if (localStreamRef.current) {
        callRef.current = createRandomVideoCall({
          socket,
          myId: myIdRef.current,
          partnerId: pid,
          localStream: localStreamRef.current,
          onRemoteStream: setRemoteStream,
          onState: () => {},
          onError: (msg) => showNotice(msg, 3000),
        });
      }
    });

    socket.on("vc_friend_left", () => {
      callRef.current?.teardown();
      callRef.current = null;
      setRemoteStream(null);
      setPartnerId("");
      setPartnerTyping(false);
      showNotice("They left. Finding someone new…", 2000);
      setTimeout(() => {
        setMode("waiting");
        socketRef.current?.emit("vc_ready_to_chat");
      }, 1200);
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
      if (socket.connected) socket.emit("vc_ready_to_chat");
      else socket.once("connect", () => socket.emit("vc_ready_to_chat"));
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
    setMessages([]);
    setPartnerTyping(false);
    setMode("waiting");
    socketRef.current?.emit("vc_next");
  };

  const leaveVideoChat = () => {
    setSkipConfirm(false);
    callRef.current?.teardown();
    callRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setRemoteStream(null);
    setPartnerId("");
    setMessages([]);
    setPartnerTyping(false);
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

  return (
    <div className="vc-page">
      <Helmet>
        <title>Random Video Chat – Talk Face to Face with Strangers | Chatrio</title>
        <meta name="description" content="Free random video chat with strangers. No sign-up, no account — just click start and get matched instantly." />
        <link rel="canonical" href="https://chatrio.app/video-chat" />
      </Helmet>

      {mode === "lobby" && (
        <div className="vc-lobby">
          <div className="vc-lobby-icon">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <h1 className="vc-lobby-title">Random Video Chat</h1>
          <p className="vc-lobby-sub">Anonymous · Instant · Face to face</p>
          {!!permissionError && <div className="vc-lobby-error">{permissionError}</div>}
          <button className="vc-start-btn" onClick={startVideoChat}>
            Start Video Chat
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
        </div>
      )}

      {mode === "connected" && (
        <div className="video-call-overlay vc-connected">
          <video ref={remoteVideoRef} className="video-remote" autoPlay playsInline />
          {!remoteStream && <div className="video-calling-label">Connecting…</div>}
          <video ref={localVideoRef} className={`video-local${chatOpen ? " vc-shift-local" : ""}`} autoPlay playsInline muted />

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
