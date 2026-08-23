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

// --- Abuse reports: admin-only moderation queue for random text/video chat ---
app.get("/reports", (req, res) => {
  const adminToken = process.env.ADMIN_TOKEN;
  const provided = (req.headers.authorization || "").replace(/^Bearer\s+/i, "") || req.query.key;
  if (!adminToken || provided !== adminToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json(circles.listReports());
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
  blocked: new Map(), // socketId -> Set of socketIds it must never be rematched with (post-report)
};

// --- Random Video Chat: separate matching pool from text chat, so video and
// text matching never cross-pair with each other.
const vc = {
  waiting: new Set(),
  partner: new Map(),
  waitingSince: new Map(),
};

// --- HELPERS ---
function emitCounts() {
  io.emit("online", state.online.size);
  io.emit("waiting_count", state.waiting.size);
}

// Random chat has no login yet, so IP is the only durable signal for
// repeat-offender detection. Prefer X-Forwarded-For (set by the nginx
// reverse proxy in production) over the raw socket address.
function getClientIp(socket) {
  const forwarded = socket.handshake.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return socket.handshake.address;
}

// Permanently (for the lifetime of both sessions) prevents a and b from
// being rematched with each other, e.g. after one reports the other.
function blockPair(a, b) {
  if (!state.blocked.has(a)) state.blocked.set(a, new Set());
  if (!state.blocked.has(b)) state.blocked.set(b, new Set());
  state.blocked.get(a).add(b);
  state.blocked.get(b).add(a);
}

function clearPair(a, reason = "friend_left") {
  const b = state.partner.get(a);
  if (!b) return;

  state.partner.delete(a);
  state.partner.delete(b);

  io.to(a).emit(reason);
  io.to(b).emit(reason);
}

function canMatch(a, b) {
  if (state.blocked.get(a)?.has(b)) return false;

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

      state.partner.set(a, b);
      state.partner.set(b, a);

      io.to(a).emit("partner_found", { partner: state.username.get(b) || "Stranger", partnerId: b });
      io.to(b).emit("partner_found", { partner: state.username.get(a) || "Stranger", partnerId: a });

      emitCounts();
      return;
    }
  }

  emitCounts();
}

function emitVcCounts() {
  io.emit("vc_waiting_count", vc.waiting.size);
}

function clearVcPair(a, reason = "vc_friend_left") {
  const b = vc.partner.get(a);
  if (!b) return;

  vc.partner.delete(a);
  vc.partner.delete(b);

  io.to(a).emit(reason);
  io.to(b).emit(reason);
}

function tryVcMatch() {
  const ids = Array.from(vc.waiting);

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i];
      const b = ids[j];

      if (vc.partner.has(a) || vc.partner.has(b)) continue;

      vc.waiting.delete(a);
      vc.waiting.delete(b);
      vc.waitingSince.delete(a);
      vc.waitingSince.delete(b);

      vc.partner.set(a, b);
      vc.partner.set(b, a);

      io.to(a).emit("vc_partner_found", { partner: "Stranger", partnerId: b });
      io.to(b).emit("vc_partner_found", { partner: "Stranger", partnerId: a });

      emitVcCounts();
      return;
    }
  }

  emitVcCounts();
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
  });

  socket.on("next", () => {
    clearPair(socket.id, "friend_left");

    state.waiting.add(socket.id);
    state.waitingSince.set(socket.id, Date.now());
    socket.emit("waiting");
    emitCounts();

    tryMatch();
  });

  socket.on("report_partner", () => {
    const b = state.partner.get(socket.id);
    if (!b) return;

    blockPair(socket.id, b);

    const reportedSocket = io.sockets.sockets.get(b);
    circles.saveReport({
      mode: "text",
      reporterIp: getClientIp(socket),
      reportedIp: reportedSocket ? getClientIp(reportedSocket) : null,
    });
  });

  socket.on("disconnect_request", () => {
    clearPair(socket.id, "friend_left");
    state.waiting.delete(socket.id);
    state.waitingSince.delete(socket.id);
    socket.emit("idle");
    emitCounts();
  });

  socket.on("typing", ({ typing }) => {
    const b = state.partner.get(socket.id);
    if (!b) return;
    io.to(b).emit("partner_typing", { typing: !!typing });
  });

  socket.on("message", ({ msgId, text }) => {
    const b = state.partner.get(socket.id);
    if (!b) return;

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
    if (!b) return;
    io.to(b).emit("msg_delivered", { msgId });
  });

  // --- Video chat: pure signaling relay between the current pair.
  const VIDEO_RELAY_EVENTS = [
    "video_invite", "video_accept", "video_decline", "video_cancel",
    "video_offer", "video_answer", "video_ice_candidate", "video_end",
  ];
  VIDEO_RELAY_EVENTS.forEach((event) => {
    socket.on(event, (payload) => {
      const b = state.partner.get(socket.id);
      if (!b) return;
      io.to(b).emit(event, payload || {});
    });
  });

  // --- Random Video Chat: dedicated auto-start video matching, separate
  // pool/state from text random chat (see `vc` above).
  socket.on("vc_ready_to_chat", () => {
    if (vc.partner.has(socket.id)) return;

    vc.waiting.add(socket.id);
    vc.waitingSince.set(socket.id, Date.now());
    socket.emit("vc_waiting");
    emitVcCounts();

    tryVcMatch();
  });

  socket.on("vc_next", () => {
    clearVcPair(socket.id, "vc_friend_left");

    vc.waiting.add(socket.id);
    vc.waitingSince.set(socket.id, Date.now());
    socket.emit("vc_waiting");
    emitVcCounts();

    tryVcMatch();
  });

  socket.on("vc_disconnect_request", () => {
    clearVcPair(socket.id, "vc_friend_left");
    vc.waiting.delete(socket.id);
    vc.waitingSince.delete(socket.id);
    socket.emit("vc_idle");
    emitVcCounts();
  });

  const VC_RELAY_EVENTS = ["vc_offer", "vc_answer", "vc_ice_candidate", "vc_end"];
  VC_RELAY_EVENTS.forEach((event) => {
    socket.on(event, (payload) => {
      const b = vc.partner.get(socket.id);
      if (!b) return;
      io.to(b).emit(event, payload || {});
    });
  });

  // --- Random Video Chat: text side-channel alongside the video call.
  socket.on("vc_typing", ({ typing }) => {
    const b = vc.partner.get(socket.id);
    if (!b) return;
    io.to(b).emit("vc_partner_typing", { typing: !!typing });
  });

  socket.on("vc_message", ({ msgId, text }) => {
    const b = vc.partner.get(socket.id);
    if (!b) return;

    io.to(b).emit("vc_message", {
      msgId,
      text: String(text || "").slice(0, 2000),
      fromId: socket.id,
      ts: Date.now(),
    });
    socket.emit("vc_msg_sent", { msgId });
  });

  socket.on("vc_delivered", ({ msgId }) => {
    const b = vc.partner.get(socket.id);
    if (!b) return;
    io.to(b).emit("vc_msg_delivered", { msgId });
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
    clearPair(socket.id, "friend_left");
    state.waiting.delete(socket.id);
    state.waitingSince.delete(socket.id);
    state.partner.delete(socket.id);
    state.username.delete(socket.id);
    state.topics.delete(socket.id);
    state.online.delete(socket.id);
    state.blocked.delete(socket.id);
    emitCounts();

    clearVcPair(socket.id, "vc_friend_left");
    vc.waiting.delete(socket.id);
    vc.waitingSince.delete(socket.id);
    emitVcCounts();
  });
});

server.listen(PORT, () => {
  console.log(`API running on :${PORT}`);
  console.log(`Allowed origin: ${FRONTEND_ORIGIN}`);
});
