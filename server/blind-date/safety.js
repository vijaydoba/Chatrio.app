// Safety & moderation (Phase 05): block/report/ban, adapted directly from
// server/circles-local/store.js's equivalents — same shape, keyed by
// profile id instead of user id.
const db = require("./db");
const profiles = require("./profiles");

function blockProfile(blockerId, blockedId) {
  blockedId = Number(blockedId);
  if (!blockedId || blockedId === blockerId) throw profiles.httpErr(400, "Invalid profile.");
  db.prepare("INSERT OR IGNORE INTO blocks (blocker, blocked, created_at) VALUES (?, ?, ?)").run(
    blockerId, blockedId, Date.now()
  );
  return { ok: true };
}

function unblockProfile(blockerId, blockedId) {
  blockedId = Number(blockedId);
  if (!blockedId || blockedId === blockerId) throw profiles.httpErr(400, "Invalid profile.");
  db.prepare("DELETE FROM blocks WHERE blocker = ? AND blocked = ?").run(blockerId, blockedId);
  return { ok: true };
}

function blockedList(blockerId) {
  return db
    .prepare(
      `SELECT b.blocked AS id, p.display_name AS displayName, b.created_at
       FROM blocks b LEFT JOIN profiles p ON p.id = b.blocked
       WHERE b.blocker = ? ORDER BY b.created_at DESC`
    )
    .all(blockerId);
}

// Reporting also blocks, same as circles-local — the reporter stops being
// matched with them again regardless of what the moderation queue decides.
function reportProfile(reporterId, reportedId, reason) {
  reportedId = Number(reportedId);
  if (!reportedId || reportedId === reporterId) throw profiles.httpErr(400, "Invalid profile.");
  db.prepare("INSERT INTO reports (reporter, reported, reason, created_at) VALUES (?, ?, ?, ?)").run(
    reporterId, reportedId, String(reason || "").slice(0, 500), Date.now()
  );
  db.prepare("INSERT OR IGNORE INTO blocks (blocker, blocked, created_at) VALUES (?, ?, ?)").run(
    reporterId, reportedId, Date.now()
  );
  return { ok: true };
}

function banProfile(targetId, reason) {
  targetId = Number(targetId);
  if (!targetId) throw profiles.httpErr(400, "Invalid profile.");
  if (!profiles.getProfileById(targetId)) throw profiles.httpErr(404, "Profile not found.");
  db.prepare(
    `INSERT INTO bans (profile_id, reason, created_at) VALUES (?, ?, ?)
     ON CONFLICT(profile_id) DO UPDATE SET reason = excluded.reason`
  ).run(targetId, String(reason || "").slice(0, 500), Date.now());
  return { ok: true, profileId: targetId };
}

function unbanProfile(targetId) {
  targetId = Number(targetId);
  db.prepare("DELETE FROM bans WHERE profile_id = ?").run(targetId);
  return { ok: true, profileId: targetId };
}

// Reports grouped newest-first, enriched with display names, repeat-offender
// count, and current ban state — same shape as circles-local's listReports.
function listReports(limit = 200) {
  return db
    .prepare(
      `SELECT r.id, r.reason, r.created_at,
              r.reporter AS reporter_id, rp.display_name AS reporter_name,
              r.reported AS reported_id, dp.display_name AS reported_name,
              (SELECT COUNT(*) FROM reports r2 WHERE r2.reported = r.reported) AS reported_count,
              EXISTS(SELECT 1 FROM bans b WHERE b.profile_id = r.reported) AS reported_banned
       FROM reports r
       LEFT JOIN profiles rp ON rp.id = r.reporter
       LEFT JOIN profiles dp ON dp.id = r.reported
       ORDER BY r.created_at DESC LIMIT ?`
    )
    .all(Math.max(1, Math.min(1000, Number(limit) || 200)));
}

function listBans() {
  return db
    .prepare(
      `SELECT b.profile_id, p.display_name, b.reason, b.created_at
       FROM bans b LEFT JOIN profiles p ON p.id = b.profile_id
       ORDER BY b.created_at DESC`
    )
    .all();
}

module.exports = {
  blockProfile,
  unblockProfile,
  blockedList,
  reportProfile,
  banProfile,
  unbanProfile,
  listReports,
  listBans,
};
