// In-memory account presence for friend online / last-seen.
//
// A user is "online" while they hold at least one live socket (multiple tabs =
// multiple sockets in the set). When their final socket disconnects we persist
// `users.last_seen` (ms epoch) so "Active 3h ago" survives a server restart.
//
// Required by index.js (the writer, on connect/disconnect) and by the DM/friends
// REST readers. Depends only on ./db to stay free of circular requires.
const db = require("./db");

const online = new Map(); // userId -> Set<socketId>

const setLastSeenStmt = db.prepare("UPDATE users SET last_seen = ? WHERE id = ?");
const getLastSeenStmt = db.prepare("SELECT last_seen FROM users WHERE id = ?");

// Returns true if this is the user's first live socket (i.e. they just came
// online) so the caller can broadcast a presence change exactly once.
function markOnline(userId, socketId) {
  if (!userId || !socketId) return false;
  let set = online.get(userId);
  const wasOffline = !set || set.size === 0;
  if (!set) {
    set = new Set();
    online.set(userId, set);
  }
  set.add(socketId);
  return wasOffline;
}

// Returns true if that was the user's last socket (they just went fully offline).
function markOffline(userId, socketId) {
  if (!userId) return false;
  const set = online.get(userId);
  if (!set) return false;
  set.delete(socketId);
  if (set.size === 0) {
    online.delete(userId);
    setLastSeenStmt.run(Date.now(), userId);
    return true;
  }
  return false;
}

function isOnline(userId) {
  const set = online.get(userId);
  return !!set && set.size > 0;
}

function socketsFor(userId) {
  const set = online.get(userId);
  return set ? Array.from(set) : [];
}

// Null when the user is currently online (no "last seen" to show) or unknown.
function getLastSeen(userId) {
  if (isOnline(userId)) return null;
  const row = getLastSeenStmt.get(userId);
  return row && row.last_seen ? row.last_seen : null;
}

module.exports = { markOnline, markOffline, isOnline, socketsFor, getLastSeen };
