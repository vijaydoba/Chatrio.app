// SQLite persistence for Circles (local / proximity) mode.
// Fully isolated from the random-chat server — its own DB file, own process.
const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.CIRCLES_DB_PATH || path.join(__dirname, "circles-local.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
-- Anonymous, persistent identity keyed by a device token (UUID in localStorage).
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  token      TEXT UNIQUE NOT NULL,
  nickname   TEXT NOT NULL DEFAULT 'Anon',
  age_ok     INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_seen  INTEGER NOT NULL
);

-- Only ever stores FUZZED coordinates (snapped to a coarse grid). Never exact.
CREATE TABLE IF NOT EXISTS user_location (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  lat        REAL NOT NULL,
  lng        REAL NOT NULL,
  is_visible INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

-- One-shot intro request. UNIQUE(from,to) => one pending/decided request per pair.
CREATE TABLE IF NOT EXISTS dm_requests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opener     TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | declined
  created_at INTEGER NOT NULL,
  UNIQUE(from_user, to_user)
);

-- Messages exchanged once a request is accepted. a_user = min(id), b_user = max(id).
CREATE TABLE IF NOT EXISTS dm_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  a_user     INTEGER NOT NULL,
  b_user     INTEGER NOT NULL,
  from_user  INTEGER NOT NULL,
  text       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

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

-- Phase 3: moderation. A banned user is rejected at the door (REST + socket).
CREATE TABLE IF NOT EXISTS bans (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reason     TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

-- ── Phase 2: local group rooms ──
-- A group is pinned to the FUZZED location where it was created. People nearby
-- discover and join it; everyone in it shares one real-time room.
CREATE TABLE IF NOT EXISTS groups (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  topic       TEXT NOT NULL DEFAULT '',
  creator     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  created_at  INTEGER NOT NULL,
  last_active INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  INTEGER NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_user  INTEGER NOT NULL,
  text       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_loc_vis  ON user_location(is_visible, lat, lng);

-- FCM device tokens for the native app (a user can have several devices).
CREATE TABLE IF NOT EXISTS push_tokens (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  platform   TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, token)
);
`);

// Additive migration for pre-existing DBs: avatar variant (seeds the anime avatar
// as `${nickname}#${avatar}`; 0 = plain nickname seed).
try { db.exec("ALTER TABLE users ADD COLUMN avatar INTEGER NOT NULL DEFAULT 0"); } catch (e) { /* already there */ }

// Additive migration: start of the user's current unbroken active streak (resets
// after an ACTIVE_WINDOW_MS gap in activity). Powers "longest active first" nearby sort.
try { db.exec("ALTER TABLE users ADD COLUMN session_start INTEGER NOT NULL DEFAULT 0"); } catch (e) { /* already there */ }

// Additive migration: self-reported gender ('male' | 'female' | 'trans' | 'other' | '' unset).
// Drives which avatar look (hairstyle pool etc.) the client generates for this user.
try { db.exec("ALTER TABLE users ADD COLUMN gender TEXT NOT NULL DEFAULT ''"); } catch (e) { /* already there */ }

// Additive migration: read-receipt timestamp (NULL = recipient hasn't seen it yet).
try { db.exec("ALTER TABLE dm_messages ADD COLUMN read_at INTEGER"); } catch (e) { /* already there */ }

// Browser Web Push subscriptions (VAPID) — one row per browser/device, so the
// same anon user can be reached on desktop Chrome and Android Chrome at once.
db.exec(`
CREATE TABLE IF NOT EXISTS web_push_subs (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  sub_json   TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, endpoint)
);
`);

db.exec(`
CREATE INDEX IF NOT EXISTS idx_dm_pair  ON dm_messages(a_user, b_user, id);
CREATE INDEX IF NOT EXISTS idx_req_to    ON dm_requests(to_user, status);
CREATE INDEX IF NOT EXISTS idx_req_from  ON dm_requests(from_user, status);
CREATE INDEX IF NOT EXISTS idx_grp_loc   ON groups(last_active, lat, lng);
CREATE INDEX IF NOT EXISTS idx_grp_mem   ON group_members(user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_grp_msg   ON group_messages(group_id, id);
`);

module.exports = db;
