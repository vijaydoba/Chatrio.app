// Data-access + domain logic for Circles (local) mode.
const db = require("./db");
const { fuzzLatLng, distanceMeters, distanceLabel, boundingBox } = require("./geo");

const NICK_MAX = 20;
const OPENER_MAX = 280;
const MSG_MAX = 2000;
const GROUP_NAME_MAX = 40;
const GROUP_TOPIC_MAX = 120;
// Only surface people who shared their location in the last 24h.
const LOCATION_FRESH_MS = 24 * 60 * 60 * 1000;
// Groups stay discoverable while they've had activity in the last 24h.
const GROUP_FRESH_MS = 24 * 60 * 60 * 1000;
// "Active now" window for presence (last_seen refreshes on every API hit + socket heartbeat).
const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

const now = () => Date.now();

function httpErr(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function sanitizeNick(raw) {
  let v = String(raw || "").replace(/[^\p{L}\p{N} _-]/gu, "").replace(/\s+/g, " ").trim();
  if (v.length > NICK_MAX) v = v.slice(0, NICK_MAX);
  return v;
}

const GENDERS = new Set(["male", "female", "trans", "other"]);

function publicUser(u) {
  return { id: u.id, nickname: u.nickname, ageOk: !!u.age_ok, avatar: u.avatar || 0, gender: u.gender || "" };
}

// ── identity ──
function getOrCreateUser(token) {
  token = String(token || "").trim();
  if (token.length < 8) throw httpErr(401, "Missing identity token");
  let u = db.prepare("SELECT * FROM users WHERE token = ?").get(token);
  const nowTs = now();
  if (!u) {
    const info = db
      .prepare("INSERT INTO users (token, nickname, created_at, last_seen, session_start) VALUES (?, 'Anon', ?, ?, ?)")
      .run(token, nowTs, nowTs, nowTs);
    u = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  } else {
    // A gap longer than the "active" window means their streak broke — start a new one.
    const sessionStart = nowTs - u.last_seen > ACTIVE_WINDOW_MS ? nowTs : (u.session_start || nowTs);
    db.prepare("UPDATE users SET last_seen = ?, session_start = ? WHERE id = ?").run(nowTs, sessionStart, u.id);
    u.last_seen = nowTs;
    u.session_start = sessionStart;
  }
  return u;
}

function setProfile(userId, { nickname, ageOk, avatar, gender }) {
  if (nickname !== undefined) {
    const nick = sanitizeNick(nickname);
    if (nick.length < 2) throw httpErr(400, "Nickname must be at least 2 characters");
    db.prepare("UPDATE users SET nickname = ? WHERE id = ?").run(nick, userId);
  }
  if (ageOk !== undefined) {
    db.prepare("UPDATE users SET age_ok = ? WHERE id = ?").run(ageOk ? 1 : 0, userId);
  }
  if (gender !== undefined) {
    if (!GENDERS.has(gender)) throw httpErr(400, "Invalid gender");
    db.prepare("UPDATE users SET gender = ? WHERE id = ?").run(gender, userId);
  }
  if (avatar !== undefined) {
    const v = Number(avatar);
    if (!Number.isInteger(v) || v < 0 || v > 999999) throw httpErr(400, "Invalid avatar");
    db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(v, userId);
  }
  return db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
}

function requireAge(user) {
  if (!user.age_ok) throw httpErr(403, "You must confirm you're 18+ first");
}

// ── location ──
function setLocation(userId, lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
    throw httpErr(400, "Valid coordinates required");
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) throw httpErr(400, "Coordinates out of range");
  const f = fuzzLatLng(lat, lng);
  db.prepare(
    `INSERT INTO user_location (user_id, lat, lng, is_visible, updated_at)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(user_id) DO UPDATE SET lat=excluded.lat, lng=excluded.lng, is_visible=1, updated_at=excluded.updated_at`
  ).run(userId, f.lat, f.lng, now());
  return { ok: true };
}

function setVisibility(userId, visible) {
  db.prepare("UPDATE user_location SET is_visible = ? WHERE user_id = ?").run(visible ? 1 : 0, userId);
  return { ok: true };
}

function blockedIdSet(userId) {
  const rows = db
    .prepare("SELECT blocked AS uid FROM blocks WHERE blocker = ? UNION SELECT blocker AS uid FROM blocks WHERE blocked = ?")
    .all(userId, userId);
  return new Set(rows.map((r) => r.uid));
}

function nearby(userId, radiusMeters) {
  radiusMeters = Math.max(1000, Math.min(50000, Number(radiusMeters) || 10000));
  const me = db.prepare("SELECT * FROM user_location WHERE user_id = ?").get(userId);
  if (!me) throw httpErr(409, "Share your location first");
  const { degLat, degLng } = boundingBox(me.lat, radiusMeters);
  const fresh = now() - LOCATION_FRESH_MS;
  const rows = db
    .prepare(
      `SELECT u.id, u.nickname, u.avatar, u.gender, l.lat, l.lng, u.last_seen, u.session_start
       FROM user_location l JOIN users u ON u.id = l.user_id
       WHERE l.is_visible = 1 AND l.user_id != ? AND l.updated_at >= ?
         AND l.lat BETWEEN ? AND ? AND l.lng BETWEEN ? AND ?`
    )
    .all(userId, fresh, me.lat - degLat, me.lat + degLat, me.lng - degLng, me.lng + degLng);

  const blocked = blockedIdSet(userId);
  const nowTs = now();
  return rows
    .filter((r) => !blocked.has(r.id))
    .map((r) => ({
      id: r.id,
      nickname: r.nickname,
      avatar: r.avatar || 0,
      gender: r.gender || "",
      lastSeen: r.last_seen,
      meters: distanceMeters(me.lat, me.lng, r.lat, r.lng),
      active: nowTs - r.last_seen < ACTIVE_WINDOW_MS,
      sessionMs: Math.max(0, nowTs - (r.session_start || r.last_seen)),
    }))
    .filter((r) => r.meters <= radiusMeters)
    // Active users surface first; among them, whoever has been active longest
    // (this unbroken streak) ranks highest. Everyone else falls back to nearest-first.
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      if (a.active) return b.sessionMs - a.sessionMs;
      return a.meters - b.meters;
    })
    .slice(0, 60)
    // last_seen rounded to the minute — enough for "Active now", no tighter tracking.
    .map((r) => ({
      id: r.id,
      nickname: r.nickname,
      avatar: r.avatar,
      gender: r.gender,
      distance: distanceLabel(r.meters),
      lastSeen: Math.floor(r.lastSeen / 60000) * 60000,
      sessionMin: r.active ? Math.floor(r.sessionMs / 60000) : undefined,
    }));
}

function touchLastSeen(userId) {
  db.prepare("UPDATE users SET last_seen = ? WHERE id = ?").run(now(), userId);
}

// ── DM requests (one-shot intro) ──
function isBlockedBetween(aId, bId) {
  return !!db
    .prepare("SELECT 1 FROM blocks WHERE (blocker = ? AND blocked = ?) OR (blocker = ? AND blocked = ?) LIMIT 1")
    .get(aId, bId, bId, aId);
}

function sendRequest(fromId, toId, text) {
  toId = Number(toId);
  if (!toId || toId === fromId) throw httpErr(400, "Invalid recipient");
  const target = db.prepare("SELECT id FROM users WHERE id = ?").get(toId);
  if (!target) throw httpErr(404, "User not found");
  if (isBlockedBetween(fromId, toId)) throw httpErr(403, "You can't message this user");
  const opener = String(text || "").trim().slice(0, OPENER_MAX);
  if (opener.length < 1) throw httpErr(400, "Write a short opener");

  const existing = db
    .prepare("SELECT id, status FROM dm_requests WHERE from_user = ? AND to_user = ?")
    .get(fromId, toId);
  if (existing) {
    if (existing.status === "declined") throw httpErr(403, "Request was declined");
    throw httpErr(409, "You already messaged this user");
  }
  const info = db
    .prepare("INSERT INTO dm_requests (from_user, to_user, opener, status, created_at) VALUES (?, ?, ?, 'pending', ?)")
    .run(fromId, toId, opener, now());
  return { id: info.lastInsertRowid, ok: true };
}

function incomingRequests(userId) {
  return db
    .prepare(
      `SELECT r.id, r.opener, r.created_at, u.id AS from_id, u.nickname AS from_nick, u.avatar AS from_avatar, u.gender AS from_gender
       FROM dm_requests r JOIN users u ON u.id = r.from_user
       WHERE r.to_user = ? AND r.status = 'pending'
       ORDER BY r.created_at DESC`
    )
    .all(userId);
}

function sentRequests(userId) {
  return db
    .prepare(
      `SELECT r.id, r.opener, r.status, r.created_at, u.id AS to_id, u.nickname AS to_nick
       FROM dm_requests r JOIN users u ON u.id = r.to_user
       WHERE r.from_user = ?
       ORDER BY r.created_at DESC`
    )
    .all(userId);
}

// Returns { status, fromUser, toUser } so the caller can notify the sender over sockets.
const respondToRequest = db.transaction((userId, requestId, action) => {
  const req = db.prepare("SELECT * FROM dm_requests WHERE id = ?").get(Number(requestId));
  if (!req || req.to_user !== userId) throw httpErr(404, "Request not found");
  if (req.status !== "pending") throw httpErr(409, "Already handled");

  if (action === "accept") {
    db.prepare("UPDATE dm_requests SET status = 'accepted' WHERE id = ?").run(req.id);
    // Seed the thread with the opener so the conversation has its first message.
    const a = Math.min(req.from_user, req.to_user);
    const b = Math.max(req.from_user, req.to_user);
    db.prepare("INSERT INTO dm_messages (a_user, b_user, from_user, text, created_at) VALUES (?, ?, ?, ?, ?)").run(
      a, b, req.from_user, req.opener, req.created_at
    );
    return { status: "accepted", fromUser: req.from_user, toUser: req.to_user };
  }
  if (action === "decline") {
    db.prepare("UPDATE dm_requests SET status = 'declined' WHERE id = ?").run(req.id);
    // Decline => the recipient blocks the sender, so they can't re-request.
    db.prepare("INSERT OR IGNORE INTO blocks (blocker, blocked, created_at) VALUES (?, ?, ?)").run(
      req.to_user, req.from_user, now()
    );
    return { status: "declined", fromUser: req.from_user, toUser: req.to_user };
  }
  throw httpErr(400, "Unknown action");
});

// ── DM threads / messages ──
function canMessage(aId, bId) {
  if (isBlockedBetween(aId, bId)) return false;
  return !!db
    .prepare(
      `SELECT 1 FROM dm_requests
       WHERE status = 'accepted' AND ((from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?))
       LIMIT 1`
    )
    .get(aId, bId, bId, aId);
}

function threads(userId) {
  const rows = db
    .prepare(
      `SELECT u.id AS other_id, u.nickname AS other_nick, u.avatar AS other_avatar, u.gender AS other_gender
       FROM dm_requests r
       JOIN users u ON u.id = (CASE WHEN r.from_user = ? THEN r.to_user ELSE r.from_user END)
       WHERE r.status = 'accepted' AND (r.from_user = ? OR r.to_user = ?)`
    )
    .all(userId, userId, userId);
  const blocked = blockedIdSet(userId);
  return rows.filter((r) => !blocked.has(r.other_id)).map((r) => {
    const a = Math.min(userId, r.other_id);
    const b = Math.max(userId, r.other_id);
    const last = db
      .prepare("SELECT text, created_at FROM dm_messages WHERE a_user = ? AND b_user = ? ORDER BY id DESC LIMIT 1")
      .get(a, b);
    return { otherId: r.other_id, nickname: r.other_nick, avatar: r.other_avatar || 0, gender: r.other_gender || "", lastText: last?.text || "", lastAt: last?.created_at || 0 };
  }).sort((x, y) => y.lastAt - x.lastAt);
}

function messagesWith(userId, otherId, limit = 100) {
  otherId = Number(otherId);
  if (!canMessage(userId, otherId)) throw httpErr(403, "No open conversation with this user");
  const a = Math.min(userId, otherId);
  const b = Math.max(userId, otherId);
  return db
    .prepare("SELECT id, from_user, text, created_at, read_at FROM dm_messages WHERE a_user = ? AND b_user = ? ORDER BY id ASC LIMIT ?")
    .all(a, b, limit);
}

function saveMessage(fromId, toId, text) {
  toId = Number(toId);
  if (!canMessage(fromId, toId)) throw httpErr(403, "No open conversation with this user");
  const body = String(text || "").trim().slice(0, MSG_MAX);
  if (!body) throw httpErr(400, "Empty message");
  const a = Math.min(fromId, toId);
  const b = Math.max(fromId, toId);
  const info = db
    .prepare("INSERT INTO dm_messages (a_user, b_user, from_user, text, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(a, b, fromId, body, now());
  return { id: info.lastInsertRowid, from_user: fromId, text: body, created_at: now(), read_at: null };
}

// Marks every message the OTHER person sent to `userId` as read (called when
// `userId` opens/is present in the thread). Returns how many changed so the
// caller only bothers notifying the sender when something actually flipped.
function markRead(userId, otherId) {
  otherId = Number(otherId);
  const a = Math.min(userId, otherId);
  const b = Math.max(userId, otherId);
  const at = now();
  const info = db
    .prepare("UPDATE dm_messages SET read_at = ? WHERE a_user = ? AND b_user = ? AND from_user = ? AND read_at IS NULL")
    .run(at, a, b, otherId);
  return { changed: info.changes, at };
}

// ── groups (local rooms) ──
function sanitizeText(raw, max) {
  let v = String(raw || "").replace(/\s+/g, " ").trim();
  if (v.length > max) v = v.slice(0, max);
  return v;
}

function myFuzzedLocation(userId) {
  const loc = db.prepare("SELECT lat, lng FROM user_location WHERE user_id = ?").get(userId);
  if (!loc) throw httpErr(409, "Share your location first");
  return loc;
}

function isMember(groupId, userId) {
  return !!db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ? LIMIT 1").get(groupId, userId);
}

function groupMemberIds(groupId) {
  return db.prepare("SELECT user_id FROM group_members WHERE group_id = ?").all(groupId).map((r) => r.user_id);
}

function groupName(groupId) {
  const g = db.prepare("SELECT name FROM groups WHERE id = ?").get(groupId);
  return g ? g.name : "";
}

const createGroup = db.transaction((userId, name, topic) => {
  const nm = sanitizeText(name, GROUP_NAME_MAX);
  if (nm.length < 2) throw httpErr(400, "Group name must be at least 2 characters");
  const tp = sanitizeText(topic, GROUP_TOPIC_MAX);
  const loc = myFuzzedLocation(userId); // pin the group to the creator's fuzzed area
  const info = db
    .prepare("INSERT INTO groups (name, topic, creator, lat, lng, created_at, last_active) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(nm, tp, userId, loc.lat, loc.lng, now(), now());
  db.prepare("INSERT INTO group_members (group_id, user_id, joined_at) VALUES (?, ?, ?)").run(info.lastInsertRowid, userId, now());
  return { id: info.lastInsertRowid, ok: true };
});

function groupPublic(g, userId) {
  const count = db.prepare("SELECT COUNT(*) AS n FROM group_members WHERE group_id = ?").get(g.id).n;
  // Members seen on Circles in the last few minutes — the "N active now" join trigger.
  const activeNow = db
    .prepare("SELECT COUNT(*) AS n FROM group_members m JOIN users u ON u.id = m.user_id WHERE m.group_id = ? AND u.last_seen >= ?")
    .get(g.id, now() - ACTIVE_WINDOW_MS).n;
  return { id: g.id, name: g.name, topic: g.topic, members: count, activeNow, isMember: isMember(g.id, userId) };
}

function nearbyGroups(userId, radiusMeters) {
  radiusMeters = Math.max(1000, Math.min(50000, Number(radiusMeters) || 10000));
  const me = myFuzzedLocation(userId);
  const { degLat, degLng } = boundingBox(me.lat, radiusMeters);
  const fresh = now() - GROUP_FRESH_MS;
  const rows = db
    .prepare(
      `SELECT g.* FROM groups g
       WHERE g.last_active >= ?
         AND g.lat BETWEEN ? AND ? AND g.lng BETWEEN ? AND ?`
    )
    .all(fresh, me.lat - degLat, me.lat + degLat, me.lng - degLng, me.lng + degLng);
  return rows
    .map((g) => ({ g, meters: distanceMeters(me.lat, me.lng, g.lat, g.lng) }))
    .filter((r) => r.meters <= radiusMeters)
    .sort((a, b) => a.meters - b.meters)
    .slice(0, 60)
    .map((r) => ({ ...groupPublic(r.g, userId), distance: distanceLabel(r.meters), meters: r.meters }))
    // Most alive first — activity beats raw distance as a join trigger.
    .sort((a, b) => (b.activeNow - a.activeNow) || (a.meters - b.meters))
    .map(({ meters, ...pub }) => pub);
}

function joinGroup(userId, groupId) {
  groupId = Number(groupId);
  const g = db.prepare("SELECT id FROM groups WHERE id = ?").get(groupId);
  if (!g) throw httpErr(404, "Group not found");
  db.prepare("INSERT OR IGNORE INTO group_members (group_id, user_id, joined_at) VALUES (?, ?, ?)").run(groupId, userId, now());
  return { ok: true };
}

const leaveGroup = db.transaction((userId, groupId) => {
  groupId = Number(groupId);
  db.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?").run(groupId, userId);
  // Clean up empty groups so discovery doesn't surface ghosts.
  const left = db.prepare("SELECT COUNT(*) AS n FROM group_members WHERE group_id = ?").get(groupId).n;
  if (left === 0) db.prepare("DELETE FROM groups WHERE id = ?").run(groupId);
  return { ok: true };
});

function myGroups(userId) {
  const rows = db
    .prepare(
      `SELECT g.* FROM groups g JOIN group_members m ON m.group_id = g.id
       WHERE m.user_id = ? ORDER BY g.last_active DESC`
    )
    .all(userId);
  return rows.map((g) => {
    const last = db
      .prepare("SELECT text, created_at FROM group_messages WHERE group_id = ? ORDER BY id DESC LIMIT 1")
      .get(g.id);
    return { ...groupPublic(g, userId), lastText: last?.text || "", lastAt: last?.created_at || g.created_at };
  });
}

function requireMember(userId, groupId) {
  if (!isMember(groupId, userId)) throw httpErr(403, "Join the group first");
}

function groupMessages(userId, groupId, limit = 100) {
  groupId = Number(groupId);
  requireMember(userId, groupId);
  const blocked = blockedIdSet(userId);
  const rows = db
    .prepare(
      `SELECT m.id, m.from_user, m.text, m.created_at, u.nickname AS from_nick
       FROM group_messages m JOIN users u ON u.id = m.from_user
       WHERE m.group_id = ? ORDER BY m.id ASC LIMIT ?`
    )
    .all(groupId, limit);
  // Hide messages from people this user has blocked/reported.
  return rows.filter((m) => !blocked.has(m.from_user));
}

function saveGroupMessage(userId, groupId, text) {
  groupId = Number(groupId);
  requireMember(userId, groupId);
  const body = String(text || "").trim().slice(0, MSG_MAX);
  if (!body) throw httpErr(400, "Empty message");
  const info = db
    .prepare("INSERT INTO group_messages (group_id, from_user, text, created_at) VALUES (?, ?, ?, ?)")
    .run(groupId, userId, body, now());
  db.prepare("UPDATE groups SET last_active = ? WHERE id = ?").run(now(), groupId);
  const u = db.prepare("SELECT nickname FROM users WHERE id = ?").get(userId);
  return { id: info.lastInsertRowid, group_id: groupId, from_user: userId, from_nick: u.nickname, text: body, created_at: now() };
}

// ── safety ──
function blockUser(userId, otherId) {
  otherId = Number(otherId);
  if (!otherId || otherId === userId) throw httpErr(400, "Invalid user");
  db.prepare("INSERT OR IGNORE INTO blocks (blocker, blocked, created_at) VALUES (?, ?, ?)").run(userId, otherId, now());
  return { ok: true };
}

function unblockUser(userId, otherId) {
  otherId = Number(otherId);
  if (!otherId || otherId === userId) throw httpErr(400, "Invalid user");
  db.prepare("DELETE FROM blocks WHERE blocker = ? AND blocked = ?").run(userId, otherId);
  // A change of heart should allow a fresh intro: clear declined one-shot
  // requests between the pair (decline is what auto-created the block).
  db.prepare(
    "DELETE FROM dm_requests WHERE status = 'declined' AND ((from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?))"
  ).run(userId, otherId, otherId, userId);
  return { ok: true };
}

function blockedList(userId) {
  return db
    .prepare(
      `SELECT b.blocked AS id, u.nickname, u.avatar, u.gender, b.created_at
       FROM blocks b JOIN users u ON u.id = b.blocked
       WHERE b.blocker = ? ORDER BY b.created_at DESC`
    )
    .all(userId);
}

function reportUser(userId, otherId, reason) {
  otherId = Number(otherId);
  if (!otherId || otherId === userId) throw httpErr(400, "Invalid user");
  db.prepare("INSERT INTO reports (reporter, reported, reason, created_at) VALUES (?, ?, ?, ?)").run(
    userId, otherId, String(reason || "").slice(0, 500), now()
  );
  // Reporting also blocks, so the reporter stops seeing them.
  db.prepare("INSERT OR IGNORE INTO blocks (blocker, blocked, created_at) VALUES (?, ?, ?)").run(userId, otherId, now());
  return { ok: true };
}

// ── moderation (Phase 3) ──
function isBanned(userId) {
  return !!db.prepare("SELECT 1 FROM bans WHERE user_id = ? LIMIT 1").get(userId);
}

function banUser(targetId, reason) {
  targetId = Number(targetId);
  if (!targetId) throw httpErr(400, "Invalid user");
  if (!db.prepare("SELECT id FROM users WHERE id = ?").get(targetId)) throw httpErr(404, "User not found");
  db.prepare(
    `INSERT INTO bans (user_id, reason, created_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET reason = excluded.reason`
  ).run(targetId, String(reason || "").slice(0, 500), now());
  // Pull them out of discovery immediately (they can't re-share — auth rejects them).
  db.prepare("UPDATE user_location SET is_visible = 0 WHERE user_id = ?").run(targetId);
  return { ok: true, userId: targetId };
}

function unbanUser(targetId) {
  targetId = Number(targetId);
  db.prepare("DELETE FROM bans WHERE user_id = ?").run(targetId);
  return { ok: true, userId: targetId };
}

// Reports grouped newest-first, enriched with nicknames, repeat-offender count, and ban state.
function listReports(limit = 200) {
  return db
    .prepare(
      `SELECT r.id, r.reason, r.created_at,
              r.reporter AS reporter_id, ru.nickname AS reporter_nick,
              r.reported AS reported_id, du.nickname AS reported_nick,
              (SELECT COUNT(*) FROM reports r2 WHERE r2.reported = r.reported) AS reported_count,
              EXISTS(SELECT 1 FROM bans b WHERE b.user_id = r.reported) AS reported_banned
       FROM reports r
       LEFT JOIN users ru ON ru.id = r.reporter
       LEFT JOIN users du ON du.id = r.reported
       ORDER BY r.created_at DESC LIMIT ?`
    )
    .all(Math.max(1, Math.min(1000, Number(limit) || 200)));
}

function listBans() {
  return db
    .prepare(
      `SELECT b.user_id, u.nickname, b.reason, b.created_at
       FROM bans b LEFT JOIN users u ON u.id = b.user_id
       ORDER BY b.created_at DESC`
    )
    .all();
}

// ── push notifications (native app) ──
function registerPushToken(userId, token, platform) {
  token = String(token || "").trim();
  if (!token) throw httpErr(400, "Missing push token");
  db.prepare(
    "INSERT OR REPLACE INTO push_tokens (user_id, token, platform, created_at) VALUES (?, ?, ?, ?)"
  ).run(userId, token, String(platform || "").slice(0, 20), now());
  return { ok: true };
}

function unregisterPushToken(userId, token) {
  db.prepare("DELETE FROM push_tokens WHERE user_id = ? AND token = ?").run(userId, String(token || ""));
  return { ok: true };
}

// One row per device — a user with 2 phones gets pushed on both.
function pushTokensForUsers(userIds) {
  const ids = [...new Set(userIds.map(Number))].filter(Boolean);
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  return db.prepare(`SELECT user_id, token FROM push_tokens WHERE user_id IN (${placeholders})`).all(...ids);
}

// ── browser Web Push subscriptions ──
function saveWebPushSub(userId, subscription) {
  const endpoint = subscription && typeof subscription.endpoint === "string" ? subscription.endpoint : "";
  if (!endpoint || !subscription.keys) throw httpErr(400, "Invalid push subscription");
  db.prepare(
    "INSERT OR REPLACE INTO web_push_subs (user_id, endpoint, sub_json, created_at) VALUES (?, ?, ?, ?)"
  ).run(userId, endpoint, JSON.stringify(subscription), now());
  return { ok: true };
}

function deleteWebPushSub(userId, endpoint) {
  db.prepare("DELETE FROM web_push_subs WHERE user_id = ? AND endpoint = ?").run(userId, String(endpoint || ""));
  return { ok: true };
}

function webPushSubsForUsers(userIds) {
  const ids = [...new Set(userIds.map(Number))].filter(Boolean);
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  return db.prepare(`SELECT user_id, endpoint, sub_json FROM web_push_subs WHERE user_id IN (${placeholders})`).all(...ids);
}

module.exports = {
  httpErr,
  publicUser,
  isBlockedBetween,
  isBanned,
  banUser,
  unbanUser,
  listReports,
  listBans,
  getOrCreateUser,
  setProfile,
  requireAge,
  setLocation,
  setVisibility,
  nearby,
  touchLastSeen,
  sendRequest,
  incomingRequests,
  sentRequests,
  respondToRequest,
  canMessage,
  threads,
  messagesWith,
  saveMessage,
  markRead,
  createGroup,
  nearbyGroups,
  joinGroup,
  leaveGroup,
  myGroups,
  isMember,
  groupMemberIds,
  groupName,
  requireMember,
  groupMessages,
  saveGroupMessage,
  blockUser,
  unblockUser,
  blockedList,
  reportUser,
  registerPushToken,
  unregisterPushToken,
  pushTokensForUsers,
  saveWebPushSub,
  deleteWebPushSub,
  webPushSubsForUsers,
};
