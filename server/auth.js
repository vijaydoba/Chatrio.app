// Shared JWT + passwordless email-code + Google sign-in for the legacy app.
// circles.js imports its JWT helpers from here so there's one implementation.
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const db = require("./db");

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const TOKEN_TTL = "30d";
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
// Accounts created via OTP/Google have no password; this sentinel keeps the
// existing NOT NULL pass_hash column without a risky migration.
const OAUTH_PASS_SENTINEL = "!oauth!";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function httpErr(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

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

function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

function getUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

function findOrCreateByEmail(email, name) {
  const existing = getUserByEmail(email);
  if (existing) return existing;
  const info = db
    .prepare("INSERT INTO users (email, name, pass_hash, created_at) VALUES (?, ?, ?, ?)")
    .run(email, (name || email.split("@")[0]).slice(0, 32), OAUTH_PASS_SENTINEL, Date.now());
  return getUserById(info.lastInsertRowid);
}

// --- Passwordless email code ---
function generateCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

async function requestCode({ email }) {
  email = String(email || "").trim().toLowerCase();
  if (!email || !isValidEmail(email)) throw httpErr(400, "Valid email required");

  const code = generateCode();
  const code_hash = bcrypt.hashSync(code, 10);
  db.prepare(
    `INSERT INTO verification_codes (email, code_hash, purpose, attempts, expires_at, created_at)
     VALUES (?, ?, 'login', 0, ?, ?)`
  ).run(email, code_hash, Date.now() + CODE_TTL_MS, Date.now());

  await sendVerificationEmail(email, code);
  return { ok: true };
}

function verifyCode({ email, code }) {
  email = String(email || "").trim().toLowerCase();
  code = String(code || "").trim();
  if (!email || !code) throw httpErr(400, "Email and code required");

  const row = db
    .prepare(
      `SELECT * FROM verification_codes WHERE email = ? AND purpose = 'login'
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(email);
  if (!row) throw httpErr(400, "No code requested for this email");
  if (row.expires_at < Date.now()) throw httpErr(400, "Code expired — request a new one");
  if (row.attempts >= MAX_CODE_ATTEMPTS) throw httpErr(429, "Too many attempts — request a new code");

  if (!bcrypt.compareSync(code, row.code_hash)) {
    db.prepare("UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?").run(row.id);
    throw httpErr(400, "Incorrect code");
  }

  db.prepare("DELETE FROM verification_codes WHERE id = ?").run(row.id);
  const user = findOrCreateByEmail(email);
  return { token: signToken(user), user: publicUser(user) };
}

// --- Google sign-in ---
async function googleSignIn({ idToken }) {
  if (!idToken) throw httpErr(400, "Missing Google credential");
  if (!process.env.GOOGLE_CLIENT_ID) throw httpErr(500, "Google sign-in is not configured");

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw httpErr(401, "Invalid Google credential");
  }
  if (!payload || !payload.email) throw httpErr(401, "Google account has no email");

  const email = payload.email.toLowerCase();
  let user = db.prepare("SELECT * FROM users WHERE google_id = ?").get(payload.sub);
  if (!user) {
    user = findOrCreateByEmail(email, payload.name);
    db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(payload.sub, user.id);
    user = getUserById(user.id);
  }
  return { token: signToken(user), user: publicUser(user) };
}

// --- Email delivery (Resend). Falls back to a console log in dev so the
// rest of the flow is testable before a real API key is supplied. ---
let resendClient = null;
async function sendVerificationEmail(email, code) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[auth] RESEND_API_KEY not set — verification code for ${email}: ${code}`);
    return;
  }
  if (!resendClient) {
    const { Resend } = require("resend");
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  // The resend SDK resolves with { error } on API-level failures (e.g. an
  // unverified domain) instead of throwing — surface that or it's silently
  // swallowed and the caller thinks the email sent.
  const { error } = await resendClient.emails.send({
    from: process.env.RESEND_FROM || "Chatrio <noreply@chatrio.app>",
    to: email,
    subject: `${code} is your Chatrio code`,
    text: `Your Chatrio verification code is ${code}. It expires in 10 minutes.`,
  });
  if (error) {
    console.error(`[auth] Resend failed for ${email}:`, error);
    throw httpErr(502, "Couldn't send the code — please try again shortly");
  }
}

module.exports = {
  JWT_SECRET,
  signToken,
  verifyToken,
  publicUser,
  getUserById,
  getUserByEmail,
  requestCode,
  verifyCode,
  googleSignIn,
};
