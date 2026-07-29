// Blind Date API — isolated service, separate from random chat and circles-local.
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();
const profiles = require("./profiles");
const matching = require("./matching");
const chat = require("./chat");
const safety = require("./safety");
const { verifyToken } = require("./auth");

const PORT = process.env.BLIND_DATE_PORT || 5070;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://chatrio.app";
const ADMIN_TOKEN = process.env.BLIND_DATE_ADMIN_TOKEN || "";

const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());

function handle(fn) {
  return (req, res) => {
    try {
      res.json(fn(req, res));
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message || "Server error" });
    }
  };
}

// ── simple in-memory rate limiter (per key, sliding window) — same shape as
// circles-local. Defined before routes so /report can use it too. ──
const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const t = Date.now();
  const b = buckets.get(key);
  if (!b || t > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: t + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count++;
  return true;
}
// ── identity middleware: real chatrio account JWT (same token as /login, /signup) ──
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace(/^Bearer\s+/i, "");
  const payload = token && verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Please log in to use Blind Date." });
  req.userId = payload.uid;
  const profile = profiles.getProfile(payload.uid);
  if (profile && profiles.isBanned(profile.id)) {
    return res.status(403).json({ error: "Your Blind Date access has been suspended." });
  }
  next();
}

// ── admin auth: shared secret in X-Admin-Token (set BLIND_DATE_ADMIN_TOKEN) ──
function admin(req, res, next) {
  if (!ADMIN_TOKEN || req.headers["x-admin-token"] !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── requires an onboarded profile, not just a logged-in account ──
function requireProfile(req) {
  const profile = profiles.getProfile(req.userId);
  if (!profile) throw profiles.httpErr(404, "Complete your Blind Date profile first.");
  return profile;
}

app.get("/profile", auth, handle((req) => profiles.getProfile(req.userId)));
app.post("/profile", auth, handle((req) => profiles.upsertProfile(req.userId, req.body || {})));
app.get("/meta", handle(() => ({
  genders: profiles.GENDERS,
  seekingGenders: profiles.SEEKING_GENDERS,
  intents: profiles.INTENTS,
  interests: profiles.INTERESTS,
  personalityQuestions: profiles.PERSONALITY_QUESTIONS,
})));

app.post("/queue/join", auth, handle((req) => matching.join(requireProfile(req))));
app.get("/queue/status", auth, handle((req) => matching.status(requireProfile(req).id)));
app.post("/queue/leave", auth, handle((req) => matching.leave(requireProfile(req).id)));

// ── current date: state + history in one call, for a page load / reload ──
app.get("/match/current", auth, handle((req) => {
  const profile = requireProfile(req);
  const current = chat.getActiveMatchState(profile.id);
  if (!current) return null;
  return { ...current.state, messages: chat.listMessages(current.match.id, profile.id) };
}));

// ── safety (Phase 05) ──
app.post("/block", auth, handle((req) => safety.blockProfile(requireProfile(req).id, (req.body || {}).profileId)));
app.post("/unblock", auth, handle((req) => safety.unblockProfile(requireProfile(req).id, (req.body || {}).profileId)));
app.get("/blocked", auth, handle((req) => safety.blockedList(requireProfile(req).id)));

// ── admin / moderation (Phase 05) — gated by X-Admin-Token ──
app.get("/admin/reports", admin, handle(() => safety.listReports()));
app.get("/admin/bans", admin, handle(() => safety.listBans()));
app.post("/admin/ban", admin, handle((req) => safety.banProfile((req.body || {}).profileId, (req.body || {}).reason)));
app.post("/admin/unban", admin, handle((req) => safety.unbanProfile((req.body || {}).profileId)));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: FRONTEND_ORIGIN, credentials: true } });

io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  const payload = token && verifyToken(token);
  const profile = payload && profiles.getProfile(payload.uid);
  if (!profile || profiles.isBanned(profile.id)) return next(new Error("unauthorized"));
  socket.data.profile = profile;
  next();
});

const room = (matchId) => `match_${matchId}`;

io.on("connection", (socket) => {
  const me = socket.data.profile;

  socket.on("join_match", () => {
    const current = chat.getActiveMatchState(me.id);
    if (!current) return socket.emit("match_error", { error: "No active date." });
    socket.join(room(current.match.id));
    socket.emit("match_state", current.state);
  });

  socket.on("send_message", ({ matchId, text }) => {
    try {
      if (!rateLimit(`msg:${me.id}`, 20, 10 * 1000)) return; // 20 msgs / 10s
      const saved = chat.addMessage(Number(matchId), me.id, text);
      io.to(room(matchId)).emit("message", saved);
    } catch (e) {
      socket.emit("match_error", { error: e.message || "Couldn't send message." });
    }
  });

  socket.on("reveal_tap", ({ matchId }) => {
    try {
      const state = chat.tapReveal(Number(matchId), me.id);
      io.to(room(matchId)).emit("match_state", state);
    } catch (e) {
      socket.emit("match_error", { error: e.message || "Couldn't reveal." });
    }
  });

  socket.on("leave_match", ({ matchId }) => {
    try {
      chat.endMatch(Number(matchId), me.id);
      io.to(room(matchId)).emit("match_ended");
      io.in(room(matchId)).socketsLeave(room(matchId));
    } catch (e) {
      socket.emit("match_error", { error: e.message || "Couldn't end date." });
    }
  });

  // Report + block the other side of the date, then end it — same "reporting
  // also blocks" behavior as circles-local. Rate-limited so reporting itself
  // can't be used as a griefing vector against a date partner.
  socket.on("report_match", ({ matchId, reason }) => {
    try {
      if (!rateLimit(`report:${me.id}`, 5, 60 * 60 * 1000)) { // 5 reports / hour
        return socket.emit("match_error", { error: "Too many reports — slow down." });
      }
      const match = chat.getMatch(Number(matchId));
      chat.requireMembership(match, me.id);
      const other = chat.otherSide(match, me.id);
      safety.reportProfile(me.id, other, reason);
      chat.endMatch(Number(matchId), me.id);
      io.to(room(matchId)).emit("match_ended");
      io.in(room(matchId)).socketsLeave(room(matchId));
    } catch (e) {
      socket.emit("match_error", { error: e.message || "Couldn't report." });
    }
  });

  // ── Video escalation (Phase 07) — pure signaling relay, no persisted state.
  // Every event is scoped to the other socket in the room (not an echo back
  // to the sender, unlike message/match_state), and every handler re-checks
  // membership + an active match the same way the handlers above do.
  function requireActiveRevealed(matchId) {
    const match = chat.getMatch(Number(matchId));
    chat.requireMembership(match, me.id);
    if (match.status !== "active") throw profiles.httpErr(400, "This date has ended.");
    const state = chat.buildState(match, me.id);
    if (!state.revealed) throw profiles.httpErr(400, "Reveal before starting video.");
    return match;
  }

  socket.on("video_invite", ({ matchId }) => {
    try {
      if (!rateLimit(`vinvite:${me.id}`, 6, 60 * 1000)) { // 6 invites / min
        return socket.emit("match_error", { error: "Too many call attempts — slow down." });
      }
      requireActiveRevealed(matchId);
      const others = io.sockets.adapter.rooms.get(room(matchId));
      if (!others || others.size < 2) {
        return socket.emit("match_error", { error: "They're not connected right now." });
      }
      socket.to(room(matchId)).emit("video_invite", { matchId: Number(matchId), fromProfileId: me.id });
    } catch (e) {
      socket.emit("match_error", { error: e.message || "Couldn't start video." });
    }
  });

  socket.on("video_accept", ({ matchId }) => {
    try {
      requireActiveRevealed(matchId);
      socket.to(room(matchId)).emit("video_accept", { matchId: Number(matchId), fromProfileId: me.id });
    } catch (e) {
      socket.emit("match_error", { error: e.message || "Couldn't start video." });
    }
  });

  socket.on("video_decline", ({ matchId, reason }) => {
    try {
      const match = chat.getMatch(Number(matchId));
      chat.requireMembership(match, me.id);
      socket.to(room(matchId)).emit("video_decline", { matchId: Number(matchId), reason });
    } catch (e) {
      socket.emit("match_error", { error: e.message || "Couldn't decline video." });
    }
  });

  socket.on("video_cancel", ({ matchId }) => {
    try {
      const match = chat.getMatch(Number(matchId));
      chat.requireMembership(match, me.id);
      socket.to(room(matchId)).emit("video_cancel", { matchId: Number(matchId) });
    } catch (e) {
      socket.emit("match_error", { error: e.message || "Couldn't cancel video." });
    }
  });

  socket.on("video_offer", ({ matchId, sdp }) => {
    try {
      requireActiveRevealed(matchId);
      socket.to(room(matchId)).emit("video_offer", { matchId: Number(matchId), sdp });
    } catch (e) {
      socket.emit("match_error", { error: e.message || "Couldn't connect video." });
    }
  });

  socket.on("video_answer", ({ matchId, sdp }) => {
    try {
      requireActiveRevealed(matchId);
      socket.to(room(matchId)).emit("video_answer", { matchId: Number(matchId), sdp });
    } catch (e) {
      socket.emit("match_error", { error: e.message || "Couldn't connect video." });
    }
  });

  socket.on("video_ice_candidate", ({ matchId, candidate }) => {
    try {
      const match = chat.getMatch(Number(matchId));
      chat.requireMembership(match, me.id);
      socket.to(room(matchId)).emit("video_ice_candidate", { matchId: Number(matchId), candidate });
    } catch (e) {
      // ICE candidates arrive in bursts; a stray failure here isn't worth surfacing to the user.
    }
  });

  socket.on("video_end", ({ matchId, reason }) => {
    try {
      const match = chat.getMatch(Number(matchId));
      chat.requireMembership(match, me.id);
      socket.to(room(matchId)).emit("video_end", { matchId: Number(matchId), reason });
    } catch (e) {
      socket.emit("match_error", { error: e.message || "Couldn't end video." });
    }
  });
});

server.listen(PORT, () => console.log(`Blind Date API listening on :${PORT}`));
