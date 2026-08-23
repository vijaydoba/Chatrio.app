// Auth + Circles/cohort logic for Chatrio recurring-cohort mode.
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const TOKEN_TTL = "30d";

function signToken(user) {
  return jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name };
}

// --- Auth ---
function signup({ email, name, password }) {
  email = String(email || "").trim().toLowerCase();
  name = String(name || "").trim().slice(0, 32);
  password = String(password || "");
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw httpErr(400, "Valid email required");
  if (!name) throw httpErr(400, "Name required");
  if (password.length < 6) throw httpErr(400, "Password must be at least 6 characters");

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) throw httpErr(409, "An account with that email already exists");

  const pass_hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO users (email, name, pass_hash, created_at) VALUES (?, ?, ?, ?)")
    .run(email, name, pass_hash, Date.now());
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  return { token: signToken(user), user: publicUser(user) };
}

function login({ email, password }) {
  email = String(email || "").trim().toLowerCase();
  password = String(password || "");
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.pass_hash)) {
    throw httpErr(401, "Invalid email or password");
  }
  return { token: signToken(user), user: publicUser(user) };
}

function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

// --- Circles & cohorts ---
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function nextOccurrence(day_of_week, hour) {
  // Next timestamp matching the weekly window, in server local time.
  const now = new Date();
  const d = new Date(now);
  d.setHours(hour, 0, 0, 0);
  let delta = (day_of_week - now.getDay() + 7) % 7;
  if (delta === 0 && d.getTime() <= now.getTime()) delta = 7;
  d.setDate(d.getDate() + delta);
  return d.getTime();
}

function circleView(c, userId) {
  const memberCount = db
    .prepare(
      `SELECT COUNT(*) AS n FROM memberships m
       JOIN cohorts co ON co.id = m.cohort_id
       WHERE co.circle_id = ?`
    )
    .get(c.id).n;
  const myCohort = userId ? findUserCohortInCircle(userId, c.id) : null;
  return {
    id: c.id,
    topic: c.topic,
    description: c.description,
    dayOfWeek: c.day_of_week,
    dayLabel: DAYS[c.day_of_week],
    hour: c.hour,
    capacity: c.capacity,
    memberCount,
    nextSessionAt: nextOccurrence(c.day_of_week, c.hour),
    joined: !!myCohort,
    cohortId: myCohort ? myCohort.id : null,
  };
}

function listCircles(userId) {
  return db
    .prepare("SELECT * FROM circles ORDER BY created_at ASC")
    .all()
    .map((c) => circleView(c, userId));
}

function findUserCohortInCircle(userId, circleId) {
  return db
    .prepare(
      `SELECT co.* FROM cohorts co
       JOIN memberships m ON m.cohort_id = co.id
       WHERE co.circle_id = ? AND m.user_id = ?`
    )
    .get(circleId, userId);
}

// Place a user into an open cohort (cap not reached); else create a new one.
const joinCircle = db.transaction((userId, circleId) => {
  const circle = db.prepare("SELECT * FROM circles WHERE id = ?").get(circleId);
  if (!circle) throw httpErr(404, "Circle not found");

  const existing = findUserCohortInCircle(userId, circleId);
  if (existing) return cohortDetail(existing.id, userId);

  let cohort = db
    .prepare(
      `SELECT co.id, COUNT(m.id) AS n
       FROM cohorts co
       LEFT JOIN memberships m ON m.cohort_id = co.id
       WHERE co.circle_id = ?
       GROUP BY co.id
       HAVING n < ?
       ORDER BY n DESC
       LIMIT 1`
    )
    .get(circleId, circle.capacity);

  let cohortId;
  if (cohort) {
    cohortId = cohort.id;
  } else {
    cohortId = db
      .prepare("INSERT INTO cohorts (circle_id, created_at) VALUES (?, ?)")
      .run(circleId, Date.now()).lastInsertRowid;
  }

  db.prepare(
    "INSERT OR IGNORE INTO memberships (cohort_id, user_id, joined_at) VALUES (?, ?, ?)"
  ).run(cohortId, userId, Date.now());

  return cohortDetail(cohortId, userId);
});

function cohortMembership(cohortId, userId) {
  return db
    .prepare("SELECT * FROM memberships WHERE cohort_id = ? AND user_id = ?")
    .get(cohortId, userId);
}

function cohortDetail(cohortId, userId) {
  const cohort = db.prepare("SELECT * FROM cohorts WHERE id = ?").get(cohortId);
  if (!cohort) throw httpErr(404, "Cohort not found");
  if (!cohortMembership(cohortId, userId)) throw httpErr(403, "Not a member of this cohort");

  const circle = db.prepare("SELECT * FROM circles WHERE id = ?").get(cohort.circle_id);
  const members = db
    .prepare(
      `SELECT u.id, u.name FROM memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.cohort_id = ? ORDER BY m.joined_at ASC`
    )
    .all(cohortId);

  return {
    id: cohort.id,
    circleId: circle.id,
    topic: circle.topic,
    description: circle.description,
    dayLabel: DAYS[circle.day_of_week],
    hour: circle.hour,
    nextSessionAt: nextOccurrence(circle.day_of_week, circle.hour),
    members,
  };
}

function listMyCohorts(userId) {
  const rows = db
    .prepare(
      `SELECT co.id AS cohort_id, c.*
       FROM memberships m
       JOIN cohorts co ON co.id = m.cohort_id
       JOIN circles c ON c.id = co.circle_id
       WHERE m.user_id = ?
       ORDER BY m.joined_at DESC`
    )
    .all(userId);
  return rows.map((r) => ({
    cohortId: r.cohort_id,
    circleId: r.id,
    topic: r.topic,
    dayLabel: DAYS[r.day_of_week],
    hour: r.hour,
    nextSessionAt: nextOccurrence(r.day_of_week, r.hour),
  }));
}

function getMessages(cohortId, userId, limit = 100) {
  if (!cohortMembership(cohortId, userId)) throw httpErr(403, "Not a member of this cohort");
  const rows = db
    .prepare(
      `SELECT msg.id, msg.text, msg.created_at, msg.user_id, u.name AS author
       FROM messages msg JOIN users u ON u.id = msg.user_id
       WHERE msg.cohort_id = ?
       ORDER BY msg.id DESC LIMIT ?`
    )
    .all(cohortId, limit);
  return rows.reverse();
}

function saveMessage(cohortId, userId, text) {
  const info = db
    .prepare("INSERT INTO messages (cohort_id, user_id, text, created_at) VALUES (?, ?, ?, ?)")
    .run(cohortId, userId, text, Date.now());
  return db
    .prepare(
      `SELECT msg.id, msg.text, msg.created_at, msg.user_id, u.name AS author
       FROM messages msg JOIN users u ON u.id = msg.user_id WHERE msg.id = ?`
    )
    .get(info.lastInsertRowid);
}

function httpErr(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// --- Waitlist (email capture for not-yet-live features) ---
function joinWaitlist({ email, source }) {
  email = String(email || "").trim().toLowerCase();
  source = String(source || "").trim().slice(0, 40) || "general";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw httpErr(400, "Valid email required");
  // Idempotent: re-submitting the same email for the same source is a no-op success.
  db.prepare(
    `INSERT INTO waitlist (email, source, created_at) VALUES (?, ?, ?)
     ON CONFLICT(email, source) DO NOTHING`
  ).run(email, source, Date.now());
  return { ok: true };
}

function listWaitlist() {
  return db
    .prepare("SELECT id, email, source, created_at FROM waitlist ORDER BY created_at DESC")
    .all();
}

// --- Abuse reports (random text/video chat) ---
function saveReport({ mode, reporterIp, reportedIp }) {
  db.prepare(
    "INSERT INTO reports (mode, reporter_ip, reported_ip, created_at) VALUES (?, ?, ?, ?)"
  ).run(mode, reporterIp || null, reportedIp || null, Date.now());
}

function listReports(limit = 200) {
  return db
    .prepare("SELECT * FROM reports ORDER BY created_at DESC LIMIT ?")
    .all(limit);
}

module.exports = {
  signToken,
  verifyToken,
  publicUser,
  signup,
  login,
  getUserById,
  listCircles,
  joinCircle,
  cohortDetail,
  cohortMembership,
  listMyCohorts,
  getMessages,
  saveMessage,
  joinWaitlist,
  listWaitlist,
  saveReport,
  listReports,
};
