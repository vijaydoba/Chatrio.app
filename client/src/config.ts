// Shared API base. Prod default; override locally with REACT_APP_API_BASE.
export const API_BASE =
  process.env.REACT_APP_API_BASE || "https://api.chatrio.app";

// Random text/video chat socket server (server/index.js, :5050 in prod behind
// nginx at api.chatrio.app). Override locally with REACT_APP_SOCKET_URL
// (e.g. http://localhost:5050) to test server matching changes.
export const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL || "https://api.chatrio.app";

// Circles-local (proximity) service — hosted behind nginx at api.chatrio.app/circles-api.
// Override locally with REACT_APP_CIRCLES_API_BASE (e.g. http://localhost:5060).
export const CIRCLES_API_BASE =
  process.env.REACT_APP_CIRCLES_API_BASE || "https://api.chatrio.app/circles-api";

// Blind Date service — same isolated-service pattern as Circles, its own nginx path.
// Override locally with REACT_APP_BLIND_DATE_API_BASE (e.g. http://localhost:5070).
export const BLIND_DATE_API_BASE =
  process.env.REACT_APP_BLIND_DATE_API_BASE || "https://api.chatrio.app/blind-date-api";

// Blind Date reverted to coming-soon — still in beta (2026-07-29).
export const BLIND_DATE_LIVE = false;

// "Continue with Google" on /login and /signup — set REACT_APP_GOOGLE_CLIENT_ID
// once a Web-application OAuth Client ID exists in Google Cloud Console.
// Empty until then; the Google sign-in button hides itself when unset.
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
