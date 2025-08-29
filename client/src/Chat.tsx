import React, { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
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
  "music",
  "gaming",
  "coding",
  "movies",
  "sports",
  "travel",
  "food",
  "books",
  "art",
  "fitness",
];

export default function Chat() {
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
  const [selectedTopics, setSelectedTopics] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem("topics") || "[]")
  );
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) || "light"
  );
  const [soundOn, setSoundOn] = useState(
    () => localStorage.getItem("soundOn") !== "off"
  );
  const [lightbox, setLightbox] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const lastEmitRef = useRef<number>(0);
  const modeRef = useRef<Mode>("idle");

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
  const soundSent = () => beep(620, 70, 0.06);
  const soundReceived = () => beep(420, 120, 0.06);

  // lock scroll when connected
  useEffect(() => {
    const body = document.body;
    if (mode === "connected") {
      body.style.overflow = "hidden";
    } else {
      body.style.overflow = "";
    }
    return () => {
      body.style.overflow = "";
    };
  }, [mode]);

  // Prefs to localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem("soundOn", soundOn ? "on" : "off");
  }, [soundOn]);
  useEffect(() => {
    localStorage.setItem("topics", JSON.stringify(selectedTopics));
  }, [selectedTopics]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Log mode changes
  useEffect(() => {
    console.log("Mode updated to:", mode);
  }, [mode]);

  // Socket
  useEffect(() => {
    const socket = io(
      process.env.REACT_APP_API_URL || "https://chatrio-app-2.onrender.com",
      {
        autoConnect: true,
        transports: ["websocket"],
        withCredentials: true,
      }
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      setMyId(socket.id || "");
      if (modeRef.current === "waiting") {
        socket.emit("ready_to_chat");
      } else if (modeRef.current === "connected") {
        socket.emit("disconnect_request");
        setMode("idle");
        setMessages([]);
        setPartnerTyping(false);
        pushSystem("Reconnected. Start a new chat.");
      }
      socket.emit("set_username", username);
      socket.emit("set_topics", { topics: selectedTopics });
    });

    socket.on("idle", () => resetChat("idle"));
    socket.on("waiting", () => resetChat("waiting"));
    socket.on("partner_found", ({ partner }) => {
      const name = partner || "Stranger";
      setPartnerName(name);
      setMode("connected");
      setMessages([]);
      setPartnerTyping(false);
      pushSystem(`You're now connected with ${name}.`);
    });

    socket.on("friend_left", () => {
      setMode("friend_left");
      setPartnerTyping(false);
      pushSystem("Your friend left the chat.");
      setTimeout(() => resetChat("idle"), 1500);
    });

    socket.on("message", (msg) => handleIncoming(msg));
    socket.on("image", (msg) => handleIncoming(msg));

    socket.on("partner_typing", ({ typing }) => setPartnerTyping(!!typing));
    socket.on("online", (n) => setOnline(Number(n) || 1));
    socket.on("waiting_count", (n) => setWaitingCount(Number(n) || 0));

    socket.on("msg_sent", ({ msgId }) => updateStatus(msgId, "sent"));
    socket.on("msg_delivered", ({ msgId }) => updateStatus(msgId, "delivered"));

    socket.on("rate_limited", ({ retryAfterMs }) => {
      const secs = Math.ceil((retryAfterMs ?? 0) / 1000);
      showNotice(`Rate limited — try again in ${secs}s`);
    });
    socket.on("image_rejected", ({ reason }) => {
      showNotice(reason || "Image was rejected");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const resetChat = (newMode: Mode) => {
    setMode(newMode);
    setMessages([]);
    setPartnerTyping(false);
  };

  const handleIncoming = (msg: Message) => {
    addMessage({ ...msg, kind: "user" });
    socketRef.current?.emit("delivered", { msgId: msg.msgId });
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
    const next = nameDraft.trim() || "Stranger";
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
    if (mode !== "idle") return;
    if (!socketRef.current?.connected) {
      showNotice("Cannot connect to server. Please try again.", 3000);
      return;
    }
    setMode("waiting");
    socketRef.current.emit("ready_to_chat");
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
  };

  const onPickFile = (file?: File | null) => {
    if (!file || mode !== "connected") return;
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

  const canEditName = true; // always editable

  const bubble = (m: Message, i: number) => {
    if (m.kind === "system") {
      return (
        <div key={i} className="bubble-row center">
          <div className="bubble system">{m.text}</div>
        </div>
      );
    }
    const isYou = m.fromId === myId;
    const ticks =
      isYou &&
      (m.status === "delivered" ? "✓✓" : m.status === "sent" ? "✓" : "");
    return (
      <div key={i} className={`bubble-row ${isYou ? "right" : "left"}`}>
        <div className={`bubble ${isYou ? "me" : "other"}`}>
          <div className="bubble-author">{isYou ? username : m.author}</div>
          {m.image ? (
            <img
              className="bubble-image"
              src={m.image}
              alt="Sent"
              onClick={() => setLightbox(m.image!)}
            />
          ) : (
            <div>{m.text}</div>
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
    if (atBottom)
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, atBottom]);

  return (
    <div className={`container ${mode}`}>
      <div className="header">
        <h1 className="title">Chatrio</h1>
        <div className="header-right">
          <div className="online-pill">{online} online</div>
          <button
            className="btn theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>
          <button
            className="btn theme-toggle"
            onClick={() => setSoundOn((s) => !s)}
          >
            {soundOn ? "🔊 Sound" : "🔈 Muted"}
          </button>
        </div>
      </div>

      {/* Name row */}
      <div className="row gap">
        <input
          className="input"
          type="text"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          disabled={!canEditName}
        />
        <button
          className="btn"
          onClick={applyName}
          disabled={nameDraft.trim() === username}
        >
          Set Name
        </button>
      </div>

      {/* Topics hidden when connected */}
      {mode !== "connected" && (
        <div className="topics" role="group" aria-label="Interests">
          {ALL_TOPICS.map((t) => {
            const active = selectedTopics.includes(t);
            return (
              <button
                key={t}
                className={`chip ${active ? "chip-active" : ""}`}
                onClick={() => toggleTopic(t)}
                aria-pressed={active}
              >
                #{t}
              </button>
            );
          })}
        </div>
      )}

      {/* Status */}
      {mode === "idle" && (
        <div className="mb-12">
          <div className="text-muted mb-8">
            Choose interests (optional) and click <strong>New Chat</strong>.
          </div>
          <button className="btn btn-primary" onClick={startNewChat}>
            New Chat
          </button>
        </div>
      )}
      {mode === "waiting" && (
        <div className="mb-12">
          Looking for a stranger…{" "}
          {waitingCount > 0 ? `(${waitingCount} waiting)` : ""}
          <div className="mt-8">
            <button className="btn btn-danger" onClick={leaveChat}>
              Cancel &amp; Go Idle
            </button>
          </div>
        </div>
      )}
      {mode === "friend_left" && (
        <div className="banner warning">Your friend left the chat.</div>
      )}

      {mode === "connected" && (
        <div className="status">
          Connected with <span className="status-name">{partnerName}</span>!
          <div className="typing-row">
            {partnerTyping && (
              <span className="typing" aria-live="polite">
                Partner is typing…
              </span>
            )}
          </div>
          <div
            className="mt-8"
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <button className="btn btn-primary" onClick={nextChat}>
              Next
            </button>
            <button className="btn btn-danger" onClick={leaveChat}>
              Leave Chat
            </button>
            <button className="btn btn-danger" onClick={reportAndNext}>
              Report &amp; Next
            </button>
          </div>
        </div>
      )}

      {/* Chat */}
      <div
        className="chat"
        ref={chatScrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map(bubble)}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator at the bottom */}
      {mode === "connected" && partnerTyping && (
        <div className="typing-row typing-bottom">
          <span className="typing">Partner is typing…</span>
        </div>
      )}

      {/* Notice */}
      {!!notice && <div className="banner">{notice}</div>}

      {/* Composer */}
      <div className="composer">
        <input
          className="input flex-1"
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={mode !== "connected"}
          placeholder={
            mode === "connected" ? "Say hi…" : "Start a chat to type"
          }
        />
        <button
          className="btn"
          onClick={openFilePicker}
          disabled={mode !== "connected"}
          title="Send photo"
        >
          📷
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => onPickFile(e.target.files?.[0] || null)}
        />
        <button
          className="btn"
          onClick={sendMessage}
          disabled={mode !== "connected" || !input.trim()}
        >
          Send
        </button>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Full size" className="lightbox-img" />
        </div>
      )}
    </div>
  );
}
