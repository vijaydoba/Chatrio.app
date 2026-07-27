// Circles (local / proximity) API — isolated service, separate from random chat.
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();
const store = require("./store");
const push = require("./push");

const PORT = process.env.CIRCLES_PORT || 5060;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://chatrio.app";

const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
if (process.env.CIRCLES_LOG) app.use((req, _res, next) => { console.log(`${req.method} ${req.url}`); next(); });

// ── identity middleware: anon device token in X-Anon-Token header ──
function auth(req, res, next) {
  try {
    const user = store.getOrCreateUser(req.headers["x-anon-token"]);
    if (store.isBanned(user.id)) throw store.httpErr(403, "Your access to Circles has been suspended.");
    req.user = user;
    next();
  } catch (e) {
    res.status(e.status || 401).json({ error: e.message || "Unauthorized" });
  }
}

// ── admin auth: shared secret in X-Admin-Token (set CIRCLES_ADMIN_TOKEN) ──
const ADMIN_TOKEN = process.env.CIRCLES_ADMIN_TOKEN || "";
function admin(req, res, next) {
  if (!ADMIN_TOKEN || req.headers["x-admin-token"] !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
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

// ── simple in-memory rate limiter (per user, sliding window) ──
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
function limit(key, max, windowMs) {
  if (!rateLimit(key, max, windowMs)) throw store.httpErr(429, "Slow down a moment");
}

app.get("/health", (req, res) => res.json({ ok: true, service: "circles-local" }));

// identity / profile
app.get("/me", auth, handle((req) => store.publicUser(req.user)));
app.post("/me", auth, handle((req) => store.publicUser(store.setProfile(req.user.id, req.body || {}))));

// location
app.post("/location", auth, handle((req) => {
  store.requireAge(req.user);
  const { lat, lng } = req.body || {};
  return store.setLocation(req.user.id, lat, lng);
}));
app.post("/location/visibility", auth, handle((req) =>
  store.setVisibility(req.user.id, !!(req.body || {}).visible)
));

// nearby
app.get("/nearby", auth, handle((req) => {
  store.requireAge(req.user);
  limit(`near:${req.user.id}`, 30, 60 * 1000);
  return store.nearby(req.user.id, req.query.radius);
}));

// DM requests
app.post("/dm/request", auth, handle((req) => {
  store.requireAge(req.user);
  limit(`req:${req.user.id}`, 15, 60 * 60 * 1000); // 15 intro requests / hour
  const { toUserId, text } = req.body || {};
  const result = store.sendRequest(req.user.id, toUserId, text);
  // Real-time nudge so the recipient sees the intro without refreshing.
  io.to(`user_${Number(toUserId)}`).emit("dm_request", { from: store.publicUser(req.user) });
  push.sendToUsers([Number(toUserId)], {
    title: "New Circles intro",
    body: `${req.user.nickname} said hi`,
    data: { type: "dm_request" },
  });
  return result;
}));
app.get("/dm/incoming", auth, handle((req) => store.incomingRequests(req.user.id)));
app.get("/dm/sent", auth, handle((req) => store.sentRequests(req.user.id)));
app.post("/dm/respond", auth, handle((req) => {
  const { requestId, action } = req.body || {};
  const result = store.respondToRequest(req.user.id, requestId, action);
  // Notify the sender (if online) that their request was accepted/declined.
  const ev = result.status === "accepted" ? "dm_accepted" : "dm_declined";
  io.to(`user_${result.fromUser}`).emit(ev, { by: store.publicUser(req.user) });
  return { status: result.status };
}));

// DM threads / history
app.get("/dm/threads", auth, handle((req) => store.threads(req.user.id)));
app.get("/dm/with/:otherId", auth, handle((req) => store.messagesWith(req.user.id, req.params.otherId)));

// groups (local rooms)
app.post("/groups", auth, handle((req) => {
  store.requireAge(req.user);
  limit(`grp:${req.user.id}`, 5, 60 * 60 * 1000); // 5 new groups / hour
  const { name, topic } = req.body || {};
  return store.createGroup(req.user.id, name, topic);
}));
app.get("/groups/nearby", auth, handle((req) => {
  store.requireAge(req.user);
  limit(`gnear:${req.user.id}`, 30, 60 * 1000);
  return store.nearbyGroups(req.user.id, req.query.radius);
}));
app.get("/groups/mine", auth, handle((req) => store.myGroups(req.user.id)));
app.post("/groups/:id/join", auth, handle((req) => {
  store.requireAge(req.user);
  return store.joinGroup(req.user.id, req.params.id);
}));
app.post("/groups/:id/leave", auth, handle((req) => store.leaveGroup(req.user.id, req.params.id)));
app.get("/groups/:id/messages", auth, handle((req) => store.groupMessages(req.user.id, req.params.id)));

// safety
app.post("/block", auth, handle((req) => store.blockUser(req.user.id, (req.body || {}).userId)));
app.post("/unblock", auth, handle((req) => store.unblockUser(req.user.id, (req.body || {}).userId)));
app.get("/blocked", auth, handle((req) => store.blockedList(req.user.id)));
app.post("/report", auth, handle((req) => store.reportUser(req.user.id, (req.body || {}).userId, (req.body || {}).reason)));

// push notifications (native app)
app.post("/push/register", auth, handle((req) => {
  const { token, platform } = req.body || {};
  return store.registerPushToken(req.user.id, token, platform);
}));
app.post("/push/unregister", auth, handle((req) =>
  store.unregisterPushToken(req.user.id, (req.body || {}).token)
));

// push notifications (browser Web Push)
app.get("/push/vapid-key", handle(() => ({ key: push.vapidPublicKey })));
app.post("/push/subscribe", auth, handle((req) =>
  store.saveWebPushSub(req.user.id, (req.body || {}).subscription)
));
app.post("/push/unsubscribe", auth, handle((req) =>
  store.deleteWebPushSub(req.user.id, (req.body || {}).endpoint)
));

// ── admin / moderation (Phase 3) — gated by X-Admin-Token ──
app.get("/admin/reports", admin, handle(() => store.listReports()));
app.get("/admin/bans", admin, handle(() => store.listBans()));
app.post("/admin/ban", admin, handle((req) => {
  const { userId, reason } = req.body || {};
  const r = store.banUser(userId, reason);
  io.in(`user_${r.userId}`).disconnectSockets(true); // kick any live sessions
  return r;
}));
app.post("/admin/unban", admin, handle((req) => store.unbanUser((req.body || {}).userId)));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: FRONTEND_ORIGIN, credentials: true } });

// ── sockets: real-time DM threads ──
io.use((socket, next) => {
  try {
    const user = store.getOrCreateUser(socket.handshake.auth && socket.handshake.auth.token);
    if (store.isBanned(user.id)) return next(new Error("suspended"));
    socket.data.user = user;
    next();
  } catch (e) {
    next(new Error("unauthorized"));
  }
});

const dmRoom = (a, b) => `dm_${Math.min(a, b)}_${Math.max(a, b)}`;

io.on("connection", (socket) => {
  const me = socket.data.user;
  socket.join(`user_${me.id}`); // personal room for notifications

  // Presence heartbeat: users idling in an open thread never hit REST,
  // so keep their last_seen fresh while the socket is up.
  store.touchLastSeen(me.id);
  const heartbeat = setInterval(() => store.touchLastSeen(me.id), 60 * 1000);
  socket.on("disconnect", () => clearInterval(heartbeat));

  socket.on("dm_open", ({ otherId }) => {
    const other = Number(otherId);
    if (!store.canMessage(me.id, other)) return socket.emit("dm_error", { error: "No open conversation" });
    socket.join(dmRoom(me.id, other));
    // Opening the thread reads whatever the other person already sent.
    const r = store.markRead(me.id, other);
    if (r.changed) io.to(dmRoom(me.id, other)).emit("dm_read", { by: me.id, at: r.at });
  });

  socket.on("dm_message", async ({ otherId, text }) => {
    try {
      const other = Number(otherId);
      if (!rateLimit(`msg:${me.id}`, 30, 10 * 1000)) return; // 30 msgs / 10s
      const saved = store.saveMessage(me.id, other, text);
      const payload = { ...saved, otherId: me.id };
      io.to(dmRoom(me.id, other)).emit("dm_message", { ...saved });
      io.to(`user_${other}`).emit("dm_inbox", payload); // notification badge for recipient

      // Recipient already has the thread open (both joined the room) — mark
      // this message read immediately instead of waiting for their next dm_open.
      const roomSockets = await io.in(dmRoom(me.id, other)).fetchSockets();
      const recipientViewing = roomSockets.some((s) => s.data.user.id === other);
      if (recipientViewing) {
        const r = store.markRead(other, me.id);
        if (r.changed) io.to(dmRoom(me.id, other)).emit("dm_read", { by: other, at: r.at });
      } else {
        // Not actively looking at this thread — this is the case a browser tab
        // can't cover, so it's the one push is actually for.
        push.sendToUsers([other], {
          title: me.nickname,
          body: saved.text.length > 120 ? `${saved.text.slice(0, 117)}...` : saved.text,
          data: { type: "dm_message", otherId: me.id },
        });
      }
    } catch (e) {
      socket.emit("dm_error", { error: e.message || "Could not send" });
    }
  });

  socket.on("dm_typing", ({ otherId, typing }) => {
    const other = Number(otherId);
    socket.to(dmRoom(me.id, other)).emit("dm_typing", { userId: me.id, typing: !!typing });
  });

  // ── group rooms (mirror the DM pattern) ──
  socket.on("group_open", ({ groupId }) => {
    const gid = Number(groupId);
    if (!store.isMember(gid, me.id)) return socket.emit("group_error", { error: "Join the group first" });
    socket.join(`group_${gid}`);
  });

  socket.on("group_message", async ({ groupId, text }) => {
    try {
      const gid = Number(groupId);
      if (!rateLimit(`gmsg:${me.id}`, 30, 10 * 1000)) return; // 30 msgs / 10s
      const saved = store.saveGroupMessage(me.id, gid, text);
      // Deliver per-socket so blocked senders stay hidden in live chat too — not
      // just on history reload. (Group posts aren't gated at send time the way
      // DMs are, so the block filter has to happen on delivery.)
      const sockets = await io.in(`group_${gid}`).fetchSockets();
      const viewing = new Set();
      for (const s of sockets) {
        const uid = s.data.user.id;
        if (uid !== me.id && store.isBlockedBetween(uid, me.id)) continue;
        viewing.add(uid);
        s.emit("group_message", saved);
      }
      // Members not currently looking at the room get a push instead.
      const offline = store
        .groupMemberIds(gid)
        .filter((uid) => uid !== me.id && !viewing.has(uid) && !store.isBlockedBetween(uid, me.id));
      push.sendToUsers(offline, {
        title: store.groupName(gid),
        body: `${me.nickname}: ${saved.text.length > 100 ? `${saved.text.slice(0, 97)}...` : saved.text}`,
        data: { type: "group_message", groupId: gid },
      });
    } catch (e) {
      socket.emit("group_error", { error: e.message || "Could not send" });
    }
  });

  socket.on("group_typing", async ({ groupId, typing }) => {
    const gid = Number(groupId);
    if (!store.isMember(gid, me.id)) return;
    const sockets = await io.in(`group_${gid}`).fetchSockets();
    for (const s of sockets) {
      const uid = s.data.user.id;
      if (uid === me.id || store.isBlockedBetween(uid, me.id)) continue;
      s.emit("group_typing", { userId: me.id, nickname: me.nickname, typing: !!typing });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Circles-local API on :${PORT}`);
  console.log(`Allowed origin: ${FRONTEND_ORIGIN}`);
});
