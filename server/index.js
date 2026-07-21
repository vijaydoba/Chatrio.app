const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();
const circles = require("./circles");

const PORT = process.env.PORT || 5050;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://chatrio.app";

const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());

app.get("/", (req, res) => res.send("Chatrio API ✅"));
app.get("/health", (req, res) => res.json({ ok: true }));

// --- Circles (recurring cohort mode) REST API ---
function authMiddleware(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  const payload = token && circles.verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Authentication required" });
  const user = circles.getUserById(payload.uid);
  if (!user) return res.status(401).json({ error: "Account not found" });
  req.user = user;
  next();
}

function handle(fn) {
  return (req, res) => {
    try {
      res.json(fn(req, res));
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message || "Server error" });
    }
  };
}

// --- Waitlist: public email capture + admin export ---
app.post("/waitlist", handle((req) => circles.joinWaitlist(req.body || {})));
app.get("/waitlist", (req, res) => {
  const adminToken = process.env.ADMIN_TOKEN;
  const provided = (req.headers.authorization || "").replace(/^Bearer\s+/i, "") || req.query.key;
  if (!adminToken || provided !== adminToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json(circles.listWaitlist());
});

app.post("/auth/signup", handle((req) => circles.signup(req.body || {})));
app.post("/auth/login", handle((req) => circles.login(req.body || {})));
app.get("/auth/me", authMiddleware, handle((req) => circles.publicUser(req.user)));

app.get("/circles", authMiddleware, handle((req) => circles.listCircles(req.user.id)));
app.post("/circles/:id/join", authMiddleware, handle((req) =>
  circles.joinCircle(req.user.id, Number(req.params.id))
));
app.get("/my/cohorts", authMiddleware, handle((req) => circles.listMyCohorts(req.user.id)));
app.get("/cohorts/:id", authMiddleware, handle((req) =>
  circles.cohortDetail(Number(req.params.id), req.user.id)
));
app.get("/cohorts/:id/messages", authMiddleware, handle((req) =>
  circles.getMessages(Number(req.params.id), req.user.id)
));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: FRONTEND_ORIGIN, credentials: true },
});

// --- STATE ---
const state = {
  online: new Set(),
  waiting: new Set(),
  partner: new Map(),
  username: new Map(),
  topics: new Map(),
  waitingSince: new Map(),
};

// --- BOT CONFIG ---
const BOT_WAIT_MS = 3000;  // connect bot after 3s of waiting
const BOT_STAY_MS = 5000;  // bot leaves after 5s

const GIRL_NAMES = [
  "Priya", "Anjali", "Neha", "Pooja", "Riya", "Divya", "Shreya", "Meera",
  "Ananya", "Kavya", "Nisha", "Simran", "Komal", "Deepa", "Sonal", "Pallavi",
  "Aisha", "Zara", "Ishita", "Sneha", "Tanvi", "Aditi", "Rhea", "Tanya",
  "Emma", "Sophia", "Olivia", "Isabella", "Mia", "Emily", "Charlotte",
  "Amelia", "Ava", "Luna", "Chloe", "Lily", "Zoe", "Grace", "Hannah",
  "Ella", "Aria", "Scarlett", "Victoria", "Aurora", "Stella", "Nora",
  "Yuki", "Sakura", "Mei", "Lin", "Yuna", "Hana", "Rin", "Sora",
  "Fatima", "Layla", "Nour", "Sara", "Yasmin", "Rania", "Lina",
  "Amara", "Nia", "Zuri", "Imani", "Sofia", "Valentina", "Camila", "Natalia",
];

function randomBotName() {
  const rand = Math.random();
  if (rand < 0.30) {
    // 30% — girl name
    return GIRL_NAMES[Math.floor(Math.random() * GIRL_NAMES.length)];
  } else if (rand < 0.80) {
    // 50% — Stranger (no age)
    return "Stranger";
  } else {
    // 20% — male with random age 18–32
    const age = Math.floor(Math.random() * 15) + 18;
    return `m ${age}`;
  }
}

// socketId -> wait timer (before bot connects)
const botWaitTimers = new Map();
// socketId -> stay timer (bot leave countdown)
const botStayTimers = new Map();

function clearBotTimers(socketId) {
  const wt = botWaitTimers.get(socketId);
  if (wt) { clearTimeout(wt); botWaitTimers.delete(socketId); }
  const st = botStayTimers.get(socketId);
  if (st) { clearTimeout(st); botStayTimers.delete(socketId); }
}

function scheduleBotMatch(socket) {
  clearBotTimers(socket.id);

  const timer = setTimeout(() => {
    botWaitTimers.delete(socket.id);
    if (state.waiting.has(socket.id)) connectBot(socket);
  }, BOT_WAIT_MS);

  botWaitTimers.set(socket.id, timer);
}

function connectBot(socket) {
  if (!state.waiting.has(socket.id)) return;

  const name = randomBotName();
  const botId = "bot_" + Math.random().toString(36).slice(2, 9);

  state.waiting.delete(socket.id);
  state.waitingSince.delete(socket.id);
  state.partner.set(socket.id, botId);

  socket.emit("partner_found", { partner: name });
  emitCounts();

  // Bot leaves after BOT_STAY_MS with no conversation
  const stayTimer = setTimeout(() => {
    botStayTimers.delete(socket.id);
    if (state.partner.get(socket.id) === botId) {
      state.partner.delete(socket.id);
      socket.emit("friend_left");
      emitCounts();
    }
  }, BOT_STAY_MS);

  botStayTimers.set(socket.id, stayTimer);
}

// --- HELPERS ---
function emitCounts() {
  io.emit("online", state.online.size);
  io.emit("waiting_count", state.waiting.size);
}

function clearPair(a, reason = "friend_left") {
  const b = state.partner.get(a);
  if (!b) return;

  state.partner.delete(a);
  state.partner.delete(b);

  io.to(a).emit(reason);
  if (!b.startsWith("bot_")) io.to(b).emit(reason);
}

function canMatch(a, b) {
  const ta = state.topics.get(a) || [];
  const tb = state.topics.get(b) || [];
  if (ta.length === 0 || tb.length === 0) return true;
  const setB = new Set(tb);
  return ta.some((t) => setB.has(t));
}

function tryMatch() {
  const ids = Array.from(state.waiting);

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i];
      const b = ids[j];

      if (state.partner.has(a) || state.partner.has(b)) continue;
      if (!canMatch(a, b)) continue;

      state.waiting.delete(a);
      state.waiting.delete(b);
      state.waitingSince.delete(a);
      state.waitingSince.delete(b);

      clearBotTimers(a);
      clearBotTimers(b);

      state.partner.set(a, b);
      state.partner.set(b, a);

      io.to(a).emit("partner_found", { partner: state.username.get(b) || "Stranger" });
      io.to(b).emit("partner_found", { partner: state.username.get(a) || "Stranger" });

      emitCounts();
      return;
    }
  }

  emitCounts();
}

// --- SOCKET.IO ---
io.on("connection", (socket) => {
  state.online.add(socket.id);
  state.username.set(socket.id, "Stranger");
  state.topics.set(socket.id, []);
  emitCounts();
  socket.emit("idle");

  socket.on("set_username", (name) => {
    const clean = typeof name === "string" && name.trim() ? name.trim().slice(0, 32) : "Stranger";
    state.username.set(socket.id, clean);
  });

  socket.on("set_topics", ({ topics }) => {
    const t = Array.isArray(topics) ? topics.filter(Boolean).map(String).slice(0, 10) : [];
    state.topics.set(socket.id, t);
  });

  socket.on("ready_to_chat", () => {
    if (state.partner.has(socket.id)) return;

    state.waiting.add(socket.id);
    state.waitingSince.set(socket.id, Date.now());
    socket.emit("waiting");
    emitCounts();

    tryMatch();

    if (state.waiting.has(socket.id)) scheduleBotMatch(socket);
  });

  socket.on("next", () => {
    clearBotTimers(socket.id);
    clearPair(socket.id, "friend_left");

    state.waiting.add(socket.id);
    state.waitingSince.set(socket.id, Date.now());
    socket.emit("waiting");
    emitCounts();

    tryMatch();

    if (state.waiting.has(socket.id)) scheduleBotMatch(socket);
  });

  socket.on("disconnect_request", () => {
    clearBotTimers(socket.id);
    clearPair(socket.id, "friend_left");
    state.waiting.delete(socket.id);
    state.waitingSince.delete(socket.id);
    socket.emit("idle");
    emitCounts();
  });

  socket.on("typing", ({ typing }) => {
    const b = state.partner.get(socket.id);
    if (!b || b.startsWith("bot_")) return;
    io.to(b).emit("partner_typing", { typing: !!typing });
  });

  socket.on("message", ({ msgId, text }) => {
    const b = state.partner.get(socket.id);
    if (!b) return;

    // Bot is silent — just acknowledge send, no reply
    if (b.startsWith("bot_")) {
      socket.emit("msg_sent", { msgId });
      return;
    }

    io.to(b).emit("message", {
      msgId,
      author: state.username.get(socket.id) || "Stranger",
      text: String(text || ""),
      fromId: socket.id,
      ts: Date.now(),
    });
    socket.emit("msg_sent", { msgId });
  });

  socket.on("image", ({ msgId, image }) => {
    const b = state.partner.get(socket.id);
    if (!b) return;

    if (b.startsWith("bot_")) {
      socket.emit("msg_sent", { msgId });
      return;
    }

    io.to(b).emit("image", {
      msgId,
      author: state.username.get(socket.id) || "Stranger",
      image,
      fromId: socket.id,
      ts: Date.now(),
    });
    socket.emit("msg_sent", { msgId });
  });

  socket.on("delivered", ({ msgId }) => {
    const b = state.partner.get(socket.id);
    if (!b || b.startsWith("bot_")) return;
    io.to(b).emit("msg_delivered", { msgId });
  });

  // --- Circles: authenticated group cohort rooms (separate from random chat) ---
  let cohortUser = null;
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (token) {
    const payload = circles.verifyToken(token);
    if (payload) cohortUser = circles.getUserById(payload.uid) || null;
  }

  socket.on("cohort_join", ({ cohortId }) => {
    if (!cohortUser) return socket.emit("cohort_error", { error: "Not authenticated" });
    if (!circles.cohortMembership(cohortId, cohortUser.id)) {
      return socket.emit("cohort_error", { error: "Not a member of this cohort" });
    }
    socket.join(`cohort_${cohortId}`);
    socket.emit("cohort_ready", { cohortId });
    io.to(`cohort_${cohortId}`).emit("cohort_presence", {
      cohortId,
      userId: cohortUser.id,
      name: cohortUser.name,
      event: "join",
    });
  });

  socket.on("cohort_message", ({ cohortId, text }) => {
    if (!cohortUser) return socket.emit("cohort_error", { error: "Not authenticated" });
    if (!circles.cohortMembership(cohortId, cohortUser.id)) return;
    const clean = String(text || "").trim().slice(0, 2000);
    if (!clean) return;
    const saved = circles.saveMessage(cohortId, cohortUser.id, clean);
    io.to(`cohort_${cohortId}`).emit("cohort_message", { cohortId, ...saved });
  });

  socket.on("cohort_typing", ({ cohortId, typing }) => {
    if (!cohortUser) return;
    if (!circles.cohortMembership(cohortId, cohortUser.id)) return;
    socket.to(`cohort_${cohortId}`).emit("cohort_typing", {
      cohortId,
      userId: cohortUser.id,
      name: cohortUser.name,
      typing: !!typing,
    });
  });

  socket.on("disconnect", () => {
    clearBotTimers(socket.id);
    clearPair(socket.id, "friend_left");
    state.waiting.delete(socket.id);
    state.waitingSince.delete(socket.id);
    state.partner.delete(socket.id);
    state.username.delete(socket.id);
    state.topics.delete(socket.id);
    state.online.delete(socket.id);
    emitCounts();
  });
});

server.listen(PORT, () => {
  console.log(`API running on :${PORT}`);
  console.log(`Allowed origin: ${FRONTEND_ORIGIN}`);
});
