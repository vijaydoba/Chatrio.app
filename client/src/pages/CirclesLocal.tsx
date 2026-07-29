import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { NavLink } from "react-router-dom";
import { Socket } from "socket.io-client";
import {
  circles, connectCirclesSocket, enableWebPush, resyncWebPush, webPushSupported,
  Me, NearbyUser, Incoming, Thread, DmMsg, Group, MyGroup, GroupMsg, BlockedUser, Gender,
} from "../circlesApi";
import { useKeyboardViewport } from "../useKeyboardViewport";
import "./circles-local.css";

type Tab = "nearby" | "requests" | "chats" | "groups";
type Active = { otherId: number; nickname: string; avatar?: number; gender?: Gender } | null;
type ActiveGroup = { id: number; name: string; emoji: string } | null;

// ── small presentational helpers ──
const fmtTime = (ms: number) =>
  ms ? new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
const initials = (name: string) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
};
const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};
// Per-user avatar gradient so a list reads as distinct people (0 = brand fallback).
const avClass = (name: string) => {
  const n = hashStr(name || "?") % 6;
  return n === 0 ? "cl-avatar" : `cl-avatar cl-av-${n}`;
};
// Deterministic emoji per group (no backend field needed): keyword match first, hash fallback.
const GROUP_EMOJI_KEYWORDS: Array<[RegExp, string]> = [
  [/coffee|cafe|café|tea|brunch/i, "☕"],
  [/night|late|midnight|moon/i, "🌙"],
  [/gam(e|er|ing)|play|chess/i, "🎮"],
  [/run|walk|hike|gym|fit|sport|yoga/i, "🏃"],
  [/music|song|sing|concert|band/i, "🎵"],
  [/food|pizza|eat|dinner|lunch|snack/i, "🍕"],
  [/book|read|study|writ/i, "📚"],
  [/art|draw|paint|photo|design/i, "🎨"],
  [/football|soccer|cricket|basket/i, "⚽"],
  [/movie|film|series|show/i, "🎬"],
  [/dog|cat|pet/i, "🐾"],
  [/park|garden|nature|beach/i, "🌿"],
];
const GROUP_EMOJI_FALLBACK = ["💬", "✨", "🎈", "🌟", "🪩"];
const groupEmoji = (name: string, topic = "") => {
  const s = `${name} ${topic}`;
  for (const [re, e] of GROUP_EMOJI_KEYWORDS) if (re.test(s)) return e;
  return GROUP_EMOJI_FALLBACK[hashStr(name || "#") % GROUP_EMOJI_FALLBACK.length];
};
// Seen in the last 5 minutes counts as "Active now" — matches the server's
// ACTIVE_WINDOW_MS, which also decides nearby-list sort order (server rounds last_seen to the minute).
const isActive = (lastSeen?: number) => !!lastSeen && Date.now() - lastSeen < 5 * 60 * 1000;
const timeAgo = (ms: number) => {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};
const dayLabel = (ms: number) => {
  const d = new Date(ms);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(d)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};
const NICK_IDEAS = ["NightOwl", "Wanderer", "CoffeeFan", "Dreamer", "StarGazer", "Maverick", "Echo", "Nova", "Drift", "Sunny"];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "female", label: "Woman" },
  { value: "male", label: "Man" },
  { value: "trans", label: "Trans" },
  { value: "other", label: "Other" },
];

// ── anime avatars (DiceBear, generated in the browser — no network, seeded by nickname) ──
// Hairstyle pools from @dicebear/adventurer's own option set (schema.d.ts): short01-19, long01-26.
const MALE_HAIR = Array.from({ length: 19 }, (_, i) => `short${String(i + 1).padStart(2, "0")}`);
const FEMALE_HAIR = Array.from({ length: 26 }, (_, i) => `long${String(i + 1).padStart(2, "0")}`);

// Bias the generated look toward the chosen gender (hairstyle pool, earrings, facial
// hair) — "trans"/"other"/unset gets the full unrestricted pool (today's default look).
function avatarOptionsForGender(gender?: Gender) {
  if (gender === "male") return { hair: MALE_HAIR, earringsProbability: 0, features: ["mustache", "blush", "birthmark", "freckles"] };
  if (gender === "female") return { hair: FEMALE_HAIR, earringsProbability: 40, features: ["blush", "birthmark", "freckles"] };
  return {};
}

const avatarUriCache = new Map<string, string>();
let dicebearMods: Promise<[typeof import("@dicebear/core"), typeof import("@dicebear/collection")]> | null = null;
const loadDicebear = () => {
  if (!dicebearMods) dicebearMods = Promise.all([import("@dicebear/core"), import("@dicebear/collection")]);
  return dicebearMods;
};

function useAnimeAvatar(seed: string, gender?: Gender): string {
  const cacheKey = gender ? `${seed}|${gender}` : seed;
  const [uri, setUri] = useState<string>(() => avatarUriCache.get(cacheKey) || "");
  useEffect(() => {
    const cached = avatarUriCache.get(cacheKey);
    if (cached) { setUri(cached); return; }
    let alive = true;
    loadDicebear()
      .then(([core, coll]) => {
        const u = core.createAvatar(coll.adventurer, { seed, ...(avatarOptionsForGender(gender) as any) }).toDataUri();
        avatarUriCache.set(cacheKey, u);
        if (alive) setUri(u);
      })
      .catch(() => { /* initials fallback stays */ });
    return () => { alive = false; };
  }, [cacheKey, seed, gender]);
  return uri;
}

// Anime face over the per-user gradient; initials show until the SVG is ready.
// `variant` is the user-chosen shuffle (stored server-side); 0 = seed by name alone.
function Av({ name, variant, gender, small, dot, className = "" }: { name: string; variant?: number; gender?: Gender; small?: boolean; dot?: boolean; className?: string }) {
  const uri = useAnimeAvatar(variant ? `${name}#${variant}` : name, gender);
  return (
    <span className={`${avClass(name)}${small ? " cl-avatar-sm" : ""}${className ? ` ${className}` : ""}`} aria-hidden="true">
      {uri ? <img className="cl-avatar-img" src={uri} alt="" /> : initials(name)}
      {dot && <span className="cl-on-dot" />}
    </span>
  );
}

// Distance label → km (labels are fuzzy buckets, never exact coords).
const parseKm = (d: string) => {
  const mk = (d || "").match(/([\d.]+)\s*km/i);
  if (mk) return parseFloat(mk[1]);
  const mm = (d || "").match(/([\d.]+)\s*m\b/i);
  if (mm) return parseFloat(mm[1]) / 1000;
  return 0.25; // "very close"
};
// Activate a non-button clickable element from the keyboard (Enter / Space).
const keyActivate = (fn: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

// Inline SVG icons (crisp + labelable; no emoji glyphs).
const svg = (paths: React.ReactNode, size = 22) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>
);
const Ic = {
  back: svg(<path d="M15 18l-6-6 6-6" />),
  flag: svg(<><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></>, 18),
  leave: svg(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>, 18),
  refresh: svg(<><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></>, 16),
  send: svg(<><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>, 18),
  chevron: svg(<path d="M9 18l6-6-6-6" />, 20),
  plus: svg(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>, 18),
  minus: svg(<line x1="5" y1="12" x2="19" y2="12" />, 18),
  pin: svg(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>, 26),
  bell: svg(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>, 20),
  bellOff: svg(<><path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M18.63 13A17.89 17.89 0 0 1 18 8" /><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" /><path d="M18 8a6 6 0 0 0-9.33-5" /><line x1="1" y1="1" x2="23" y2="23" /></>, 20),
  // tab icons
  radar: svg(<><circle cx="12" cy="12" r="2.4" /><circle cx="12" cy="12" r="6.5" opacity="0.55" /><circle cx="12" cy="12" r="10" opacity="0.3" /></>, 17),
  users: svg(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>, 17),
  inbox: svg(<><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>, 17),
  chat: svg(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />, 17),
  pinSm: svg(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>, 12),
  distPin: svg(<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />, 9),
  lock: svg(<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>, 16),
  shield: svg(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />, 16),
  dice: svg(<><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" /><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></>, 13),
  userX: svg(<><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" /></>, 20),
  tickOne: svg(<polyline points="20 6 9 17 4 12" />, 14),
  tickTwo: svg(<><polyline points="16 6 5 17 1 13" /><polyline points="22 6 11 17 8 14" /></>, 17),
};

export default function CirclesLocal() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [nick, setNick] = useState("");
  const [age, setAge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nickIdeas] = useState<string[]>(() => [...NICK_IDEAS].sort(() => Math.random() - 0.5).slice(0, 3));
  const [gender, setGender] = useState<Gender>("");
  const [avVar, setAvVar] = useState(0); // onboarding avatar shuffle
  const [showProfile, setShowProfile] = useState(false);
  const [profNick, setProfNick] = useState("");
  const [profAv, setProfAv] = useState(0);
  const [profGender, setProfGender] = useState<Gender>("");

  const [locShared, setLocShared] = useState(false);
  const [locError, setLocError] = useState("");
  const [locDenied, setLocDenied] = useState(false);

  const [tab, setTab] = useState<Tab>("nearby");
  const [nearby, setNearby] = useState<NearbyUser[]>([]);
  const [radarZoom, setRadarZoom] = useState(1);
  const RADAR_ZOOM_MIN = 1;
  const RADAR_ZOOM_MAX = 2.6;
  const zoomRadar = (delta: number) => setRadarZoom((z) => Math.min(RADAR_ZOOM_MAX, Math.max(RADAR_ZOOM_MIN, +(z + delta).toFixed(2))));
  const radarFrameRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = radarFrameRef.current;
    if (!el) return;
    const offset = (190 * radarZoom - 190) / 2; // center the (known) enlarged content in the fixed 190px viewport
    el.scrollLeft = offset;
    el.scrollTop = offset;
  }, [radarZoom]);
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [notice, setNotice] = useState("");

  const [composeFor, setComposeFor] = useState<NearbyUser | null>(null);
  const [opener, setOpener] = useState("");

  const [active, setActive] = useState<Active>(null);
  const [messages, setMessages] = useState<DmMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);

  // notifications: per-thread unread counts + mute toggle
  const [unread, setUnread] = useState<Record<number, number>>({});
  const [muted, setMuted] = useState<boolean>(() => (typeof localStorage !== "undefined" && localStorage.getItem("circles_muted") === "1"));
  const mutedRef = useRef(muted);
  const tabRef = useRef<Tab>(tab);
  const audioCtxRef = useRef<AudioContext | null>(null);
  useEffect(() => { mutedRef.current = muted; try { localStorage.setItem("circles_muted", muted ? "1" : "0"); } catch {} }, [muted]);
  useEffect(() => { tabRef.current = tab; }, [tab]);
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  // Short two-tone "ping" via Web Audio — no asset, respects mute.
  const playPing = useCallback(() => {
    if (mutedRef.current) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioCtxRef.current || (audioCtxRef.current = new Ctx());
      if (ctx.state === "suspended") ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.setValueAtTime(1175, ctx.currentTime + 0.09);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
      o.start(); o.stop(ctx.currentTime + 0.3);
    } catch { /* noop */ }
  }, []);

  // groups (local rooms)
  const [nearbyGroups, setNearbyGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [gName, setGName] = useState("");
  const [gTopic, setGTopic] = useState("");
  const [activeGroup, setActiveGroup] = useState<ActiveGroup>(null);
  const [groupMsgs, setGroupMsgs] = useState<GroupMsg[]>([]);
  const [groupDraft, setGroupDraft] = useState("");
  const [groupTyping, setGroupTyping] = useState("");

  const socketRef = useRef<Socket | null>(null);
  const activeRef = useRef<Active>(null);
  const activeGroupRef = useRef<ActiveGroup>(null);
  const groupTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const threadInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { activeGroupRef.current = activeGroup; }, [activeGroup]);

  // WhatsApp/Instagram-style keyboard: composer stays above the keyboard, list pinned to bottom.
  const scrollThreadToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, []);
  useKeyboardViewport(!!active || !!activeGroup, scrollThreadToBottom);

  const isIOS = useMemo(() => {
    const ua = navigator.userAgent || "";
    const iOS = /iPad|iPhone|iPod/.test(ua);
    const iPadOS = ua.includes("Mac") && "ontouchend" in document;
    return iOS || iPadOS;
  }, []);

  // Fullscreen thread: hide the site chrome so there's nothing above the thread
  // for the browser to scroll to when the keyboard opens.
  useEffect(() => {
    const body = document.body;
    if (active || activeGroup) body.classList.add("circles-fullscreen");
    else body.classList.remove("circles-fullscreen");
    return () => body.classList.remove("circles-fullscreen");
  }, [active, activeGroup]);

  // Lock body scroll on mobile while a thread is open — otherwise Android's
  // "scroll focused input into view" fights with the --kb-vh resize and the
  // composer ends up floating mid-screen instead of pinned above the keyboard.
  useEffect(() => {
    const body = document.body;
    const isMobile = window.innerWidth < 900 || isIOS;
    if ((active || activeGroup) && isMobile) body.style.overflow = "hidden";
    else body.style.overflow = "";
    return () => { body.style.overflow = ""; };
  }, [active, activeGroup, isIOS]);

  const toast = (m: string) => { setNotice(m); setTimeout(() => setNotice(""), 3500); };

  // Skip all network side-effects during react-snap prerendering (it would create
  // stray anon users in prod and try to open a socket at build time).
  const isPrerender = typeof navigator !== "undefined" && /ReactSnap/i.test(navigator.userAgent);

  // Load identity on mount.
  useEffect(() => {
    if (isPrerender) { setLoading(false); return; }
    circles.getMe()
      .then((m) => {
        setMe(m);
        // Returning users who onboarded before gender existed get sent back through
        // the form just for that field — prefill what we already know about them.
        if (m.ageOk && !m.gender) {
          setNick(m.nickname);
          setAge(true);
          setAvVar(m.avatar || 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isPrerender]);

  // Socket once identified.
  useEffect(() => {
    if (!me) return;
    const s = connectCirclesSocket();
    socketRef.current = s;
    s.on("dm_message", (m: DmMsg) => {
      const a = activeRef.current;
      if (a && (m.from_user === a.otherId || m.from_user === me.id)) {
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      }
    });
    s.on("dm_inbox", (m: DmMsg) => {
      circles.threads().then(setThreads).catch(() => {});
      const sender = m.from_user;
      const a = activeRef.current;
      if (!a || a.otherId !== sender) { // not currently reading this thread
        setUnread((u) => ({ ...u, [sender]: (u[sender] || 0) + 1 }));
        playPing();
      }
    });
    s.on("dm_request", () => {
      circles.incoming().then(setIncoming).catch(() => {});
      if (tabRef.current !== "requests") { playPing(); toast("New intro request — someone said hi!"); }
    });
    s.on("dm_accepted", (d: { by: { nickname: string } }) => { toast(`${d.by.nickname} accepted — say hi!`); playPing(); circles.threads().then(setThreads).catch(() => {}); });
    s.on("dm_declined", (d: { by: { nickname: string } }) => toast(`${d.by.nickname} isn't interested right now.`));
    s.on("dm_typing", (d: { userId: number; typing: boolean }) => {
      const a = activeRef.current;
      if (a && d.userId === a.otherId) setOtherTyping(d.typing);
    });
    s.on("dm_read", (d: { by: number; at: number }) => {
      const a = activeRef.current;
      if (a && d.by === a.otherId) {
        setMessages((prev) => prev.map((m) => (m.from_user === me.id && !m.read_at ? { ...m, read_at: d.at } : m)));
      }
    });
    s.on("group_message", (m: GroupMsg) => {
      const g = activeGroupRef.current;
      if (g && m.group_id === g.id) {
        setGroupMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      }
    });
    s.on("group_typing", (d: { userId: number; nickname: string; typing: boolean }) => {
      const g = activeGroupRef.current;
      if (!g) return;
      setGroupTyping(d.typing ? d.nickname : "");
      if (groupTypingTimer.current) clearTimeout(groupTypingTimer.current);
      if (d.typing) groupTypingTimer.current = setTimeout(() => setGroupTyping(""), 4000);
    });
    s.on("group_error", (d: { error: string }) => toast(d.error || "Group error"));
    return () => { s.disconnect(); socketRef.current = null; };
  }, [me]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, otherTyping, groupMsgs, groupTyping]);

  // ── onboarding ──
  const startCircle = async () => {
    if (nick.trim().length < 2 || !age || !gender) return;
    setBusy(true);
    try { setMe(await circles.setMe({ nickname: nick.trim(), ageOk: true, avatar: avVar, gender })); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  // ── profile (change name / shuffle avatar anytime) ──
  const openProfile = () => {
    if (!me) return;
    setProfNick(me.nickname);
    setProfAv(me.avatar || 0);
    setProfGender(me.gender || "");
    setShowProfile(true);
  };
  const saveProfile = async () => {
    if (profNick.trim().length < 2 || !profGender) return;
    try {
      setMe(await circles.setMe({ nickname: profNick.trim(), avatar: profAv, gender: profGender }));
      setShowProfile(false);
      toast("Profile updated — everyone sees your new look.");
    } catch (e) { toast(e instanceof Error ? e.message : "Failed"); }
  };
  const shuffleAv = (set: (n: number) => void) => set(1 + Math.floor(Math.random() * 999998));

  // ── location ──
  const shareLocation = useCallback(() => {
    setLocError("");
    if (!navigator.geolocation) { setLocError("Your browser can't share location."); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocDenied(false);
        try {
          await circles.setLocation(pos.coords.latitude, pos.coords.longitude);
          setLocShared(true);
          await refreshNearby();
        } catch (e) { setLocError(e instanceof Error ? e.message : "Failed"); }
        finally { setBusy(false); }
      },
      (err) => {
        if (err && err.code === 1) setLocDenied(true); // hard-blocked in browser settings
        else setLocError("Couldn't get your location — try again.");
        setBusy(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Returning users shouldn't have to click again — and blocked users should be
  // told immediately (the browser will NOT re-prompt once permission is denied).
  useEffect(() => {
    if (isPrerender || !me || !me.ageOk || locShared) return;
    if (!navigator.permissions || !navigator.permissions.query) return;
    let alive = true;
    let status: PermissionStatus | null = null;
    navigator.permissions.query({ name: "geolocation" as PermissionName })
      .then((st) => {
        if (!alive) return;
        status = st;
        if (st.state === "granted") shareLocation();
        else if (st.state === "denied") setLocDenied(true);
        st.onchange = () => {
          if (st.state === "granted") { setLocDenied(false); shareLocation(); }
          else if (st.state === "denied") setLocDenied(true);
        };
      })
      .catch(() => { /* Permissions API unavailable — the button flow still works */ });
    return () => { alive = false; if (status) status.onchange = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, locShared]);

  // ── browser push notifications ──
  const [pushOffer, setPushOffer] = useState(false);

  // Returning users with permission already granted: silently make sure the
  // server still has this browser's subscription.
  useEffect(() => {
    if (isPrerender || !me || !me.ageOk) return;
    resyncWebPush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  // First-timers: offer the bell once they're actually in (location shared),
  // unless they've already answered the browser prompt. Dismissing only hides
  // it for this visit — it reappears on the next refresh until they answer.
  useEffect(() => {
    if (isPrerender || !me || !me.ageOk || !locShared) return;
    if (!webPushSupported() || Notification.permission !== "default") return;
    setPushOffer(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, locShared]);

  const turnOnPush = async () => {
    setPushOffer(false);
    const r = await enableWebPush();
    if (r === "granted") toast("🔔 Notifications on — we'll ping you when someone says hi.");
    else if (r === "denied") toast("Notifications blocked — enable them for chatrio.app in your browser settings.");
    else toast("Couldn't enable notifications in this browser.");
  };
  const dismissPushOffer = () => {
    setPushOffer(false);
  };

  const refreshNearby = async () => { try { setNearby(await circles.nearby()); } catch (e) { /* noop */ } };
  const refreshRequests = async () => { try { setIncoming(await circles.incoming()); } catch (e) { /* noop */ } };
  const refreshThreads = async () => { try { setThreads(await circles.threads()); } catch (e) { /* noop */ } };
  const refreshGroups = async () => {
    try { setNearbyGroups(await circles.nearbyGroups()); } catch (e) { /* noop */ }
    try { setMyGroups(await circles.myGroups()); } catch (e) { /* noop */ }
  };

  useEffect(() => {
    if (!me || !locShared) return;
    if (tab === "nearby") refreshNearby();
    if (tab === "requests") refreshRequests();
    if (tab === "chats") refreshThreads();
    if (tab === "groups") refreshGroups();
  }, [tab, me, locShared]);

  // Keep request/chat badges accurate regardless of which tab is open.
  useEffect(() => {
    if (!me || !locShared) return;
    refreshRequests();
    refreshThreads();
  }, [me, locShared]);

  // Auto-refresh the visible list every 30s — users shouldn't do the server's job.
  useEffect(() => {
    if (!me || !locShared || active || activeGroup) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      if (tabRef.current === "nearby") refreshNearby();
      if (tabRef.current === "groups") refreshGroups();
    }, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, locShared, active, activeGroup]);

  // Flash unread count in the browser tab title when backgrounded.
  useEffect(() => {
    const base = "Circles — Local Chat App to Meet People Near You | Chatrio";
    const n = totalUnread + incoming.length;
    const update = () => { document.title = document.hidden && n > 0 ? `(${n}) New message · Circles` : base; };
    update();
    document.addEventListener("visibilitychange", update);
    return () => { document.removeEventListener("visibilitychange", update); document.title = base; };
  }, [totalUnread, incoming.length]);

  // ── actions ──
  const sendIntro = async () => {
    if (!composeFor || opener.trim().length < 1) return;
    try {
      await circles.sendRequest(composeFor.id, opener.trim());
      toast(`Intro sent to ${composeFor.nickname} — they'll see one message.`);
      setComposeFor(null); setOpener("");
    } catch (e) { toast(e instanceof Error ? e.message : "Failed"); }
  };

  const respond = async (r: Incoming, action: "accept" | "decline") => {
    try {
      await circles.respond(r.id, action);
      setIncoming((prev) => prev.filter((x) => x.id !== r.id));
      if (action === "accept") { await refreshThreads(); openThread(r.from_id, r.from_nick, r.from_avatar, r.from_gender); }
    } catch (e) { toast(e instanceof Error ? e.message : "Failed"); }
  };

  const openThread = async (otherId: number, nickname: string, avatar = 0, gender?: Gender) => {
    setActive({ otherId, nickname, avatar, gender });
    setUnread((u) => { if (!u[otherId]) return u; const c = { ...u }; delete c[otherId]; return c; });
    setMessages([]); setOtherTyping(false); setConfirmBlock(false);
    try { setMessages(await circles.messagesWith(otherId)); } catch (e) { /* noop */ }
    socketRef.current?.emit("dm_open", { otherId });
    setTimeout(() => threadInputRef.current?.focus(), 60); // straight to typing
  };

  const sendMsg = () => {
    if (!active || !draft.trim()) return;
    socketRef.current?.emit("dm_message", { otherId: active.otherId, text: draft.trim() });
    socketRef.current?.emit("dm_typing", { otherId: active.otherId, typing: false });
    setDraft("");
    threadInputRef.current?.focus(); // keep the keyboard open
  };

  const onDraft = (v: string) => {
    setDraft(v);
    if (active) socketRef.current?.emit("dm_typing", { otherId: active.otherId, typing: v.length > 0 });
  };

  // Report & block runs only after the confirm dialog — the flag button just opens it.
  const doBlockActive = async () => {
    if (!active) return;
    await circles.report(active.otherId, "user reported from chat").catch(() => {});
    setConfirmBlock(false);
    toast(`${active.nickname} has been reported & blocked. You can unblock them anytime from Blocked users.`);
    setActive(null); refreshThreads();
  };

  const openBlocked = async () => {
    setShowBlocked(true);
    try { setBlockedUsers(await circles.blocked()); } catch (e) { setBlockedUsers([]); }
  };

  const unblock = async (u: BlockedUser) => {
    try {
      await circles.unblock(u.id);
      setBlockedUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast(`${u.nickname} unblocked — they can appear nearby and message you again.`);
      refreshNearby(); refreshThreads();
    } catch (e) { toast(e instanceof Error ? e.message : "Failed"); }
  };

  // ── groups ──
  const createGroup = async () => {
    if (gName.trim().length < 2) return;
    try {
      const { id } = await circles.createGroup(gName.trim(), gTopic.trim());
      setShowCreate(false); setGName(""); setGTopic("");
      await refreshGroups();
      openGroup(id, gName.trim(), gTopic.trim());
    } catch (e) { toast(e instanceof Error ? e.message : "Failed"); }
  };

  const joinAndOpen = async (g: Group) => {
    try {
      if (!g.isMember) await circles.joinGroup(g.id);
      openGroup(g.id, g.name, g.topic);
    } catch (e) { toast(e instanceof Error ? e.message : "Failed"); }
  };

  const openGroup = async (id: number, name: string, topic = "") => {
    setActiveGroup({ id, name, emoji: groupEmoji(name, topic) });
    setGroupMsgs([]); setGroupTyping("");
    try { setGroupMsgs(await circles.groupMessages(id)); } catch (e) { /* noop */ }
    socketRef.current?.emit("group_open", { groupId: id });
    setTimeout(() => threadInputRef.current?.focus(), 60); // straight to typing
  };

  const sendGroupMsg = () => {
    if (!activeGroup || !groupDraft.trim()) return;
    socketRef.current?.emit("group_message", { groupId: activeGroup.id, text: groupDraft.trim() });
    socketRef.current?.emit("group_typing", { groupId: activeGroup.id, typing: false });
    setGroupDraft("");
    threadInputRef.current?.focus();
  };

  const onGroupDraft = (v: string) => {
    setGroupDraft(v);
    if (activeGroup) socketRef.current?.emit("group_typing", { groupId: activeGroup.id, typing: v.length > 0 });
  };

  const leaveActiveGroup = async () => {
    if (!activeGroup) return;
    await circles.leaveGroup(activeGroup.id).catch(() => {});
    toast(`Left ${activeGroup.name}.`);
    setActiveGroup(null); refreshGroups();
  };

  // ── render ──
  const Shell = (children: React.ReactNode) => (
    <div className="cl-wrap">
      <Helmet>
        <title>Circles — Local Chat App to Meet People Near You | Chatrio</title>
        <meta name="description" content="Circles is a free anonymous local chat. See who's nearby, send one intro message, and chat if they accept. No account, no exact location, 18+." />
        <link rel="canonical" href="https://chatrio.app/circles" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "@id": "https://chatrio.app/circles#app",
          "name": "Circles",
          "url": "https://chatrio.app/circles",
          "description": "Free anonymous local chat — see who's nearby, send one intro message, and chat if they accept. No account, no exact location shared, 18+.",
          "applicationCategory": "SocialNetworkingApplication",
          "operatingSystem": "All",
          "isPartOf": { "@id": "https://chatrio.app/#website" },
          "publisher": { "@id": "https://chatrio.app/#org" },
          "contentRating": "18+",
          "offers": {
            "@type": "Offer",
            "price": 0,
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock"
          }
        })}</script>
      </Helmet>
      <div className="cl-toast-wrap" aria-live="polite" role="status">
        {!!notice && <div className="cl-toast">{notice}</div>}
      </div>
      {children}
    </div>
  );

  if (loading) return Shell(<p className="cl-dim">Loading…</p>);

  // Onboarding / age gate
  if (!me || !me.ageOk || !me.gender) {
    return Shell(
      <>
        <div className="cl-card cl-onboard">
          <span className="cl-badge">Beta · 18+</span>
          <h1 className="cl-h1">Circles</h1>
          <p className="cl-sub">Anonymous <strong>nearby chat</strong> — meet people near you. No account. No exact location. No history.</p>
          <div className="cl-steps" aria-hidden="true"><i className="on" /><i /></div>
          <label className="cl-field">
            <span className="cl-label">Nickname</span>
            <input className="cl-input" placeholder="e.g. Sam" value={nick} maxLength={20}
              autoComplete="off" onChange={(e) => setNick(e.target.value)} />
          </label>
          <div className="cl-sugg" aria-label="Nickname suggestions">
            {nickIdeas.map((n) => (
              <button key={n} type="button" onClick={() => setNick(n)}>{Ic.dice} {n}</button>
            ))}
          </div>
          <div className="cl-field">
            <span className="cl-label">You are</span>
            <div className="cl-gender-row" role="radiogroup" aria-label="Your gender">
              {GENDER_OPTIONS.map((g) => (
                <button key={g.value} type="button" role="radio" aria-checked={gender === g.value}
                  className={`cl-gender-pill${gender === g.value ? " on" : ""}`}
                  onClick={() => setGender(g.value)}>{g.label}</button>
              ))}
            </div>
          </div>
          {nick.trim().length >= 2 && gender && (
            <div className="cl-me-preview-wrap">
              <Av name={nick.trim()} variant={avVar} gender={gender} className="cl-me-preview" />
              <button type="button" className="cl-shuffle" onClick={() => shuffleAv(setAvVar)}>{Ic.dice} Shuffle my look</button>
            </div>
          )}
          <label className="cl-check">
            <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} />
            <span>I'm 18 or older</span>
          </label>
          <button className="cl-btn" disabled={busy || nick.trim().length < 2 || !age || !gender} onClick={startCircle}>
            {busy ? "…" : "Continue"}
          </button>
          <div className="cl-trust">
            <span className="cl-trust-item"><span className="cl-trust-ic">{Ic.pinSm}</span>Approximate area only</span>
            <span className="cl-trust-item"><span className="cl-trust-ic">{Ic.lock}</span>No email or phone</span>
            <span className="cl-trust-item"><span className="cl-trust-ic">{Ic.shield}</span>Block &amp; report anytime</span>
          </div>
          <details className="cl-safety">
            <summary>How Circles keeps you safe</summary>
            <ul>
              <li><strong>Approximate location only.</strong> Your position is snapped to a coarse area — never your exact spot, and never shown on a map.</li>
              <li><strong>You stay anonymous.</strong> No email or phone number — just a nickname you choose.</li>
              <li><strong>How we know it's you without an account:</strong> your browser gets a random anonymous ID stored only on your device. Your nickname and avatar are attached to that ID — clear your browser data and the identity is gone for good.</li>
              <li><strong>You control who reaches you.</strong> People can send one intro message; you accept or decline. Declining blocks them.</li>
              <li><strong>Report &amp; block anytime.</strong> Reporting also blocks the person and alerts our moderators.</li>
              <li><strong>Adults only.</strong> Circles is strictly 18+.</li>
            </ul>
          </details>
        </div>
        <section className="cl-seo">
          <h2>A local chat app that stays anonymous</h2>
          <p>Circles is a free local chat app for meeting people near you without giving up your privacy. There's no sign-up — pick a nickname, share an approximate location, and see who's around. You send one intro message; if the other person accepts, the chat opens. If they decline, they never hear from you again.</p>
          <h2>Nearby chat, groups, and intro requests</h2>
          <p>Talk to people near you one-on-one, or start a local group pinned to your area — a coffee meetup, late-night talks, a running crew. Everything is anonymous, moderated, and strictly 18+.</p>
          <h2>How can it remember me without a sign-up?</h2>
          <p>When you first use Circles, your browser generates a random anonymous ID that never leaves your device except to identify your session. Your nickname, anime avatar, and chats are linked to that ID — not to an email, phone number, or real name. Come back on the same device and browser and Circles recognizes you; clear your browser data and that identity is erased permanently.</p>
          <h2>Learn more about Circles</h2>
          <ul className="cl-seo-links">
            <li><NavLink to="/blog/introducing-circles-anonymous-local-chat-near-you">Introducing Circles: anonymous local chat to meet people near you</NavLink></li>
            <li><NavLink to="/blog/nearby-chat-apps-how-they-work-safely">Nearby chat apps: how they work and how to use them safely</NavLink></li>
            <li><NavLink to="/blog/local-anonymous-chat-talk-to-people-in-your-area">Local anonymous chat: talk to people in your area without sharing your identity</NavLink></li>
            <li><NavLink to="/blog/how-to-meet-people-near-me-without-giving-up-privacy">How to meet people near me without giving up your privacy</NavLink></li>
            <li><NavLink to="/blog/make-friends-nearby-without-dating-apps">Best ways to make friends nearby without dating apps</NavLink></li>
          </ul>
        </section>
      </>
    );
  }

  // Active DM thread
  if (active) {
    return Shell(
      <div className="cl-thread">
        <header className="cl-thread-head">
          <button className="cl-icon-btn cl-back" aria-label="Back to list" onClick={() => setActive(null)}>{Ic.back}</button>
          <Av name={active.nickname} variant={active.avatar} gender={active.gender} small />
          <span className="cl-thread-title">
            <span className="cl-thread-name">{active.nickname}</span>
            <span className="cl-thread-sub">{otherTyping ? "typing…" : "Nearby · anonymous"}</span>
          </span>
          <button className="cl-icon-btn cl-report" aria-label="Report and block this person" onClick={() => setConfirmBlock(true)}>{Ic.flag}</button>
        </header>
        <div className="cl-messages">
          {messages.map((m, i, arr) => {
            const prev = arr[i - 1];
            const next = arr[i + 1];
            const newDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at);
            const cont = !newDay && !!prev && prev.from_user === m.from_user && m.created_at - prev.created_at < 300000;
            const last = !next || next.from_user !== m.from_user || next.created_at - m.created_at >= 300000;
            return (
              <React.Fragment key={m.id}>
                {newDay && <div className="cl-daysep">{dayLabel(m.created_at)}</div>}
                <div className={`cl-msg${m.from_user === me.id ? " mine" : ""}${cont ? " cont" : ""}`}>
                  <span className="cl-bubble">
                    <span className="cl-bubble-text">{m.text}</span>
                    {last && (
                      <span className="cl-time">
                        <time dateTime={new Date(m.created_at).toISOString()}>{fmtTime(m.created_at)}</time>
                        {m.from_user === me.id && (
                          <span className={`cl-ticks${m.read_at ? " read" : ""}`} aria-label={m.read_at ? "Seen" : "Sent"}>
                            {m.read_at ? Ic.tickTwo : Ic.tickOne}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
          {otherTyping && <div className="cl-msg"><span className="cl-bubble cl-typing"><span className="cl-dots"><i /><i /><i /></span></span></div>}
          <div ref={endRef} />
        </div>
        <div className="cl-composer">
          <input ref={threadInputRef} className="cl-input" placeholder="Message…" aria-label="Message" value={draft}
            enterKeyHint="send" onChange={(e) => onDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMsg()} />
          <button className="cl-icon-btn cl-send" aria-label="Send message" disabled={!draft.trim()}
            onMouseDown={(e) => e.preventDefault()}
            onTouchEnd={(e) => { e.preventDefault(); sendMsg(); }}
            onClick={sendMsg}>{Ic.send}</button>
        </div>
        {confirmBlock && (
          <div className="cl-modal" role="dialog" aria-modal="true" aria-label={`Report and block ${active.nickname}`} onClick={() => setConfirmBlock(false)}>
            <div className="cl-modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 className="cl-modal-title">Report &amp; block {active.nickname}?</h3>
              <p className="cl-fine">They'll disappear from your chats and nearby list, they can't contact you again, and our moderators are alerted. Changed your mind later? Unblock them anytime from <strong>Blocked users</strong> in the top bar.</p>
              <div className="cl-modal-actions">
                <button className="cl-btn cl-ghost cl-sm" onClick={() => setConfirmBlock(false)}>Cancel</button>
                <button className="cl-btn cl-sm cl-danger" onClick={doBlockActive}>Report &amp; block</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active group room
  if (activeGroup) {
    return Shell(
      <div className="cl-thread">
        <header className="cl-thread-head">
          <button className="cl-icon-btn cl-back" aria-label="Back to list" onClick={() => setActiveGroup(null)}>{Ic.back}</button>
          <span className="cl-avatar cl-avatar-sm cl-avatar-group" aria-hidden="true">{activeGroup.emoji}</span>
          <span className="cl-thread-title">
            <span className="cl-thread-name">{activeGroup.name}</span>
            <span className="cl-thread-sub">{groupTyping ? `${groupTyping} is typing…` : "Local group"}</span>
          </span>
          <button className="cl-icon-btn cl-report" aria-label="Leave group" onClick={leaveActiveGroup}>{Ic.leave}</button>
        </header>
        <div className="cl-messages">
          {groupMsgs.map((m, i, arr) => {
            const prev = arr[i - 1];
            const next = arr[i + 1];
            const newDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at);
            const cont = !newDay && !!prev && prev.from_user === m.from_user && m.created_at - prev.created_at < 300000;
            const last = !next || next.from_user !== m.from_user || next.created_at - m.created_at >= 300000;
            return (
              <React.Fragment key={m.id}>
                {newDay && <div className="cl-daysep">{dayLabel(m.created_at)}</div>}
                <div className={`cl-msg${m.from_user === me.id ? " mine" : ""}${cont ? " cont" : ""}`}>
                  <span className="cl-bubble">
                    {m.from_user !== me.id && !cont && <span className="cl-bubble-who">{m.from_nick}</span>}
                    <span className="cl-bubble-text">{m.text}</span>
                    {last && <time className="cl-time" dateTime={new Date(m.created_at).toISOString()}>{fmtTime(m.created_at)}</time>}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
          {!!groupTyping && <div className="cl-msg"><span className="cl-bubble cl-typing">{groupTyping} is typing…</span></div>}
          <div ref={endRef} />
        </div>
        <div className="cl-composer">
          <input ref={threadInputRef} className="cl-input" placeholder="Message the group…" aria-label="Message the group" value={groupDraft}
            enterKeyHint="send" onChange={(e) => onGroupDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendGroupMsg()} />
          <button className="cl-icon-btn cl-send" aria-label="Send message" disabled={!groupDraft.trim()}
            onMouseDown={(e) => e.preventDefault()}
            onTouchEnd={(e) => { e.preventDefault(); sendGroupMsg(); }}
            onClick={sendGroupMsg}>{Ic.send}</button>
        </div>
      </div>
    );
  }

  // Needs location
  if (!locShared) {
    return Shell(
      <div className="cl-card cl-onboard">
        <span className="cl-loc-icon" aria-hidden="true">{Ic.pin}</span>
        <h1 className="cl-h1">Hi, {me.nickname} 👋</h1>
        <div className="cl-steps" aria-hidden="true"><i className="on" /><i className="on" /></div>
        {locDenied ? (
          <>
            <p className="cl-sub"><strong>Location is blocked</strong> for chatrio.app in your browser, so Circles can't find people near you. The browser won't ask again on its own — enable it once, then come back:</p>
            <div className="cl-howto">
              <div className="cl-howto-row"><b>iPhone / Safari</b><span>Tap the <b>ᴀA</b> (or settings) icon in the address bar → Website Settings → Location → <b>Allow</b>. If it's not there: Settings app → Apps → Safari → Location → While Using.</span></div>
              <div className="cl-howto-row"><b>Android / Chrome</b><span>Tap the <b>🔒 / ⓘ icon</b> next to the address → Permissions → Location → <b>Allow</b>.</span></div>
              <div className="cl-howto-row"><b>Desktop</b><span>Click the icon left of the address bar → Site settings → Location → <b>Allow</b>.</span></div>
            </div>
            <button className="cl-btn" disabled={busy} onClick={shareLocation}>{busy ? "…" : "I've enabled it — try again"}</button>
            <p className="cl-fine">Still approximate only — never your exact spot, never on a map.</p>
          </>
        ) : (
          <>
            <p className="cl-sub">Share your location to see people near you. We only ever use an <strong>approximate</strong> area — never your exact spot.</p>
            <button className="cl-btn" disabled={busy} onClick={shareLocation}>{busy ? "…" : "Find people near me"}</button>
            {!!locError && <p className="cl-err" role="alert">{locError}</p>}
          </>
        )}
      </div>
    );
  }

  // Main: tabs
  return Shell(
    <div className="cl-main">
      <div className="cl-topbar">
        <span className="cl-topbar-title">Circles</span>
        <span className="cl-loc-chip">{Ic.pinSm} Approximate area</span>
        <button className="cl-icon-btn cl-me-btn" aria-label="Your profile — change name or avatar" onClick={openProfile}>
          <Av name={me.nickname} variant={me.avatar} gender={me.gender} small />
        </button>
        <button className="cl-icon-btn" aria-label="Blocked users" onClick={openBlocked}>{Ic.userX}</button>
        <button className="cl-icon-btn" aria-label={muted ? "Unmute notification sound" : "Mute notification sound"}
          aria-pressed={muted} onClick={() => setMuted((m) => !m)}>{muted ? Ic.bellOff : Ic.bell}</button>
      </div>
      <div className="cl-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "nearby"} className={tab === "nearby" ? "on" : ""} onClick={() => setTab("nearby")}>{Ic.radar}Nearby</button>
        <button role="tab" aria-selected={tab === "groups"} className={tab === "groups" ? "on" : ""} onClick={() => setTab("groups")}>{Ic.users}Groups</button>
        <button role="tab" aria-selected={tab === "requests"} className={tab === "requests" ? "on" : ""} onClick={() => setTab("requests")}>
          {Ic.inbox}Requests{incoming.length ? <span className="cl-tab-badge">{incoming.length}</span> : null}
        </button>
        <button role="tab" aria-selected={tab === "chats"} className={tab === "chats" ? "on" : ""} onClick={() => setTab("chats")}>
          {Ic.chat}Chats{totalUnread ? <span className="cl-tab-badge">{totalUnread}</span> : null}
        </button>
      </div>

      {pushOffer && (
        <div className="cl-push-offer" role="region" aria-label="Enable notifications">
          <span className="cl-push-ic" aria-hidden="true">{Ic.bell}</span>
          <span className="cl-push-txt">
            <b>Don't miss a reply</b>
            <span>Get a ping when someone says hi — even with this tab closed.</span>
          </span>
          <button className="cl-btn cl-sm" onClick={turnOnPush}>Turn on</button>
          <button className="cl-push-x" aria-label="Dismiss" onClick={dismissPushOffer}>×</button>
        </div>
      )}

      {tab === "nearby" && (
        <div className="cl-list">
          <div className="cl-radar-wrap">
            <div className="cl-radar-zoom">
              <button type="button" className="cl-zoom-btn" aria-label="Zoom out radar"
                disabled={radarZoom <= RADAR_ZOOM_MIN} onClick={() => zoomRadar(-0.4)}>{Ic.minus}</button>
              <button type="button" className="cl-zoom-btn" aria-label="Zoom in radar"
                disabled={radarZoom >= RADAR_ZOOM_MAX} onClick={() => zoomRadar(0.4)}>{Ic.plus}</button>
            </div>
            <div className="cl-radar-frame" ref={radarFrameRef}>
              <div className="cl-radar" style={{ width: `${190 * radarZoom}px`, height: `${190 * radarZoom}px` }}>
                <span className="cl-ring" /><span className="cl-ring" /><span className="cl-ring" />
                <span className="cl-sweep-mask"><span className="cl-sweep" /></span><span className="cl-me" />
                {nearby.map((u, _, arr) => {
                  const maxKm = Math.max(1, ...arr.map((x) => parseKm(x.distance)));
                  const ang = ((hashStr(u.nickname) * 137.508) % 360) * (Math.PI / 180);
                  const r = (0.2 + (parseKm(u.distance) / maxKm) * 0.72) * 50;
                  return (
                    <button key={u.id} className="cl-blip"
                      style={{ left: `${50 + r * Math.cos(ang)}%`, top: `${50 + r * Math.sin(ang)}%` }}
                      aria-label={`Say hi to ${u.nickname}, ${u.distance}`}
                      onClick={() => { setComposeFor(u); setOpener(""); }}>
                      <Av name={u.nickname} variant={u.avatar} gender={u.gender} className="cl-blip-av" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {nearby.length > 0 && (
            <div className="cl-live">
              <span className="cl-pulse" aria-hidden="true" />
              <span><b>{nearby.length} {nearby.length === 1 ? "person" : "people"}</b> on your radar · tap a face to say hi</span>
              <button className="cl-refresh" aria-label="Refresh now" onClick={refreshNearby}>{Ic.refresh}</button>
            </div>
          )}
          {nearby.length === 0 && (
            <div className="cl-empty">
              <b>Scanning your area…</b>
              <p>You're the first one here right now. We keep looking — new people show up all the time.</p>
              <button className="cl-btn cl-sm" onClick={() => { setTab("groups"); setShowCreate(true); setGName(""); setGTopic(""); }}>Start a local group instead</button>
            </div>
          )}
          {nearby.map((u) => (
            <div className="cl-row" key={u.id}>
              <div className="cl-row-main">
                <Av name={u.nickname} variant={u.avatar} gender={u.gender} dot={isActive(u.lastSeen)} />
                <div className="cl-row-text">
                  <div className="cl-row-name"><span className="cl-nm">{u.nickname}</span></div>
                  <div className="cl-row-meta cl-meta-flex">
                    <span className="cl-dist">{Ic.distPin}{u.distance}</span>
                    <span className="cl-meta-txt">
                      {isActive(u.lastSeen)
                        ? <span className="cl-active">Active now{!!u.sessionMin && u.sessionMin > 0 ? ` · ${u.sessionMin}m` : ""}</span>
                        : u.lastSeen ? `Active ${timeAgo(u.lastSeen)}` : "Around your area"}
                    </span>
                  </div>
                </div>
              </div>
              <button className="cl-btn cl-sm" onClick={() => { setComposeFor(u); setOpener(""); }}>👋 Say hi</button>
            </div>
          ))}
        </div>
      )}

      {tab === "groups" && (
        <div className="cl-list">
          {myGroups.length > 0 && <div className="cl-section">Your groups</div>}
          {myGroups.map((g) => (
            <div className="cl-row cl-click" key={`m${g.id}`} role="button" tabIndex={0}
              onClick={() => openGroup(g.id, g.name)} onKeyDown={keyActivate(() => openGroup(g.id, g.name))}>
              <div className="cl-row-main">
                <span className="cl-avatar cl-avatar-group" aria-hidden="true">{groupEmoji(g.name, g.topic)}</span>
                <div className="cl-row-text">
                  <div className="cl-row-name"><span className="cl-nm">{g.name}</span></div>
                  <div className="cl-row-meta">{g.lastText || g.topic || `${g.members} member${g.members === 1 ? "" : "s"}`}</div>
                </div>
              </div>
              {g.lastAt ? <time className="cl-row-time">{fmtTime(g.lastAt)}</time> : <span className="cl-chev" aria-hidden="true">{Ic.chevron}</span>}
            </div>
          ))}
          <div className="cl-section">Near you</div>
          {nearbyGroups.filter((g) => !g.isMember).length === 0 && (
            <div className="cl-empty">
              <b>No groups in your area yet</b>
              <p>Be the one who starts it — a group is pinned to your approximate area so nearby people can find and join it.</p>
              <button className="cl-btn cl-sm" onClick={() => { setShowCreate(true); setGName(""); setGTopic(""); }}>{Ic.plus} Start the first group</button>
            </div>
          )}
          {nearbyGroups.filter((g) => !g.isMember).map((g) => (
            <div className="cl-row" key={`n${g.id}`}>
              <div className="cl-row-main">
                <span className="cl-avatar cl-avatar-group" aria-hidden="true">{groupEmoji(g.name, g.topic)}</span>
                <div className="cl-row-text">
                  <div className="cl-row-name"><span className="cl-nm">{g.name}</span></div>
                  <div className="cl-row-meta cl-meta-flex">
                    {g.distance ? <span className="cl-dist">{Ic.distPin}{g.distance}</span> : null}
                    <span className="cl-meta-txt">
                      {g.activeNow ? <><span className="cl-active">{g.activeNow} active now</span> · </> : null}
                      {g.members} member{g.members === 1 ? "" : "s"}{g.topic ? ` · ${g.topic}` : ""}
                    </span>
                  </div>
                </div>
              </div>
              <button className="cl-btn cl-sm" onClick={() => joinAndOpen(g)}>Join</button>
            </div>
          ))}
          <button className="cl-fab" aria-label="Start a local group" onClick={() => { setShowCreate(true); setGName(""); setGTopic(""); }}>{Ic.plus}</button>
        </div>
      )}

      {tab === "requests" && (
        <div className="cl-list">
          {incoming.length === 0 && (
            <div className="cl-empty">
              <b>No intro requests yet</b>
              <p>When someone nearby says hi, their message lands here — you decide if the chat opens.</p>
            </div>
          )}
          {incoming.map((r) => (
            <div className="cl-req" key={r.id}>
              <div className="cl-req-head">
                <Av name={r.from_nick} variant={r.from_avatar} gender={r.from_gender} />
                <div className="cl-row-name"><span className="cl-nm">{r.from_nick}</span></div>
                {!!r.created_at && <span className="cl-req-when">{timeAgo(r.created_at)}</span>}
              </div>
              <div className="cl-opener">“{r.opener}”</div>
              <div className="cl-req-actions">
                <button className="cl-btn cl-sm" onClick={() => respond(r, "accept")}>Accept</button>
                <button className="cl-btn cl-sm cl-ghost" onClick={() => respond(r, "decline")}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "chats" && (
        <div className="cl-list">
          {threads.length === 0 && (
            <div className="cl-empty">
              <b>No conversations yet</b>
              <p>Say hi to someone on the Nearby tab — accepted intros turn into chats here.</p>
              <button className="cl-btn cl-sm" onClick={() => setTab("nearby")}>See who's nearby</button>
            </div>
          )}
          {threads.map((t) => (
            <div className={`cl-row cl-click${unread[t.otherId] ? " cl-row-unread" : ""}`} key={t.otherId} role="button" tabIndex={0}
              onClick={() => openThread(t.otherId, t.nickname, t.avatar, t.gender)} onKeyDown={keyActivate(() => openThread(t.otherId, t.nickname, t.avatar, t.gender))}>
              <div className="cl-row-main">
                <Av name={t.nickname} variant={t.avatar} gender={t.gender} />
                <div className="cl-row-text">
                  <div className="cl-row-name"><span className="cl-nm">{t.nickname}</span></div>
                  <div className="cl-row-meta">{t.lastText || "Start chatting"}</div>
                </div>
              </div>
              {unread[t.otherId]
                ? <span className="cl-unread" aria-label={`${unread[t.otherId]} unread`}>{unread[t.otherId]}</span>
                : t.lastAt ? <time className="cl-row-time">{fmtTime(t.lastAt)}</time> : <span className="cl-chev" aria-hidden="true">{Ic.chevron}</span>}
            </div>
          ))}
        </div>
      )}

      {composeFor && (
        <div className="cl-modal" role="dialog" aria-modal="true" aria-label={`Say hi to ${composeFor.nickname}`} onClick={() => setComposeFor(null)}>
          <div className="cl-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="cl-modal-title">Say hi to {composeFor.nickname}</h3>
            <p className="cl-fine">You get <strong>one</strong> message. If they're interested, the chat opens.</p>
            <textarea className="cl-textarea" placeholder="Write a friendly opener…" maxLength={280} autoFocus
              value={opener} onChange={(e) => setOpener(e.target.value)} />
            <div className="cl-modal-actions">
              <button className="cl-btn cl-ghost cl-sm" onClick={() => setComposeFor(null)}>Cancel</button>
              <button className="cl-btn cl-sm" disabled={opener.trim().length < 1} onClick={sendIntro}>Send intro</button>
            </div>
          </div>
        </div>
      )}

      {showProfile && (
        <div className="cl-modal" role="dialog" aria-modal="true" aria-label="Your profile" onClick={() => setShowProfile(false)}>
          <div className="cl-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="cl-modal-title">Your profile</h3>
            <div className="cl-me-preview-wrap" style={{ marginTop: 12 }}>
              <Av name={profNick.trim() || me.nickname} variant={profAv} gender={profGender} className="cl-me-preview" />
              <button type="button" className="cl-shuffle" onClick={() => shuffleAv(setProfAv)}>{Ic.dice} Shuffle my look</button>
            </div>
            <input className="cl-input" placeholder="Nickname" maxLength={20} value={profNick}
              onChange={(e) => setProfNick(e.target.value)} />
            <div className="cl-field cl-mt">
              <span className="cl-label">You are</span>
              <div className="cl-gender-row" role="radiogroup" aria-label="Your gender">
                {GENDER_OPTIONS.map((g) => (
                  <button key={g.value} type="button" role="radio" aria-checked={profGender === g.value}
                    className={`cl-gender-pill${profGender === g.value ? " on" : ""}`}
                    onClick={() => setProfGender(g.value)}>{g.label}</button>
                ))}
              </div>
            </div>
            <div className="cl-modal-actions">
              <button className="cl-btn cl-ghost cl-sm" onClick={() => setShowProfile(false)}>Cancel</button>
              <button className="cl-btn cl-sm" disabled={profNick.trim().length < 2 || !profGender} onClick={saveProfile}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showBlocked && (
        <div className="cl-modal" role="dialog" aria-modal="true" aria-label="Blocked users" onClick={() => setShowBlocked(false)}>
          <div className="cl-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="cl-modal-title">Blocked users</h3>
            {blockedUsers.length === 0 && (
              <p className="cl-fine">You haven't blocked anyone. Reporting someone — or declining their intro — blocks them, and they'll show up here.</p>
            )}
            {blockedUsers.length > 0 && (
              <div className="cl-blocked-list">
                {blockedUsers.map((u) => (
                  <div className="cl-row" key={u.id}>
                    <div className="cl-row-main">
                      <Av name={u.nickname} variant={u.avatar} gender={u.gender} />
                      <div className="cl-row-text">
                        <div className="cl-row-name"><span className="cl-nm">{u.nickname}</span></div>
                        <div className="cl-row-meta">Blocked {timeAgo(u.created_at)}</div>
                      </div>
                    </div>
                    <button className="cl-btn cl-sm cl-ghost" onClick={() => unblock(u)}>Unblock</button>
                  </div>
                ))}
              </div>
            )}
            <div className="cl-modal-actions">
              <button className="cl-btn cl-ghost cl-sm" onClick={() => setShowBlocked(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="cl-modal" role="dialog" aria-modal="true" aria-label="Start a local group" onClick={() => setShowCreate(false)}>
          <div className="cl-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="cl-modal-title">Start a local group</h3>
            <p className="cl-fine">It's pinned to your <strong>approximate</strong> area so nearby people can find and join it.</p>
            <input className="cl-input" placeholder="Group name (e.g. Coffee at the park)" maxLength={40} autoFocus
              value={gName} onChange={(e) => setGName(e.target.value)} />
            <input className="cl-input cl-mt" placeholder="Topic (optional)" maxLength={120}
              value={gTopic} onChange={(e) => setGTopic(e.target.value)} />
            <div className="cl-modal-actions">
              <button className="cl-btn cl-ghost cl-sm" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="cl-btn cl-sm" disabled={gName.trim().length < 2} onClick={createGroup}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
