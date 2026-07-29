// Verifies JWTs issued by the main chatrio server (server/circles.js signToken).
// Blind Date trusts the `uid` claim without querying the main server's user
// table directly — same shared-secret pattern, kept as its own isolated service.
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { verifyToken };
