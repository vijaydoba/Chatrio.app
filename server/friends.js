// Persistent reconnect list for authenticated random-video-chat users
// ("Add Friend" — Monkey-app style). Anonymous text chat never touches this.
const express = require("express");
const db = require("./db");
const { verifyToken, getUserById } = require("./auth");

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

// Friend pairs are stored once per pair, canonically ordered so (a,b) and
// (b,a) requests land on the same row.
function pairKey(a, b) {
  return a < b ? [a, b] : [b, a];
}

// Called both from the REST "add friend" flow and the in-call socket event
// (server/index.js `vc_friend_request`). If the other side already sent a
// pending request, this one completes it — mirrors Circles' request/accept
// pattern but auto-accepts on mutual interest instead of a separate step.
function upsertFriendRequest(fromId, toId) {
  if (fromId === toId) throw httpErr(400, "Cannot friend yourself");
  const [a, b] = pairKey(fromId, toId);

  const existing = db.prepare("SELECT * FROM friends WHERE user_id_a = ? AND user_id_b = ?").get(a, b);
  if (!existing) {
    db.prepare(
      `INSERT INTO friends (user_id_a, user_id_b, status, requested_by, created_at)
       VALUES (?, ?, 'pending', ?, ?)`
    ).run(a, b, fromId, Date.now());
    return { status: "pending" };
  }
  if (existing.status === "accepted") return { status: "accepted" };
  if (existing.requested_by !== fromId) {
    db.prepare("UPDATE friends SET status = 'accepted', responded_at = ? WHERE id = ?").run(Date.now(), existing.id);
    return { status: "accepted" };
  }
  return { status: "pending" };
}

function listFriends(userId) {
  const rows = db
    .prepare(
      `SELECT f.status, f.requested_by, f.created_at,
              u.id AS other_id, u.name AS other_name
       FROM friends f
       JOIN users u ON u.id = (CASE WHEN f.user_id_a = ? THEN f.user_id_b ELSE f.user_id_a END)
       WHERE f.user_id_a = ? OR f.user_id_b = ?
       ORDER BY f.created_at DESC`
    )
    .all(userId, userId, userId);
  return rows.map((r) => ({
    id: r.other_id,
    name: r.other_name,
    status: r.status,
    incoming: r.status === "pending" && r.requested_by !== userId,
    createdAt: r.created_at,
  }));
}

function respond(userId, otherId, action) {
  const [a, b] = pairKey(userId, otherId);
  const row = db.prepare("SELECT * FROM friends WHERE user_id_a = ? AND user_id_b = ?").get(a, b);
  if (!row || row.status !== "pending") throw httpErr(404, "No pending request");
  if (row.requested_by === userId) throw httpErr(400, "Cannot respond to your own request");

  if (action === "accept") {
    db.prepare("UPDATE friends SET status = 'accepted', responded_at = ? WHERE id = ?").run(Date.now(), row.id);
    return { status: "accepted" };
  }
  db.prepare("DELETE FROM friends WHERE id = ?").run(row.id);
  return { status: "declined" };
}

const router = express.Router();
router.get("/friends", authMiddleware, handle((req) => listFriends(req.user.id)));
router.post("/friends/:userId/accept", authMiddleware, handle((req) => respond(req.user.id, Number(req.params.userId), "accept")));
router.post("/friends/:userId/decline", authMiddleware, handle((req) => respond(req.user.id, Number(req.params.userId), "decline")));

module.exports = { router, upsertFriendRequest, listFriends };
