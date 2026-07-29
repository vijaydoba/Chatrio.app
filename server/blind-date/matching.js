// Matching engine (Phase 03). Adapts the queue/scan shape from the legacy
// random-chat engine's tryMatch()/canMatch() in server/index.js, but scores
// on profile compatibility instead of shared topic tags, and — unlike that
// engine — never falls back to a fake bot match. If no one's queued, the
// caller just stays "waiting" until a real compatible person joins.
const db = require("./db");
const profiles = require("./profiles");

// profileId -> { since: number }. Ephemeral, like the legacy engine's `waiting` Set —
// matching is a live, momentary queue, not something that needs to survive a restart.
const waiting = new Map();

function hardFilterOk(a, b) {
  if (a.id === b.id) return false;
  if (profiles.isBanned(a.id) || profiles.isBanned(b.id)) return false;

  const ageOkAtoB = b.age >= a.seekingMinAge && b.age <= a.seekingMaxAge;
  const ageOkBtoA = a.age >= b.seekingMinAge && a.age <= b.seekingMaxAge;
  if (!ageOkAtoB || !ageOkBtoA) return false;

  const genderOkAtoB = a.seekingGender === "everyone" || a.seekingGender === b.gender;
  const genderOkBtoA = b.seekingGender === "everyone" || b.seekingGender === a.gender;
  if (!genderOkAtoB || !genderOkBtoA) return false;

  const blocked = db
    .prepare(
      "SELECT 1 FROM blocks WHERE (blocker = ? AND blocked = ?) OR (blocker = ? AND blocked = ?)"
    )
    .get(a.id, b.id, b.id, a.id);
  if (blocked) return false;

  return true;
}

function score(a, b) {
  const setA = new Set(a.interests);
  const shared = b.interests.filter((i) => setA.has(i)).length;
  const union = new Set([...a.interests, ...b.interests]).size || 1;
  const interestScore = shared / union;

  const intentScore =
    a.intent === b.intent ? 1 : a.intent === "not_sure" || b.intent === "not_sure" ? 0.5 : 0;

  const bAnswers = new Map(b.personalityAnswers.map((x) => [x.id, x.choice]));
  const total = a.personalityAnswers.length || 1;
  const matches = a.personalityAnswers.filter((x) => bAnswers.get(x.id) === x.choice).length;
  const personalityScore = matches / total;

  return 0.3 * interestScore + 0.2 * intentScore + 0.5 * personalityScore;
}

function getActiveMatch(profileId) {
  const row = db
    .prepare("SELECT * FROM matches WHERE status = 'active' AND (user_a = ? OR user_b = ?)")
    .get(profileId, profileId);
  return row || null;
}

function createMatch(aId, bId) {
  const now = Date.now();
  const info = db
    .prepare("INSERT INTO matches (user_a, user_b, status, created_at) VALUES (?, ?, 'active', ?)")
    .run(aId, bId, now);
  return db.prepare("SELECT * FROM matches WHERE id = ?").get(info.lastInsertRowid);
}

// Scans everyone currently waiting, picks the best-scoring compatible candidate
// for `profile`, and — if found — matches them and removes both from the queue.
function tryMatch(profile) {
  let best = null;
  let bestScore = -1;

  for (const otherId of waiting.keys()) {
    if (otherId === profile.id) continue;
    const other = profiles.getProfileById(otherId);
    if (!other) {
      waiting.delete(otherId); // profile vanished (shouldn't happen, but don't get stuck on it)
      continue;
    }
    if (!hardFilterOk(profile, other)) continue;

    const s = score(profile, other);
    if (s > bestScore) {
      bestScore = s;
      best = other;
    }
  }

  if (!best) return null;

  waiting.delete(profile.id);
  waiting.delete(best.id);
  return createMatch(profile.id, best.id);
}

function join(profile) {
  const existing = getActiveMatch(profile.id);
  if (existing) return { status: "matched", match: existing };

  waiting.set(profile.id, { since: Date.now() });
  const match = tryMatch(profile);
  if (match) return { status: "matched", match };

  return { status: "waiting" };
}

function status(profileId) {
  const existing = getActiveMatch(profileId);
  if (existing) return { status: "matched", match: existing };
  if (waiting.has(profileId)) return { status: "waiting" };
  return { status: "idle" };
}

function leave(profileId) {
  waiting.delete(profileId);
  return { ok: true };
}

module.exports = { join, status, leave, getActiveMatch };
