// Client for the isolated Blind Date service. Identity is a real chatrio
// account — same JWT as /login, /signup (see ../auth.tsx) — not an anon token.
import { BLIND_DATE_API_BASE } from "./config";

async function req(token: string, path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BLIND_DATE_API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data && data.error) || "Request failed");
  return data;
}

export type Gender = "male" | "female" | "other";
export type SeekingGender = "male" | "female" | "everyone";
export type Intent = "friendship" | "dating" | "not_sure";
export type PersonalityQuestion = { id: string; a: string; b: string };
export type PersonalityAnswer = { id: string; choice: "a" | "b" };

export type Meta = {
  genders: Gender[];
  seekingGenders: SeekingGender[];
  intents: Intent[];
  interests: string[];
  personalityQuestions: PersonalityQuestion[];
};

export type Profile = {
  id: number;
  displayName: string;
  age: number;
  gender: Gender;
  seekingGender: SeekingGender;
  seekingMinAge: number;
  seekingMaxAge: number;
  intent: Intent;
  interests: string[];
  ageVerified: boolean;
  personalityAnswers: PersonalityAnswer[];
  createdAt: number;
  updatedAt: number;
};

export type ProfileInput = {
  displayName: string;
  age: number;
  gender: Gender;
  seekingGender: SeekingGender;
  seekingMinAge: number;
  seekingMaxAge: number;
  intent: Intent;
  interests: string[];
  ageVerified: boolean;
  personalityAnswers: PersonalityAnswer[];
};

export type QueueResult = { status: "waiting" | "matched" | "idle"; match?: { id: number } };

export type Message = { id: number; from_profile: number; text: string; created_at: number };

export type MatchState = {
  matchId: number;
  status: "active" | "ended";
  createdAt: number;
  myRevealed: boolean;
  otherRevealed: boolean;
  revealed: boolean;
  revealedAt: number | null;
  fallbackAt: number;
  otherDisplayName: string | null;
  otherProfileId: number;
  messages?: Message[];
};

export async function blindDateMeta(): Promise<Meta> {
  const res = await fetch(`${BLIND_DATE_API_BASE}/meta`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data && data.error) || "Request failed");
  return data;
}

export const blindDate = {
  getProfile: (token: string): Promise<Profile | null> => req(token, "/profile"),
  saveProfile: (token: string, body: ProfileInput): Promise<Profile> =>
    req(token, "/profile", { method: "POST", body: JSON.stringify(body) }),
  joinQueue: (token: string): Promise<QueueResult> => req(token, "/queue/join", { method: "POST" }),
  queueStatus: (token: string): Promise<QueueResult> => req(token, "/queue/status"),
  leaveQueue: (token: string): Promise<{ ok: true }> => req(token, "/queue/leave", { method: "POST" }),
  currentMatch: (token: string): Promise<MatchState | null> => req(token, "/match/current"),
};
