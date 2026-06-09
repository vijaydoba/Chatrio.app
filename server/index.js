const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();

const PORT = process.env.PORT || 5050;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://chatrio.app";

const app = express();
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

// --- ROUTES ---
app.get("/", (req, res) => res.send("Chatrio API ✅"));
app.get("/health", (req, res) => res.json({ ok: true }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    credentials: true,
  },
});

const state = {
  online: new Set(),                 // socket ids
  waiting: new Set(),                // socket ids waiting
  partner: new Map(),                // socketId -> partnerSocketId
  username: new Map(),               // socketId -> name
  topics: new Map(),                 // socketId -> string[]
  waitingSince: new Map(),           // socketId -> timestamp
};

function emitCounts() {
  io.emit("online", state.online.size);
  io.emit("waiting_count", state.waiting.size);
}

function clearPair(a, reason = "friend_left") {
  const b = state.partner.get(a);
  if (!b) return;

  state.partner.delete(a);
  state.partner.delete(b);

  // notify both if connected
  io.to(a).emit(reason);
  io.to(b).emit(reason);
}

function canMatch(a, b) {
  const ta = state.topics.get(a) || [];
  const tb = state.topics.get(b) || [];

  // If either side has no topics, allow match
  if (ta.length === 0 || tb.length === 0) return true;

  // Otherwise require at least one overlap
  const setB = new Set(tb);
  return ta.some((t) => setB.has(t));
}

function tryMatch() {
  const ids = Array.from(state.waiting);

  // Try to match any two compatible users
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i];
      const b = ids[j];

      // skip if already paired
      if (state.partner.has(a) || state.partner.has(b)) continue;
      if (!canMatch(a, b)) continue;

      // pair them
      state.waiting.delete(a);
      state.waiting.delete(b);
      state.waitingSince.delete(a);
      state.waitingSince.delete(b);

      state.partner.set(a, b);
      state.partner.set(b, a);

      const nameA = state.username.get(a) || "Stranger";
      const nameB = state.username.get(b) || "Stranger";

      io.to(a).emit("partner_found", { partner: nameB });
      io.to(b).emit("partner_found", { partner: nameA });

      emitCounts();
      return; // match one pair at a time
    }
  }

  emitCounts();
}

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
    // if already paired, ignore
    if (state.partner.has(socket.id)) return;

    state.waiting.add(socket.id);
    state.waitingSince.set(socket.id, Date.now());
    socket.emit("waiting");
    emitCounts();

    tryMatch();
  });

  socket.on("next", () => {
    // break current pair, then re-queue
    clearPair(socket.id, "friend_left");
    state.waiting.add(socket.id);
    state.waitingSince.set(socket.id, Date.now());
    socket.emit("waiting");
    emitCounts();
    tryMatch();
  });

  socket.on("disconnect_request", () => {
    // leave chat & go idle
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

  socket.on("disconnect", () => {
    // clean up
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