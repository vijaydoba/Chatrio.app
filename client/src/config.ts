// Shared API base. Prod default; override locally with REACT_APP_API_BASE.
export const API_BASE =
  process.env.REACT_APP_API_BASE || "https://api.chatrio.app";

// Circles-local (proximity) service — hosted behind nginx at api.chatrio.app/circles-api.
// Override locally with REACT_APP_CIRCLES_API_BASE (e.g. http://localhost:5060).
export const CIRCLES_API_BASE =
  process.env.REACT_APP_CIRCLES_API_BASE || "https://api.chatrio.app/circles-api";
