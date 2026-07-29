// Profile creation/lookup for Blind Date onboarding (Phase 02).
const db = require("./db");

const GENDERS = ["male", "female", "other"];
const SEEKING_GENDERS = ["male", "female", "everyone"];
const INTENTS = ["friendship", "dating", "not_sure"];
const INTERESTS = [
  "movies", "music", "travel", "books", "fitness", "gaming", "food", "art",
  "outdoors", "tech", "sports", "cooking", "photography", "fashion", "spirituality",
];
const PERSONALITY_QUESTIONS = [
  { id: "recharge", a: "A quiet night in", b: "Out with people" },
  { id: "talk", a: "Deep and philosophical", b: "Light and playful" },
  { id: "plans", a: "Spontaneous", b: "Prefer a plan" },
  { id: "conflict", a: "Talk it out right away", b: "Need space first" },
  { id: "humor", a: "Sarcastic and dry", b: "Silly and goofy" },
  { id: "focus", a: "Career-focused", b: "Balance-focused" },
];
const QUESTION_IDS = new Set(PERSONALITY_QUESTIONS.map((q) => q.id));

function httpErr(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function rowToProfile(row) {
  if (!row) return null;
  const personality = db.prepare("SELECT answers FROM personality_answers WHERE profile_id = ?").get(row.id);
  return {
    id: row.id,
    displayName: row.display_name,
    age: row.age,
    gender: row.gender,
    seekingGender: row.seeking_gender,
    seekingMinAge: row.seeking_min_age,
    seekingMaxAge: row.seeking_max_age,
    intent: row.intent,
    interests: JSON.parse(row.interests),
    ageVerified: !!row.age_verified,
    personalityAnswers: personality ? JSON.parse(personality.answers) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getProfile(userId) {
  return rowToProfile(db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId));
}

function getProfileById(id) {
  return rowToProfile(db.prepare("SELECT * FROM profiles WHERE id = ?").get(id));
}

function validate(body) {
  const age = Number(body.age);
  const seekingMinAge = Number(body.seekingMinAge);
  const seekingMaxAge = Number(body.seekingMaxAge);
  const displayName = String(body.displayName || "").trim().slice(0, 24);

  if (!displayName) throw httpErr(400, "Enter a name to reveal later.");
  if (!Number.isInteger(age) || age < 18 || age > 120) throw httpErr(400, "You must be 18 or older to use Blind Date.");
  if (!body.ageVerified) throw httpErr(400, "Please confirm you're 18 or older.");
  if (!GENDERS.includes(body.gender)) throw httpErr(400, "Invalid gender.");
  if (!SEEKING_GENDERS.includes(body.seekingGender)) throw httpErr(400, "Invalid seeking preference.");
  if (!Number.isInteger(seekingMinAge) || !Number.isInteger(seekingMaxAge) || seekingMinAge < 18 || seekingMinAge > seekingMaxAge) {
    throw httpErr(400, "Invalid age range.");
  }
  if (!INTENTS.includes(body.intent)) throw httpErr(400, "Invalid intent.");

  const interests = Array.isArray(body.interests) ? body.interests : [];
  if (interests.length === 0 || interests.length > 5) throw httpErr(400, "Pick between 1 and 5 interests.");
  if (interests.some((i) => !INTERESTS.includes(i))) throw httpErr(400, "Invalid interest.");

  const answers = Array.isArray(body.personalityAnswers) ? body.personalityAnswers : [];
  if (answers.length !== PERSONALITY_QUESTIONS.length) throw httpErr(400, "Please answer every personality question.");
  for (const a of answers) {
    if (!QUESTION_IDS.has(a.id) || (a.choice !== "a" && a.choice !== "b")) throw httpErr(400, "Invalid personality answer.");
  }

  return { age, seekingMinAge, seekingMaxAge, interests, answers, displayName };
}

function upsertProfile(userId, body) {
  const { age, seekingMinAge, seekingMaxAge, interests, answers, displayName } = validate(body);
  const now = Date.now();

  const existing = db.prepare("SELECT id FROM profiles WHERE user_id = ?").get(userId);
  let profileId;
  if (existing) {
    db.prepare(
      `UPDATE profiles SET display_name = ?, age = ?, gender = ?, seeking_gender = ?, seeking_min_age = ?,
       seeking_max_age = ?, intent = ?, interests = ?, age_verified = 1, updated_at = ?
       WHERE id = ?`
    ).run(displayName, age, body.gender, body.seekingGender, seekingMinAge, seekingMaxAge, body.intent, JSON.stringify(interests), now, existing.id);
    profileId = existing.id;
  } else {
    const info = db.prepare(
      `INSERT INTO profiles (user_id, display_name, age, gender, seeking_gender, seeking_min_age, seeking_max_age,
       intent, interests, age_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    ).run(userId, displayName, age, body.gender, body.seekingGender, seekingMinAge, seekingMaxAge, body.intent, JSON.stringify(interests), now, now);
    profileId = info.lastInsertRowid;
  }

  db.prepare(
    `INSERT INTO personality_answers (profile_id, answers, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(profile_id) DO UPDATE SET answers = excluded.answers, updated_at = excluded.updated_at`
  ).run(profileId, JSON.stringify(answers), now);

  return getProfile(userId);
}

function isBanned(profileId) {
  return !!db.prepare("SELECT 1 FROM bans WHERE profile_id = ?").get(profileId);
}

module.exports = {
  GENDERS,
  SEEKING_GENDERS,
  INTENTS,
  INTERESTS,
  PERSONALITY_QUESTIONS,
  httpErr,
  getProfile,
  getProfileById,
  upsertProfile,
  isBanned,
};
