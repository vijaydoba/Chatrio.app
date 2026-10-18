// Instagram-style 1:1 direct messages between accepted friends.
//
// Persistence mirrors the Circles cohort chat (server/circles.js
// getMessages/saveMessage); live delivery, typing and read receipts run over
// the socket in index.js. Every path is friends-only — a conversation is all
// dm_messages rows where (sender, recipient) is (me, them) or (them, me).
const express = require("express");
const db = require("./db");
const { verifyToken, getUserById } = require("./auth");
const friends = require("./friends");
const presence = require("./presence");

const MAX_LEN = 2000; // same cap as cohort + in-call chat

function authMiddleware(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  const payload = token && verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Authentication required" });
  const user = getUserById(payload.uid);
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

function httpErr(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// INSERT then read the row back (mirrors circles.saveMessage). Throws unless
// the two users are accepted friends, so socket + REST share one guard.
function saveDm(senderId, recipientId, text) {
  const clean = String(text || "").trim().slice(0, MAX_LEN);
  if (!clean) throw httpErr(400, "Empty message");
  if (!friends.areFriends(senderId, recipientId)) throw httpErr(403, "Not friends");
  const info = db
    .prepare("INSERT INTO dm_messages (sender_id, recipient_id, text, created_at) VALUES (?, ?, ?, ?)")
    .run(senderId, recipientId, clean, Date.now());
  return db
    .prepare("SELECT id, sender_id, recipient_id, text, created_at, read_at FROM dm_messages WHERE id = ?")
    .get(info.lastInsertRowid);
}

// Full thread (oldest-last, like circles.getMessages) plus a friend header so
// the thread page loads with a single request.
function getConversation(me, otherId, limit = 50) {
  if (!friends.areFriends(me, otherId)) throw httpErr(403, "Not friends");
  const other = getUserById(otherId);
  if (!other) throw httpErr(404, "Account not found");
  const messages = db
    .prepare(
      `SELECT id, sender_id, recipient_id, text, created_at, read_at
       FROM dm_messages
       WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
       ORDER BY id DESC LIMIT ?`
    )
    .all(me, otherId, otherId, me, limit)
    .reverse();
  return {
    friend: {
      id: other.id,
      name: other.name,
      online: presence.isOnline(otherId),
      lastSeen: presence.getLastSeen(otherId),
    },
    messages,
  };
}

// Flip every unread message other→me to read; returns how many changed.
function markRead(me, otherId) {
  const info = db
    .prepare("UPDATE dm_messages SET read_at = ? WHERE recipient_id = ? AND sender_id = ? AND read_at IS NULL")
    .run(Date.now(), me, otherId);
  return { read: info.changes };
}

const lastMsgStmt = db.prepare(
  `SELECT text, created_at, sender_id FROM dm_messages
   WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
   ORDER BY id DESC LIMIT 1`
);
const unreadStmt = db.prepare(
  "SELECT COUNT(*) AS n FROM dm_messages WHERE recipient_id = ? AND sender_id = ? AND read_at IS NULL"
);

// The whole Messages screen in one call: conversations (friend + last message +
// unread + presence, online-first) and the pending friend-request split. Reuses
// friends.listFriends so names + request state come from one source.
function listInbox(me) {
  const all = friends.listFriends(me); // {id,name,status,incoming,createdAt}
  const conversations = all
    .filter((f) => f.status === "accepted")
    .map((f) => {
      const last = lastMsgStmt.get(me, f.id, f.id, me) || null;
      return {
        id: f.id,
        name: f.name,
        online: presence.isOnline(f.id),
        lastSeen: presence.getLastSeen(f.id),
        unread: unreadStmt.get(me, f.id).n,
        lastMessage: last
          ? { text: last.text, createdAt: last.created_at, fromMe: last.sender_id === me }
          : null,
      };
    });

  // Online first, then most-recent conversation first (friends with no messages
  // yet fall to the bottom but still appear so you can start a chat).
  conversations.sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    const at = a.lastMessage ? a.lastMessage.createdAt : 0;
    const bt = b.lastMessage ? b.lastMessage.createdAt : 0;
    return bt - at;
  });

  return {
    conversations,
    requests: {
      incoming: all.filter((f) => f.status === "pending" && f.incoming).map((f) => ({ id: f.id, name: f.name })),
      sent: all.filter((f) => f.status === "pending" && !f.incoming).map((f) => ({ id: f.id, name: f.name })),
    },
  };
}

const router = express.Router();
router.get("/dm/inbox", authMiddleware, handle((req) => listInbox(req.user.id)));
router.get("/dm/:userId/messages", authMiddleware, handle((req) => getConversation(req.user.id, Number(req.params.userId))));
router.post("/dm/:userId/read", authMiddleware, handle((req) => markRead(req.user.id, Number(req.params.userId))));

module.exports = { router, saveDm, getConversation, markRead, listInbox };
