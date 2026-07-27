import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { io, Socket } from "socket.io-client";
import DynamicIsland from "./DynamicIsland";
import { useKeyboardViewport } from "./useKeyboardViewport";
import "./App.css";

type MsgStatus = "sending" | "sent" | "delivered";
type Mode = "idle" | "waiting" | "connected" | "friend_left";
type Theme = "light" | "dark";

type Message = {
  msgId?: string;
  author: string;
  text?: string;
  image?: string;
  fromId?: string;
  ts: number;
  status?: MsgStatus;
  kind?: "user" | "system";
};

const ALL_TOPICS = [
  "music", "gaming", "coding", "movies", "sports",
  "travel", "food", "books", "art", "fitness",
];

const TOPIC_EMOJIS: Record<string, string> = {
  music: "🎵", gaming: "🎮", coding: "💻", movies: "🎬", sports: "⚽",
  travel: "✈️", food: "🍕", books: "📚", art: "🎨", fitness: "💪",
};

type ChatProps = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  soundOn: boolean;
  setSoundOn: (fn: (s: boolean) => boolean) => void;
};

export default function Chat({ theme, setTheme, soundOn, setSoundOn }: ChatProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("idle");
  const [username, setUsername] = useState("Stranger");
  const [nameDraft, setNameDraft] = useState("Stranger");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [myId, setMyId] = useState<string>("");
  const [partnerName, setPartnerName] = useState("Stranger");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [online, setOnline] = useState(1);
  const [waitingCount, setWaitingCount] = useState(0);
  const [notice, setNotice] = useState<string>("");
  // True once the user has had at least one chat this session — switches the
  // waiting-screen Circles promo to the "that chat is gone" wording.
  const [hadChat, setHadChat] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem("topics") || "[]")
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [chatBg, setChatBg] = useState(() => localStorage.getItem("chatBg") || "default");
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [matched, setMatched] = useState(false);
  const matchTimerRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const lastEmitRef = useRef<number>(0);
  const modeRef = useRef<Mode>("idle");

  // ✅ iOS detection
  const isIOS = useMemo(() => {
    const ua = navigator.userAgent || "";
    const iOS = /iPad|iPhone|iPod/.test(ua);
    const iPadOS = ua.includes("Mac") && "ontouchend" in document;
    return iOS || iPadOS;
  }, []);

  const USERNAME_MAX = 16;

  const sanitizeUsername = (raw: string) => {
    let v = raw.replace(/[^a-zA-Z0-9 _]/g, "");
    v = v.replace(/\s+/g, " ");
    if (v.length > USERNAME_MAX) v = v.slice(0, USERNAME_MAX);
    return v;
  };
  const onlineLabel = (n: number) => {
    if (n <= 4) return "A few online";
    if (n <= 19) return "Several online";
    if (n <= 99) return "Dozens online";
    return `${n} online`;
  };

  // Sounds
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ensureAudio = () => {
    if (!soundOn) return;
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) audioCtxRef.current = new Ctx();
    }
  };
  const beep = (f = 550, ms = 80, v = 0.05) => {
    if (!soundOn) return;
    ensureAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = f;
    gain.gain.value = v;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      osc.disconnect();
      gain.disconnect();
    }, ms);
  };
  const soundReceived = () => beep(420, 120, 0.06);

  // Block browser save / print shortcuts
  useEffect(() => {
    const block = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "p" || e.key === "u")) {
        e.preventDefault();
      }
      if (e.key === "PrintScreen") {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", block);
    return () => window.removeEventListener("keydown", block);
  }, []);

  // lock scroll only on mobile devices (where keyboard covers content)
  useEffect(() => {
    const body = document.body;
    const isMobile = window.innerWidth < 900 || isIOS;
    if (mode === "connected" && isMobile) body.style.overflow = "hidden";
    else body.style.overflow = "";
    return () => {
      body.style.overflow = "";
    };
  }, [mode, isIOS]);

  // close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setShowBgPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // persist bg choice
  useEffect(() => {
    localStorage.setItem("chatBg", chatBg);
  }, [chatBg]);

  // Fullscreen chat experience
  useEffect(() => {
    const body = document.body;
    if (mode === "connected") body.classList.add("chat-fullscreen");
    else body.classList.remove("chat-fullscreen");
    return () => body.classList.remove("chat-fullscreen");
  }, [mode]);

  // WhatsApp/Instagram-style: keep composer above the keyboard + list pinned to bottom.
  const scrollChatToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, []);
  useKeyboardViewport(mode === "connected", scrollChatToBottom);

  // Prefs
  useEffect(() => {
    localStorage.setItem("soundOn", soundOn ? "on" : "off");
  }, [soundOn]);

  useEffect(() => {
    localStorage.setItem("topics", JSON.stringify(selectedTopics));
  }, [selectedTopics]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // WhatsApp/Instagram: Auto-focus input when connected, blur when disconnected
  useEffect(() => {
    if (mode === "connected") {
      setTimeout(() => messageInputRef.current?.focus(), 100);
    } else {
      messageInputRef.current?.blur();
    }
  }, [mode]);

  // Remove Google's consent banner if it appears (fallback to CSS hiding)
  useEffect(() => {
    const removeConsentBanner = () => {
      const banners = document.querySelectorAll(
        '[class*="fc-"], [id*="fc-"], .fc-consent-root, .fc-message-root'
      );
      banners.forEach((el) => el.remove());
    };
    removeConsentBanner();
    const interval = setInterval(removeConsentBanner, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = io("https://api.chatrio.app", {
      autoConnect: true,
      transports: ["websocket"],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setMyId(socket.id || "");
      socket.emit("set_username", username);
      socket.emit("set_topics", { topics: selectedTopics });
      if (modeRef.current === "waiting") {
        socket.emit("ready_to_chat");
      }
    });

    socket.on("idle", () => resetChat("idle"));
    socket.on("waiting", () => resetChat("waiting"));

    socket.on("partner_found", ({ partner }) => {
      const name = partner || "Stranger";
      setPartnerName(name);
      setHadChat(true);
      setMessages([]);
      setPartnerTyping(false);
      // Let the Dynamic Island play its "matched" celebration, then open the chat.
      setMatched(true);
      if (matchTimerRef.current) window.clearTimeout(matchTimerRef.current);
      matchTimerRef.current = window.setTimeout(() => {
        matchTimerRef.current = null;
        setMatched(false);
        setMode("connected");
        pushSystem(`You're now connected with ${name}.`);
      }, 1100);
    });

    socket.on("friend_left", () => {
      setPartnerTyping(false);
      pushSystem("Your friend left. Finding someone new…");
      setTimeout(() => {
        setMessages([]);
        setMode("waiting");
        socketRef.current?.emit("ready_to_chat");
      }, 1500);
    });

    socket.on("message", (msg) => handleIncoming(msg));
    socket.on("image", (msg) => handleIncoming(msg));
    socket.on("partner_typing", ({ typing }) => setPartnerTyping(!!typing));
    socket.on("online", (n) => setOnline(Number(n) || 1));
    socket.on("waiting_count", (n) => setWaitingCount(Number(n) || 0));
    socket.on("msg_sent", ({ msgId }) => updateStatus(msgId, "sent"));
    socket.on("msg_delivered", ({ msgId }) => updateStatus(msgId, "delivered"));

    return () => {
      socket.disconnect();
    };
  }, []);

  const resetChat = (newMode: Mode) => {
    if (matchTimerRef.current) {
      window.clearTimeout(matchTimerRef.current);
      matchTimerRef.current = null;
    }
    setMatched(false);
    setMode(newMode);
    setMessages([]);
    setPartnerTyping(false);
  };

  const handleIncoming = (msg: Message) => {
    addMessage({ ...msg, kind: "user" });
    socketRef.current?.emit("delivered", { msgId: msg.msgId });
    if (msg.fromId?.startsWith("bot_")) {
      setMessages((prev) =>
        prev.map((m) => m.status ? { ...m, status: "delivered" } : m)
      );
    }
    soundReceived();
  };

  const updateStatus = (msgId: string, status: MsgStatus) => {
    setMessages((p) =>
      p.map((m) => (m.msgId === msgId ? { ...m, status } : m))
    );
  };

  const showNotice = (text: string, ms = 1500) => {
    setNotice(text);
    if (ms > 0) setTimeout(() => setNotice(""), ms);
  };

  const addMessage = (msg: Message) => {
    setMessages((p) => [...p, { ...msg, ts: msg.ts || Date.now() }]);
  };

  const pushSystem = (text: string) => {
    addMessage({ author: "System", text, ts: Date.now(), kind: "system" });
  };

  const applyName = () => {
    const cleaned = sanitizeUsername(nameDraft).trim();
    if (cleaned.length < 2) {
      showNotice("Name must be at least 2 characters.", 2000);
      setNameDraft(username);
      return;
    }
    const next = cleaned || "Stranger";
    setUsername(next);
    setNameDraft(next);
    socketRef.current?.emit("set_username", next);
    pushSystem(`You set your name to “${next}”.`);
  };

  const toggleTopic = (t: string) => {
    if (mode === "connected") return;
    const next = selectedTopics.includes(t)
      ? selectedTopics.filter((x) => x !== t)
      : [...selectedTopics, t];
    setSelectedTopics(next);
    socketRef.current?.emit("set_topics", { topics: next });
    pushSystem(`Interests updated: #${next.join(" #") || "none"}.`);
  };

  const startNewChat = () => {
    if (mode === "waiting" || mode === "connected") return;
    if (!socketRef.current?.connected) {
      showNotice("Cannot connect to server. Please try again.", 3000);
      return;
    }
    socketRef.current.emit("set_username", username);
    socketRef.current.emit("set_topics", { topics: selectedTopics });
    socketRef.current.emit("ready_to_chat");
    setMode("waiting");
  };

  const nextChat = () => {
    socketRef.current?.emit("next");
    resetChat("waiting");
  };

  const leaveChat = () => {
    socketRef.current?.emit("disconnect_request");
    resetChat("idle");
  };

  const reportAndNext = () => {
    socketRef.current?.emit("report_partner");
    resetChat("waiting");
    showNotice("Partner reported. Finding someone new…");
    socketRef.current?.emit("next");
  };

  // Typing
  const typingTimeoutRefAny = typingTimeoutRef as any;
  const handleInputChange = (val: string) => {
    setInput(val);
    if (mode !== "connected") return;
    const now = Date.now();
    if (now - lastEmitRef.current > 250) {
      socketRef.current?.emit("typing", { typing: val.trim().length > 0 });
      lastEmitRef.current = now;
    }
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRefAny.current = window.setTimeout(() => {
      socketRef.current?.emit("typing", { typing: false });
    }, 1200);
  };

  const makeId = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const sendMessage = () => {
    if (!input.trim() || mode !== "connected") return;
    const msgId = makeId();
    addMessage({
      msgId,
      author: username,
      text: input,
      fromId: myId,
      ts: Date.now(),
      status: "sending",
      kind: "user",
    });
    socketRef.current?.emit("message", { msgId, text: input });
    setInput("");
    socketRef.current?.emit("typing", { typing: false });
    // Keep the keyboard open so the user can keep chatting without re-tapping the input.
    messageInputRef.current?.focus();
  };

  const onPickFile = (file?: File | null) => {
    if (!file || mode !== "connected") return;
    if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
      showNotice("Only images can be sent.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      showNotice("Please select an image.");
      return;
    }
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const maxSide = 1280;
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          const ratio = width / height;
          if (ratio > 1) {
            width = maxSide;
            height = Math.round(maxSide / ratio);
          } else {
            height = maxSide;
            width = Math.round(maxSide * ratio);
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          showNotice("Failed to process image");
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
        if (approxBytes > 2 * 1024 * 1024) {
          showNotice("Image too large (>2MB).");
          return;
        }
        const msgId = makeId();
        addMessage({
          msgId,
          author: username,
          image: dataUrl,
          fromId: myId,
          ts: Date.now(),
          status: "sending",
          kind: "user",
        });
        socketRef.current?.emit("image", { msgId, image: dataUrl });
      };
      img.onerror = () => showNotice("Could not load image.");
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const bubble = (m: Message, i: number) => {
    if (m.kind === "system") {
      return (
        <div key={i} className="bubble-row center">
          <div className="bubble system">{m.text}</div>
        </div>
      );
    }
    const isYou = m.fromId === myId;
    const prev = i > 0 ? messages[i - 1] : null;
    const next = i < messages.length - 1 ? messages[i + 1] : null;
    const sameAsPrev = prev?.kind === "user" && prev.fromId === m.fromId;
    const sameAsNext = next?.kind === "user" && next.fromId === m.fromId;
    const ticks =
      isYou &&
      (m.status === "delivered" ? "✓✓" : m.status === "sent" ? "✓" : "");
    return (
      <div key={i} className={`bubble-row ${isYou ? "right" : "left"}${sameAsPrev ? " grouped" : ""}`}>
        {!isYou && (
          <div className="msg-avatar-wrap">
            {!sameAsNext
              ? <div className="avatar-circle">{(m.author?.[0] || "?").toUpperCase()}</div>
              : <div className="avatar-spacer" />}
          </div>
        )}
        <div className={`bubble ${isYou ? "me" : "other"}${sameAsPrev ? " no-tail" : ""}`}>
          {m.image ? (
            <div className="img-shield-wrap">
              <img
                className="bubble-image"
                src={m.image}
                alt=""
                draggable={false}
              />
              <div
                className="img-shield"
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          ) : (
            <div className="bubble-text">{m.text}</div>
          )}
          <div className="bubble-meta">
            <span className="bubble-time">
              {new Date(m.ts).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {ticks && <span className="bubble-ticks">{ticks}</span>}
          </div>
        </div>
      </div>
    );
  };

  const atBottom = useMemo(() => {
    const el = chatScrollRef.current;
    if (!el) return true;
    const threshold = 64;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, [messages.length]);

  useEffect(() => {
    if (atBottom) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages, atBottom]);

  // Always scroll to bottom on new messages (don't wait for atBottom check on mobile)
  useEffect(() => {
    if (mode === "connected" && messages.length > 0) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages.length, mode]);

  const nudgeToBottom = () => {
    if (modeRef.current !== "connected") return;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  return (
    <div
      className={`chat-container ${mode} ${mode === "connected" ? "tg" : ""}`}
    >
      <Helmet>
        <title>Free Random Chat – Talk to Strangers | Chatrio</title>
        <meta name="description" content="Start a free anonymous chat with a random stranger right now. No sign-up, no account. Choose your interests and click New Chat — instant connection." />
        <link rel="canonical" href="https://chatrio.app/chat" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Free Random Chat – Talk to Strangers | Chatrio" />
        <meta property="og:description" content="Anonymous random chat. No sign-up needed. Meet strangers instantly." />
        <meta property="og:url" content="https://chatrio.app/chat" />
        <meta property="og:image" content="https://chatrio.app/branding/chatrio-512.png?v=2" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Free Random Chat – Chatrio" />
        <meta name="twitter:description" content="Anonymous random chat with strangers. No sign-up needed." />
      </Helmet>
      {mode === "connected" ? (
        <div className="tg-topbar">
          <button
            className="icon-btn"
            onClick={() => { socketRef.current?.emit("disconnect_request"); navigate("/"); }}
            aria-label="Go to home"
            title="Home"
          >
            ←
          </button>

          <div className="tg-avatar-name">
            <div className="tg-avatar">{(partnerName?.[0] || "?").toUpperCase()}</div>
            <div className="tg-center">
              <div className="tg-name">{partnerName}</div>
              <div className="tg-sub">
                {partnerTyping ? "typing…" : "online"}
              </div>
            </div>
          </div>

          <div className="tg-actions">
            <div className="tg-menu-wrap" ref={menuRef}>
              <button
                className="icon-btn"
                onClick={() => { setMenuOpen((v) => !v); setShowBgPicker(false); }}
                aria-label="More options"
                title="More options"
              >
                ⋮
              </button>

              {menuOpen && (
                <div className="tg-dropdown">
                  {!showBgPicker ? (
                    <>
                      <button className="tg-dd-item" onClick={() => setShowBgPicker(true)}>
                        <span className="tg-dd-icon">🎨</span> Change Background
                      </button>
                      <button className="tg-dd-item" onClick={() => { setMessages([]); setMenuOpen(false); }}>
                        <span className="tg-dd-icon">🗑️</span> Clear Chat
                      </button>
                      <button className="tg-dd-item tg-dd-danger" onClick={() => { setMenuOpen(false); reportAndNext(); }}>
                        <span className="tg-dd-icon">🚩</span> Report
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="tg-dd-label">Pick a background</div>
                      <div className="tg-bg-grid">
                        {[
                          { id: "default", label: "Default", style: {} },
                          { id: "dots",    label: "Dots",    style: {} },
                          { id: "gradient-purple", label: "Purple", style: {} },
                          { id: "gradient-ocean",  label: "Ocean",  style: {} },
                          { id: "dark-solid",      label: "Dark",   style: {} },
                        ].map((bg) => (
                          <button
                            key={bg.id}
                            className={`tg-bg-swatch tg-bg-${bg.id} ${chatBg === bg.id ? "active" : ""}`}
                            onClick={() => { setChatBg(bg.id); setMenuOpen(false); setShowBgPicker(false); }}
                            title={bg.label}
                          >
                            {chatBg === bg.id && <span className="tg-bg-check">✓</span>}
                          </button>
                        ))}
                      </div>
                      <button className="tg-dd-item tg-dd-back" onClick={() => setShowBgPicker(false)}>
                        ← Back
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── LOBBY TOPBAR ── */
        <div className="lobby-topbar">
          {theme === "dark" ? (
            <DynamicIsland
              state={matched ? "matched" : mode === "waiting" ? "searching" : "idle"}
              onlineLabel={onlineLabel(online)}
              waitingCount={waitingCount}
              partnerName={partnerName}
            />
          ) : (
            <div className="lobby-status">
              <span className="lobby-live-dot" />
              <span className="lobby-online-text">{onlineLabel(online)}</span>
            </div>
          )}
          <div className="lobby-topbar-actions">
            <button className="lobby-icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
              {theme === "dark"
                ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              }
            </button>
            <button className="lobby-icon-btn" onClick={() => setSoundOn((s) => !s)} aria-label="Toggle sound">
              {soundOn
                ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
                : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── LOBBY: idle ── */}
      {mode === "idle" && (
        <div className="lobby">

          <div className="lobby-hero">
            <div className="lobby-icon">
              <svg viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M44 28a6 6 0 01-6 6H14l-8 8V10a6 6 0 016-6h26a6 6 0 016 6z"/>
                <circle cx="18" cy="22" r="2" fill="white" stroke="none"/>
                <circle cx="26" cy="22" r="2" fill="white" stroke="none"/>
                <circle cx="34" cy="22" r="2" fill="white" stroke="none"/>
              </svg>
            </div>
            <h2 className="lobby-title">Meet someone new</h2>
            <p className="lobby-sub">Anonymous · Instant · Real</p>
          </div>

          <div className="lobby-card">
            <div className="lobby-field">
              <label className="lobby-label">Your name</label>
              <div className="lobby-name-row">
                <input
                  className="lobby-input"
                  type="text"
                  value={nameDraft}
                  placeholder="Enter a name…"
                  onChange={(e) => setNameDraft(sanitizeUsername(e.target.value))}
                />
                <button className="lobby-save-btn" onClick={applyName} disabled={nameDraft.trim() === username}>
                  Save
                </button>
              </div>
            </div>

            <div className="lobby-field">
              <label className="lobby-label">
                Match by interest
                <span className="lobby-opt"> · optional</span>
              </label>
              <div className="lobby-chips" role="group" aria-label="Interests">
                {ALL_TOPICS.map((t) => {
                  const active = selectedTopics.includes(t);
                  return (
                    <button key={t} className={`lchip${active ? " lchip-on" : ""}`} onClick={() => toggleTopic(t)} aria-pressed={active}>
                      <span className="lchip-emoji">{TOPIC_EMOJIS[t]}</span>{t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {!!notice && <div className="lobby-notice">{notice}</div>}

          <button className="lobby-start-btn" onClick={startNewChat}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            New Chat
          </button>
        </div>
      )}

      {/* ── WAITING ── */}
      {mode === "waiting" && (
        <div className="lobby-waiting">
          <div className={`waiting-anim${matched ? " matched" : ""}`}>
            <div className="waiting-ring" />
            <div className="waiting-ring" />
            <div className="waiting-ring" />
            <div className="waiting-core">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
          </div>
          <p className="waiting-title">{matched ? "Connected!" : "Finding someone for you…"}</p>
          {matched
            ? <p className="waiting-sub">Say hi to {partnerName} 👋</p>
            : waitingCount > 1 && <p className="waiting-sub">{waitingCount} people waiting</p>}
          {!matched && <button className="waiting-cancel" onClick={leaveChat}>Cancel</button>}
          {!matched && (
            <Link to="/circles" className="waiting-circles-promo">
              <span className="wcp-head">
                <span className="wcp-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </span>
                <span className="wcp-text">
                  <b>{hadChat ? "That person is gone forever." : "Waiting too long?"}</b>
                  <span>
                    {hadChat
                      ? "On Circles, people near you stick around — chat again anytime."
                      : "Real people might be right near you — anonymous, no account."}
                  </span>
                </span>
              </span>
              <span className="wcp-cta">See who's near you →</span>
            </Link>
          )}
        </div>
      )}

      {/* ── CONNECTED: full-screen chat ── */}
      {mode === "connected" && (
        <>
          <div className={`chat tg-chat tg-bg-${chatBg}`} ref={chatScrollRef} role="log" aria-live="polite">
            {messages.map(bubble)}
            {partnerTyping && (
              <div className="bubble-row left typing-row-wa">
                <div className="msg-avatar-wrap">
                  <div className="avatar-circle">{(partnerName?.[0] || "?").toUpperCase()}</div>
                </div>
                <div className="bubble other typing-bubble-wa">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {!!notice && <div className="banner">{notice}</div>}

          <div className="composer tg-composer">
            {skipConfirm ? (
              <div className="skip-confirm-row">
                <span className="skip-confirm-label">Skip this chat?</span>
                <button className="skip-confirm-yes" onClick={() => { setSkipConfirm(false); nextChat(); }}>Skip</button>
                <button className="skip-confirm-no" onClick={() => setSkipConfirm(false)}>Cancel</button>
              </div>
            ) : (
              <button className="btn tg-skip-btn" onClick={() => setSkipConfirm(true)} aria-label="Skip" title="Skip to next stranger">
                Skip
              </button>
            )}
            <button className="btn tg-attach" onClick={openFilePicker} aria-label="Attach image" title="Send a photo">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <input
              ref={messageInputRef}
              className="input flex-1"
              type="text"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              onFocus={nudgeToBottom}
              onClick={nudgeToBottom}
              placeholder="Message…"
            />
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onPickFile(e.target.files?.[0] || null)} />
            <button className="btn tg-send" onMouseDown={(e) => e.preventDefault()} onClick={sendMessage} disabled={!input.trim()}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </>
      )}

    </div>
  );
}
