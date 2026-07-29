// SQLite persistence for Blind Date. Fully isolated from the random-chat
// server and from circles-local — its own DB file, own process.
const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.BLIND_DATE_DB_PATH || path.join(__dirname, "blind-date.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
-- Tied to a real chatrio account (the main server's JWT uid claim), not an
-- anonymous device token — bans need to actually stick, and matches should
-- survive a cleared browser or a switched device. A profile only exists once
-- onboarding is submitted.
CREATE TABLE IF NOT EXISTS profiles (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER UNIQUE NOT NULL,
  display_name     TEXT NOT NULL DEFAULT '',
  age              INTEGER NOT NULL,
  gender           TEXT NOT NULL,
  seeking_gender   TEXT NOT NULL,
  seeking_min_age  INTEGER NOT NULL,
  seeking_max_age  INTEGER NOT NULL,
  intent           TEXT NOT NULL,
  interests        TEXT NOT NULL DEFAULT '[]',
  age_verified     INTEGER NOT NULL DEFAULT 0,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);

-- Forced-choice personality questionnaire, feeds the Phase 03 matching score.
CREATE TABLE IF NOT EXISTS personality_answers (
  profile_id INTEGER PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  answers    TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL
);

-- Phase 03+: one active blind date at a time per profile.
CREATE TABLE IF NOT EXISTS matches (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a     INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b     INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'active', -- active | ended
  created_at INTEGER NOT NULL,
  ended_at   INTEGER
);

-- Phase 04: mutual-tap reveal, or the 10-minute fallback timer.
CREATE TABLE IF NOT EXISTS reveals (
  match_id    INTEGER PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
  a_revealed  INTEGER NOT NULL DEFAULT 0,
  b_revealed  INTEGER NOT NULL DEFAULT 0,
  revealed_at INTEGER
);

-- Phase 04: text messages within a single blind date. Deleted along with the
-- match (a fresh "next date" starts with a clean thread, not shared history).
CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id    INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  from_profile INTEGER NOT NULL,
  text        TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);

-- Phase 05: safety primitives, same shape as circles-local.
CREATE TABLE IF NOT EXISTS blocks (
  blocker    INTEGER NOT NULL,
  blocked    INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker, blocked)
);

CREATE TABLE IF NOT EXISTS reports (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter   INTEGER NOT NULL,
  reported   INTEGER NOT NULL,
  reason     TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS bans (
  profile_id INTEGER PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  reason     TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
`);

module.exports = db;
