// SQLite persistence for Chatrio "Circles" (recurring cohort) mode.
// File-based, zero infra. Random-chat stays in-memory and untouched.
const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "chatrio.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  pass_hash  TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- A Circle is a recurring theme + weekly window (e.g. "Tech chat, Tue 20:00).
-- Cohorts are the capped sub-groups (~8 people) that actually meet & recur.
CREATE TABLE IF NOT EXISTS circles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  topic       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  day_of_week INTEGER NOT NULL,   -- 0=Sun .. 6=Sat
  hour        INTEGER NOT NULL,   -- 0..23 (local server hour)
  capacity    INTEGER NOT NULL DEFAULT 8,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cohorts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  circle_id  INTEGER NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  cohort_id  INTEGER NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  INTEGER NOT NULL,
  UNIQUE(cohort_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  cohort_id  INTEGER NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memberships_cohort ON memberships(cohort_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user   ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_cohort     ON messages(cohort_id, id);

-- Email capture for not-yet-live features (e.g. Circles "notify me" waitlist).
CREATE TABLE IF NOT EXISTS waitlist (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  UNIQUE(email, source)
);
`);

// --- Seed a couple of curated Circles so cohorts can actually fill. ---
// Liquidity is the make-or-break for recurring cohorts; curated > user-created for v1.
const circleCount = db.prepare("SELECT COUNT(*) AS n FROM circles").get().n;
if (circleCount === 0) {
  const now = Date.now();
  const insert = db.prepare(
    `INSERT INTO circles (topic, description, day_of_week, hour, capacity, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  insert.run("Evening Wind-Down", "A relaxed weeknight check-in with the same small group.", 2, 20, 8, now); // Tue 20:00
  insert.run("Book & Coffee", "Readers swapping what they're into, every weekend.", 6, 11, 8, now);          // Sat 11:00
  insert.run("Tech Tinkerers", "Builders, coders and makers talking shop midweek.", 4, 19, 8, now);           // Thu 19:00
}

module.exports = db;
