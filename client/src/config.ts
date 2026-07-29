// Shared API base. Prod default; override locally with REACT_APP_API_BASE.
export const API_BASE =
  process.env.REACT_APP_API_BASE || "https://api.chatrio.app";

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
