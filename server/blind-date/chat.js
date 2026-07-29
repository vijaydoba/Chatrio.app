// Blind chat room logic (Phase 04): messages, reveal, and ending a date.
const db = require("./db");
const profiles = require("./profiles");

const REVEAL_FALLBACK_MS = 10 * 60 * 1000;

function getMatch(matchId) {
  return db.prepare("SELECT * FROM matches WHERE id = ?").get(matchId);
}

function requireMembership(match, profileId) {
  if (!match) throw profiles.httpErr(404, "No such date.");
  if (match.user_a !== profileId && match.user_b !== profileId) {
    throw profiles.httpErr(403, "You're not part of this date.");
  }
}

function otherSide(match, profileId) {
  return match.user_a === profileId ? match.user_b : match.user_a;
}

function getReveal(matchId) {
  return db.prepare("SELECT * FROM reveals WHERE match_id = ?").get(matchId);
}

// Revealed if both sides have tapped, OR the 10-minute fallback has elapsed —
// whichever comes first. The timeout needs no background job: it's just time math.
function revealState(match, reveal) {
  const aRevealed = !!(reveal && reveal.a_revealed);
  const bRevealed = !!(reveal && reveal.b_revealed);
  const mutual = aRevealed && bRevealed;
  const timedOut = Date.now() - match.created_at >= REVEAL_FALLBACK_MS;
  return {
    aRevealed,
    bRevealed,
    revealed: mutual || timedOut,
    revealedAt: mutual ? reveal.revealed_at : timedOut ? match.created_at + REVEAL_FALLBACK_MS : null,
    fallbackAt: match.created_at + REVEAL_FALLBACK_MS,
  };
}

function buildState(match, profileId) {
  const reveal = getReveal(match.id);
  const state = revealState(match, reveal);
  const isA = match.user_a === profileId;
  const other = profiles.getProfileById(otherSide(match, profileId));
  return {
    matchId: match.id,
    status: match.status,
    createdAt: match.created_at,
    revealed: state.revealed,
    revealedAt: state.revealedAt,
    fallbackAt: state.fallbackAt,
    myRevealed: isA ? state.aRevealed : state.bRevealed,
    otherRevealed: isA ? state.bRevealed : state.aRevealed,
    otherDisplayName: state.revealed ? (other && other.displayName) || "Your date" : null,
    // Bare id, not a name/photo — needed client-side to deterministically pick
    // which side of a video call sends the WebRTC offer (Phase 07).
    otherProfileId: otherSide(match, profileId),
  };
}

function getActiveMatchState(profileId) {
  const match = db
    .prepare("SELECT * FROM matches WHERE status = 'active' AND (user_a = ? OR user_b = ?)")
    .get(profileId, profileId);
  if (!match) return null;
  return { match, state: buildState(match, profileId) };
}

function listMessages(matchId, profileId) {
  const match = getMatch(matchId);
  requireMembership(match, profileId);
  return db
    .prepare("SELECT id, from_profile, text, created_at FROM messages WHERE match_id = ? ORDER BY id ASC")
    .all(matchId);
}

function addMessage(matchId, profileId, text) {
  const match = getMatch(matchId);
  requireMembership(match, profileId);
  if (match.status !== "active") throw profiles.httpErr(400, "This date has ended.");

  const clean = String(text || "").trim().slice(0, 2000);
  if (!clean) throw profiles.httpErr(400, "Message can't be empty.");

  const now = Date.now();
  const info = db
    .prepare("INSERT INTO messages (match_id, from_profile, text, created_at) VALUES (?, ?, ?, ?)")
    .run(matchId, profileId, clean, now);
  return { id: info.lastInsertRowid, from_profile: profileId, text: clean, created_at: now };
}

function tapReveal(matchId, profileId) {
  const match = getMatch(matchId);
  requireMembership(match, profileId);
  if (match.status !== "active") throw profiles.httpErr(400, "This date has ended.");

  const now = Date.now();
  const isA = match.user_a === profileId;
  db.prepare(
    `INSERT INTO reveals (match_id, a_revealed, b_revealed) VALUES (?, ?, ?)
     ON CONFLICT(match_id) DO UPDATE SET ${isA ? "a_revealed" : "b_revealed"} = 1`
  ).run(matchId, isA ? 1 : 0, isA ? 0 : 1);

  const reveal = getReveal(matchId);
  if (reveal.a_revealed && reveal.b_revealed && !reveal.revealed_at) {
    db.prepare("UPDATE reveals SET revealed_at = ? WHERE match_id = ?").run(now, matchId);
  }

  return buildState(match, profileId);
}

function endMatch(matchId, profileId) {
  const match = getMatch(matchId);
  requireMembership(match, profileId);
  if (match.status === "active") {
    db.prepare("UPDATE matches SET status = 'ended', ended_at = ? WHERE id = ?").run(Date.now(), matchId);
  }
  return { ok: true };
}

module.exports = {
  getMatch,
  requireMembership,
  otherSide,
  buildState,
  getActiveMatchState,
  listMessages,
  addMessage,
  tapReveal,
  endMatch,
};
