// Client for the isolated Circles-local (proximity) service.
import { io, Socket } from "socket.io-client";
import { CIRCLES_API_BASE } from "./config";

const TOKEN_KEY = "circles_anon_token";

// Anonymous, persistent identity — a random token kept in localStorage.
export function getToken(): string {
  const existing = localStorage.getItem(TOKEN_KEY);
  if (existing) return existing;
  const c: any = window.crypto;
  const fresh: string =
    c && c.randomUUID ? c.randomUUID().replace(/-/g, "") : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(TOKEN_KEY, fresh);
  return fresh;
}

async function req(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${CIRCLES_API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", "X-Anon-Token": getToken(), ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data && data.error) || "Request failed");
  return data;
}

export type Gender = "male" | "female" | "trans" | "other" | "";
export type Me = { id: number; nickname: string; ageOk: boolean; avatar?: number; gender?: Gender };
export type NearbyUser = { id: number; nickname: string; distance: string; lastSeen?: number; avatar?: number; gender?: Gender; sessionMin?: number };
export type Incoming = { id: number; opener: string; created_at: number; from_id: number; from_nick: string; from_avatar?: number; from_gender?: Gender };
export type Thread = { otherId: number; nickname: string; lastText: string; lastAt: number; avatar?: number; gender?: Gender };
export type DmMsg = { id: number; from_user: number; text: string; created_at: number; read_at?: number | null };
export type Group = { id: number; name: string; topic: string; members: number; isMember: boolean; distance?: string; activeNow?: number };
export type BlockedUser = { id: number; nickname: string; created_at: number; avatar?: number; gender?: Gender };
export type MyGroup = Group & { lastText: string; lastAt: number };
export type GroupMsg = { id: number; group_id: number; from_user: number; from_nick: string; text: string; created_at: number };

export const circles = {
  getMe: (): Promise<Me> => req("/me"),
  setMe: (body: { nickname?: string; ageOk?: boolean; avatar?: number; gender?: Gender }): Promise<Me> =>
    req("/me", { method: "POST", body: JSON.stringify(body) }),
  setLocation: (lat: number, lng: number) =>
    req("/location", { method: "POST", body: JSON.stringify({ lat, lng }) }),
  nearby: (radius = 10000): Promise<NearbyUser[]> => req(`/nearby?radius=${radius}`),
  sendRequest: (toUserId: number, text: string) =>
    req("/dm/request", { method: "POST", body: JSON.stringify({ toUserId, text }) }),
  incoming: (): Promise<Incoming[]> => req("/dm/incoming"),
  respond: (requestId: number, action: "accept" | "decline") =>
    req("/dm/respond", { method: "POST", body: JSON.stringify({ requestId, action }) }),
  threads: (): Promise<Thread[]> => req("/dm/threads"),
  messagesWith: (otherId: number): Promise<DmMsg[]> => req(`/dm/with/${otherId}`),
  block: (userId: number) => req("/block", { method: "POST", body: JSON.stringify({ userId }) }),
  unblock: (userId: number) => req("/unblock", { method: "POST", body: JSON.stringify({ userId }) }),
  blocked: (): Promise<BlockedUser[]> => req("/blocked"),
  report: (userId: number, reason: string) =>
    req("/report", { method: "POST", body: JSON.stringify({ userId, reason }) }),
  // groups (local rooms)
  createGroup: (name: string, topic: string): Promise<{ id: number }> =>
    req("/groups", { method: "POST", body: JSON.stringify({ name, topic }) }),
  nearbyGroups: (radius = 10000): Promise<Group[]> => req(`/groups/nearby?radius=${radius}`),
  myGroups: (): Promise<MyGroup[]> => req("/groups/mine"),
  joinGroup: (id: number) => req(`/groups/${id}/join`, { method: "POST" }),
  leaveGroup: (id: number) => req(`/groups/${id}/leave`, { method: "POST" }),
  groupMessages: (id: number): Promise<GroupMsg[]> => req(`/groups/${id}/messages`),
};

// ── admin / moderation (Phase 3) ──
export type Report = {
  id: number; reason: string; created_at: number;
  reporter_id: number; reporter_nick: string | null;
  reported_id: number; reported_nick: string | null;
  reported_count: number; reported_banned: number;
};
export type Ban = { user_id: number; nickname: string | null; reason: string; created_at: number };

async function adminReq(token: string, path: string, opts: RequestInit = {}) {
  const res = await fetch(`${CIRCLES_API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", "X-Admin-Token": token, ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data && data.error) || "Request failed");
  return data;
}

export const circlesAdmin = {
  reports: (token: string): Promise<Report[]> => adminReq(token, "/admin/reports"),
  bans: (token: string): Promise<Ban[]> => adminReq(token, "/admin/bans"),
  ban: (token: string, userId: number, reason: string) =>
    adminReq(token, "/admin/ban", { method: "POST", body: JSON.stringify({ userId, reason }) }),
  unban: (token: string, userId: number) =>
    adminReq(token, "/admin/unban", { method: "POST", body: JSON.stringify({ userId }) }),
};

export function connectCirclesSocket(): Socket {
  // The service may live under a sub-path (e.g. .../circles-api). socket.io needs the
  // origin separately, with the sub-path folded into its `path`.
  const u = new URL(CIRCLES_API_BASE);
  const prefix = u.pathname.replace(/\/$/, "");
  return io(u.origin, {
    path: `${prefix}/socket.io`,
    transports: ["websocket"],
    auth: { token: getToken() },
  });
}
