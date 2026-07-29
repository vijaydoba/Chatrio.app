# Blind Date

Profile-matched 1:1 chat: two strangers fill a short profile, get paired by
compatibility instead of luck, and talk with names/photos hidden until they
both choose to reveal. Text first; video unlocks after the reveal.

This folder is the standalone workspace for building the feature, kept
separate from `client/` and `server/` until it's ready to wire in.

## Status

**Live as of 2026-07-27.** `BLIND_DATE_LIVE = true`; `/blind-date` renders
the real landing page (`BlindDateLive`) linking to `/blind-date/chat`, and
the nginx `location ^~ /blind-date/ { return 302 /; }` block on the
`chatrio` frontend site has been removed — `/blind-date/chat` and
`/blind-date/onboarding` now serve the SPA instead of redirecting home.
Verified live: all three routes return 200, the landing page links to
`/blind-date/chat` (not the old waitlist form), and all four pm2 services
(`chatrio-api`, `chatrio-auth-api`, `chatrio-blind-date-api`,
`chatrio-circles-api`) are online post-deploy.

**Correction (2026-07-27, found while deploying Phase 07):** the Phase 06
verification above checked that `/blind-date/chat` returns a 200 shell, but
never made an actual API call through the public domain. It turned out
`/etc/nginx/sites-available/chatrio-api`'s `location /blind-date-api/`
block had been hardcoded to `return 404;` since the 2026-07-26 rollback,
and Phase 06 only touched the frontend site's redirect block — the API
gate was never re-checked. **The entire matching/chat backend was
unreachable from the public site for about a day**, not just video. Fixed
by replacing the 404 with a `proxy_pass http://localhost:5070/;` block
matching the `/circles-api/` pattern (backed up first, `nginx -t` passed,
reloaded). Verified: `https://api.chatrio.app/blind-date-api/meta` now
returns 200 with real data. Lesson: verifying a route returns 200 only
proves the SPA shell loads — always also hit a real backend endpoint
through the public domain before calling a deploy "verified."

| Phase | State |
|---|---|
| 00 — Decisions & data model | ✅ Done |
| 01 — Waitlist gate | ✅ Done |
| 02 — Profile & preferences | ✅ Done |
| 03 — Matching engine | ✅ Done |
| 04 — Blind chat room (text + reveal) | ✅ Done (voice messages not yet built — see note below) |
| — Real-account login (added after Phase 04) | ✅ Done |
| 05 — Safety & moderation | ✅ Done |
| 06 — Go-live flip | ✅ Done (2026-07-27) |
| 07 — Video escalation | 🔶 Signaling built + tested locally (2026-07-27), not yet deployed |
| 08–10 | Not started |

### Go-live blocker — RESOLVED 2026-07-26

Production auth is now live: `chatrio-auth-api` (repo's `server/index.js` +
`circles.js` + `db.js`, unmodified) runs as its own pm2 process on
`localhost:5065` at `/var/www/chatrio-auth-api/` on the VPS
(`185.190.142.158`), with a fresh SQLite DB and a real generated
`JWT_SECRET` (not the dev fallback). nginx routes
`https://api.chatrio.app/auth/*` to it via a new `location /auth/` block
in `/etc/nginx/sites-available/chatrio-api` (same pattern as
`/circles-api/`). Verified live: signup → login → `/auth/me` all work
through the public domain; existing `chatrio-api` and `chatrio-circles-api`
unaffected.

**`server/blind-date` itself deployed 2026-07-26.** Its own pm2 process
`chatrio-blind-date-api` runs on `localhost:5070` at
`/var/www/chatrio-blind-date/`, with a fresh SQLite DB and `JWT_SECRET`
copied verbatim from `chatrio-auth-api`'s `.env`. nginx
`location /blind-date-api/` block added to the same
`api.chatrio.app` server block. Verified live end-to-end through the
public domain: signup → create profile → check queue status all work,
proving the cross-service JWT trust boundary holds in production. Other
services (`chatrio-api`, `chatrio-circles-api`) unaffected.

**Frontend was briefly flipped and deployed 2026-07-26, then taken back
offline the same day, then re-exposed as a coming-soon page later that
day.** Current end state: `BLIND_DATE_LIVE = false` in
`client/src/config.ts`, `/blind-date` itself is public (renders
`BlindDateWaitlist`, prerendered in `reactSnap.include` and
`scripts/generate-sitemap.js` for real SEO content), but nginx's
`location ^~ /blind-date/ { return 302 /; }` block on the `chatrio`
(frontend) site still redirects every deeper path — `/blind-date/chat`,
`/blind-date/onboarding` — to the homepage. Verified live: `/blind-date`
returns 200 with "Coming soon" content and a working `POST /waitlist`
form; `/blind-date/chat` and `/blind-date/onboarding` still 302. To
actually launch the full feature later: flip `BLIND_DATE_LIVE` to `true`,
remove that one remaining nginx `location` block, rebuild, redeploy.

**Waitlist export/email turned out to be moot:** checked the prod
waitlist (`GET /waitlist` on the random-chat server, `ADMIN_TOKEN` auth)
— only 2 rows total, both old `source: "circles"` test entries, zero
`source: "blind-date"` signups. Nothing to export, no one to email. The
"same pipeline used for Circles" this README previously referenced
doesn't actually exist either — Circles' own cohort feature (the
`server/circles.js` one, not circles-local) never went live, so no
"we're live" email was ever built or sent for it. If Blind Date ever
needs one, it'd have to be built from scratch (no nodemailer/SendGrid/
SMTP infra exists anywhere in this repo today).

### Original blocker (for context, resolved above)

Went to flip `BLIND_DATE_LIVE` and deploy `server/blind-date` to the VPS,
and found **production has no auth backend at all**. Checked live:
`POST https://api.chatrio.app/login` → `404 Cannot POST /login`. The VPS
(`185.190.142.158`) runs `chatrio-api` (port 5050, the random-chat socket
server — no DB, no JWT, no accounts) and `chatrio-circles-api` (port 5060,
anonymous device-token identity, no accounts either). The repo's own
`server/` (JWT + bcrypt + SQLite `circles.js`) that `Auth.tsx`/`/login`/
`/signup` are built against has **never been deployed** — this repo's
`server/` is legacy/never-deployed per [[backend-architecture]] memory.

This blocks more than Blind Date: the client already ships `/login` and
`/signup` routes, so anyone hitting them in production gets a 404 today,
regardless of Blind Date. Blind Date's identity model (real chatrio
account + JWT, decided after Phase 04 — see below) is entirely dependent
on this not-yet-deployed piece.

**Also built and ready, independent of the blocker:** a real `/blind-date`
landing page (`client/src/pages/BlindDate.tsx`'s `BlindDateLive`) replacing
the old "hasn't been built yet" placeholder stub — CTA links to
`/blind-date/chat`, which already handles every account state itself.

**Next session:** stand up production auth before resuming Phase 06.
Decided approach — deploy the repo's existing `server/` (index.js +
circles.js + db.js) unmodified as its own pm2 service, rather than write a
new auth service from scratch, since it's already tested and `db.js`
self-creates its schema. Plan (not yet executed):

1. New VPS dir `/var/www/chatrio-auth-api/` — never touch
   `/var/www/chatrio-server/` (the live random-chat process).
2. rsync `server/` there, excluding `node_modules` and the local
   `chatrio.db*` files (prod starts with a fresh DB).
3. `npm install --production` on the VPS.
4. Prod `.env`: an unused port (e.g. `5065`),
   `FRONTEND_ORIGIN=https://chatrio.app`, and a real generated
   `JWT_SECRET` — locally both `server/.env` and `server/blind-date` have
   no `JWT_SECRET` set, so they silently share the same hardcoded
   `"dev-insecure-secret-change-me"` fallback; that won't fly in prod.
5. `pm2 start index.js --name chatrio-auth-api` + `pm2 save`.
6. nginx: add `location /auth/ { proxy_pass http://localhost:5065/auth/;
   }` to the existing `api.chatrio.app` server block (same block that
   already proxies `chatrio-api`) — only `/auth/` is required to unblock
   Blind Date, since the client only calls `/auth/signup`, `/auth/login`,
   `/auth/me`.
7. **Easy to forget:** set `server/blind-date`'s prod `JWT_SECRET` to the
   *exact same value* as step 4 — Blind Date verifies tokens locally via
   shared secret (`server/blind-date/auth.js`), it never calls back to
   the auth service.
8. Smoke-test `POST https://api.chatrio.app/auth/signup` →
   `/auth/login` → feed the token into blind-date's endpoints before
   touching `BLIND_DATE_LIVE`.

Then resume Blind Date's own Phase 06 deploy: new pm2 process + nginx
`location /blind-date-api/ { proxy_pass http://localhost:5070/; }` block
for `server/blind-date` itself, matching the `/circles-api/` pattern in
`/etc/nginx/sites-available/chatrio-api`.

## Positioning

| | Random Chat | Circles | **Blind Date** |
|---|---|---|---|
| Job | Meet now | Meet nearby | Meet on purpose |
| Backend | External `chatrio-server` (not this repo) | `server/circles-local` | `server/blind-date` (built) |
| Input | None — instant queue | Location + opt-in requests | Short profile + preferences |
| Identity | Fully anonymous | Persistent local presence | Real chatrio account, concealed until mutual reveal |

## Architecture call

This repo's `server/index.js` has a full random-pairing engine (waiting
queue, `tryMatch()` scorer, `partner_found`/`next` socket events) but it's
legacy — the live random chat actually runs on the separate `chatrio-server`
host, outside this repo. Circles, by contrast, was built self-contained in
`server/circles-local` with its own SQLite database (`better-sqlite3`) and
shipped straight to production from here.

**Recommendation:** build Blind Date the same way Circles was built — an
independent `server/blind-date` service with its own SQLite store. Stays
testable and deployable on its own, and never risks the live random-chat
backend this repo doesn't control.

## Identity: real account, not anonymous (decided after Phase 04)

Originally built like Circles-local — an anonymous device token in
`localStorage`. Changed to require a **real chatrio account** (the same
`/login`/`/signup` + JWT system `Auth.tsx` already uses elsewhere) instead,
for two reasons specific to a dating-adjacent feature:

- **Ban evasion.** An anonymous token can be wiped by clearing the browser;
  a ban tied to a real account can't be.
- **Continuity.** Matches and profile survive a cleared browser or a
  switched device, which matters more here than for a one-off random chat.

Mechanically: `server/blind-date` verifies the main server's JWT
(`server/circles.js`'s `signToken`, shared `JWT_SECRET`) itself rather than
querying the main server's user table — `profiles.user_id` just stores the
trusted `uid` claim. Keeps Blind Date deployable as its own isolated
service, same as before, just with a shared trust boundary instead of a
shared database.

## Build sequence

### 00 — Decisions & data model (2–3 days, start here) ✅ Done
Lock the calls everything else depends on:
- **Matching fields:** age range, gender/preference, 3–5 interest tags, one
  "what are you looking for" intent field, plus a short **personality
  questionnaire** (5–8 forced-choice questions — conversation style,
  introvert/extrovert, values) to score compatibility on more than shared
  tags. Still one sitting, no more than a couple of screens.
- **Reveal trigger:** mutual tap from both sides + 10-minute fallback timer.
- **Safety policy:** 18+ self-attestation at profile creation, auto-suspend
  after N reports, no fake/bot matches (see Phase 03).
- **Schema:** `profiles`, `preferences`, `personality_answers`, `matches`,
  `reveals`, `reports`, `blocks` — same SQLite approach as Circles.

### 01 — Waitlist gate (2–3 days, ships first) ✅ Done
Front door before the engine exists, collecting emails while the rest gets
built — same pattern as Circles' `CIRCLES_LIVE` launch.
- New route `/blind-date` in `App.tsx`, lazy page `client/src/pages/BlindDate.tsx`
- Email-capture waitlist screen, same idiom as `ChatComingSoon.tsx`
- Behind a `BLIND_DATE_LIVE` flag, off by default
- Reuse the existing waitlist export + `ADMIN_TOKEN` pipeline from Circles

### 02 — Profile & preferences (~1 week) ✅ Done
Short, mobile-first onboarding, 3–4 screens max. No public browsing —
profiles only feed the matcher, which keeps this from becoming a swipe feed
and avoids the moderation surface a browsable directory would add. Includes
the personality questionnaire from Phase 00.
- Built: `server/blind-date/db.js`, `server/blind-date/profiles.js`,
  `client/src/pages/BlindDateOnboarding.tsx`

### 03 — Matching engine (1–1.5 weeks) ✅ Done
Adapted the queue/score shape from `server/index.js`'s
`tryMatch()`/`canMatch()` in `server/blind-date/matching.js`, scoring on
profile compatibility (shared interests, intent match, age-range overlap,
**personality-answer similarity**) instead of topic tags alone. Verified via
curl: compatible profiles match immediately, incompatible ones (age range
outside each other's window) correctly stay unmatched.

> **Deliberately not reused:** that file's `scheduleBotMatch`/`connectBot`
> pairs a lonely user with a fake persona after a timeout. Fine for a casual
> queue, wrong for a product framed around a real date with a real person.
> Left out entirely — if no one's queued, the caller just stays "waiting."

### 04 — Blind chat room (~1 week) ✅ Done (text only)
Private 1:1 socket.io room, text-only. Built in `server/blind-date/chat.js`
+ `index.js` (socket events), `client/src/pages/BlindDateChat.tsx`.
- Name shown blurred until reveal (**photos deferred** — no image
  upload/storage/moderation infra decided yet; reveal currently unblurs a
  display name only)
- **Reveal** button each side; unblurs once both tap, or the 10-minute
  fallback fires (fallback computed from match time, no background timer
  needed)
- Countdown indicator, "next date" / end-date controls
- Verified live: two independent clients (a real browser tab + a scripted
  socket client, since two same-origin browser tabs share `localStorage`
  and can't represent two identities) — messages deliver instantly both
  directions, reveal requires both sides, ending a date returns both to idle

**Voice messages are not yet built** — still just an idea folded in from
the BlindMatch AI concept, not part of what shipped. Worth doing as a
follow-up within this phase before moving on, or deferring to keep pace.

### — Real-account login (added after Phase 04) ✅ Done
Originally anonymous (device token, like Circles-local). Changed to require
a real chatrio account instead — see the "Identity" section above for why.
Verified: invalid/missing tokens get 401, the full profile→match flow is
unaffected, and — the actual point — a ban tied to an account correctly
prevents rematching even after the banned account's browser storage is
cleared and it rejoins the queue fresh.

### 05 — Safety & moderation (3–5 days, do not skip) ✅ Done
Strangers meeting 1:1 around dating framing raises the stakes above either
existing feature. Don't flip `BLIND_DATE_LIVE` without this done.
- Block/report/ban adapted directly from `server/circles-local/store.js`,
  built in `server/blind-date/safety.js`. Reporting also blocks (same as
  Circles) and immediately ends the active date via a new `report_match`
  socket event — the only place two profiles interact, since Blind Date has
  no public browsing to report someone from outside a match.
- Age gate enforced at profile creation, not a buried checkbox — already
  true since Phase 02 (`BlindDateOnboarding.tsx` step 3, `profiles.js`
  `validate()` rejects `age < 18` or a missing `ageVerified` server-side).
- Rate-limit reporting to prevent report-abuse as a griefing vector — 5
  reports / hour per profile, enforced in `index.js`'s `report_match`
  handler with the same in-memory sliding-window limiter used for messages.
- Admin review queue behind `BLIND_DATE_ADMIN_TOKEN` (`X-Admin-Token`
  header), matching the Circles admin pattern: `GET /admin/reports`,
  `GET /admin/bans`, `POST /admin/ban`, `POST /admin/unban`.
- Bans are enforced everywhere, not just at matching: the REST `auth`
  middleware and the socket `io.use` handshake both reject a banned
  profile (403 / `connect_error`), on top of `matching.js`'s existing
  `hardFilterOk` exclusion.
- Verified via a scripted HTTP + socket.io test (throwaway SQLite db):
  report-and-block ends the date for both sides and shows up in
  `/admin/reports` with reporter/reported names; a 6th report within an
  hour is rejected; a banned profile is locked out of both REST and
  sockets immediately and restored on unban; manual `/block`, `/unblock`,
  `/blocked` all behave correctly. 16/16 checks passed.

### 06 — Go-live flip ✅ Done (2026-07-27)
`BLIND_DATE_LIVE` flipped to `true` in `client/src/config.ts`; the nginx
`location ^~ /blind-date/ { return 302 /; }` block removed from
`/etc/nginx/sites-available/chatrio` on the VPS (backed up first, `nginx -t`
passed, reloaded); client rebuilt (`react-scripts build` +
`prerender-all-stable.js`, no empty shells) and rsynced to
`/var/www/chatrio/`. Verified live: `/blind-date`, `/blind-date/chat`,
`/blind-date/onboarding` all return 200, the landing page CTA links to
`/blind-date/chat`, and the new JS bundle is served.

### 07 — Video escalation 🔶 Signaling built + tested (2026-07-27), not deployed
WebRTC peer connection signaled over the same socket.io room already used
for text (8 new relay-only events: `video_invite`/`accept`/`decline`/
`cancel`/`offer`/`answer`/`ice_candidate`/`end`, added to
`server/blind-date/index.js`, no new DB tables). Client controller in
`client/src/blindDateWebRTC.ts`, wired into `BlindDateChat.tsx` as a
`videoState` sub-state of the existing chatting phase — chat stays visible
during a call. STUN-only (Google's public servers, no TURN) for this first
cut, matching the project's ship-lean pattern; some calls will fail to
connect for users behind restrictive NATs, who still have working text
chat as a fallback. Invite/accept flow: either side taps "Start video,"
the other must explicitly accept before their camera/mic ever activates —
mirrors the mutual-consent pattern already used for reveal. Fixed
offer/answer role (lower profile id always offers) avoids needing full
perfect-negotiation for a 1:1, single-session feature. Gated behind
`match.revealed` both client-side (button doesn't render) and
server-side (handler independently checks reveal state).

**Verified:** a scripted two-account socket test against the real local
backend exercised the full 8-event relay, the reveal-gating guard, the
per-invite rate limiter (6/min), and the cross-match membership guard —
17/17 checks passed. A live browser smoke test (real tab + scripted
second client) confirmed the "Start video" button appears only after
reveal, the incoming-call modal renders and relays correctly, and
cancelling a pending call mid-flight tears down cleanly. That test also
caught and fixed a real race: if a call is cancelled while the browser's
camera/mic permission prompt is still pending, `beginCall` now checks
whether its state is still valid before proceeding, instead of resurrecting
an already-cancelled call once the prompt resolves.

**Not yet done:** actual camera/mic media flowing between two real
browsers — browser automation can't click the native OS permission
prompt, so end-to-end video/audio rendering is unverified beyond code
review. Nothing here is deployed to the VPS; `server/blind-date/index.js`
and the client changes are local-only. Next session: deploy the updated
`chatrio-blind-date-api`, rebuild + redeploy the client, then verify with
two real logged-in browsers (or two devices) that video/audio actually
connect.

> Gate video behind the reveal, not before it — no face until both people
> have chosen to see one. Keeps the "blind" premise real instead of
> decorative. (Enforced both client- and server-side — see above.)

### 08 — SEO & growth layer 🔶 First batch shipped (2026-07-27), ongoing
- Landing page for `/blind-date` through the existing blog pipeline and
  `scripts/prerender-all-stable.js` — done as part of Phase 06.
- IndexNow ping on deploy — already wired into the deploy flow
  (`scripts/notify-google.js`). Bing/IndexNow still 403s (persistent
  cooldown carried over from earlier sessions), Yandex 202 OK, Google
  crawls the sitemap directly regardless.
- **3 hand-written posts added 2026-07-27**, gap-checked via Semrush first
  (`what-is-a-blind-date-app-how-it-works-2026` targeting "blind date app"
  390/mo KD43, `anonymous-dating-apps-guide-2026` targeting "anonymous
  dating app" 1,600/mo KD46, `virtual-dating-tips-video-dates-2026`
  targeting "virtual dating"/"video dating" ~400/mo KD22-35) — all zero
  prior coverage. Cross-linked to each other and back into 3 existing
  posts (`random-chat-vs-dating-apps-which-is-better`,
  `gen-z-quitting-dating-apps-2026`, `is-video-chat-with-strangers-safe-2026`),
  and each links to `/blind-date`. Cited real sources (Forbes Health/OnePoll
  2024 dating-app-burnout survey, Match/Kinsey Institute Singles in America
  video-dating survey, Etymonline for the term's 1920s origin) rather than
  inventing stats. Verified live, real content (~1750 words each).

  **Prerender gotcha hit this session:** the 3 new routes reproducibly
  failed `prerender-all-stable.js`'s "rendered output is incomplete" check
  when run as part of the full ~194-route batch, 3 times in a row,
  regardless of a doubled timeout — but rendered perfectly every time in
  an isolated single-route reproduction using the identical server/render
  logic. Root cause not fully identified (looks like some form of
  resource contention specific to long-batch runs, not a content bug —
  the isolated repro proves the HTML itself is fine). Workaround: after
  the full-batch run crashes (it writes each successful route to disk
  immediately, so nothing already-rendered is lost), run a small
  standalone script reusing the same `render()` logic against just the
  missing routes, write those files directly into `client/build/`, then
  manually write `client/build/200.html` as a copy of `index.html` (the
  step the crashed run never reached). Finish with a full
  `grep -rl '<div id="root"></div>' client/build` to confirm zero empty
  shells across the whole build before deploying.

### 09 — Deploy & ops (~1 day)
Ship alongside existing services on the same VPS: new pm2 process (e.g.
`blind-date-api`), new nginx location block. SQLite is proven fine at
Circles' current traffic; revisit only if concurrent match volume grows
enough to need it.

### 10 — Monetization & growth extras (post-traction, not scoped)
Extra reveals, priority queue placement, advanced preference filters,
**travel mode** (match in a different city before visiting). Revisit once
the free version has real usage — not part of the MVP.

An **AI conversation-starter / icebreaker prompt** is worth adding here too
once there's real chat volume to tune it on — low-cost to build (a prompt
into the existing chat UI, no new infra) and it directly attacks the
"shallow conversation" problem blind-date apps run into once the novelty of
anonymity wears off.

## Open decisions — locked and built as of Phase 04

Went with the recommended option on each; all four are now reflected in
the actual shipped code, not just planned.

1. **Reveal trigger** — ✅ mutual tap + 10-minute fallback timer. Built in
   `chat.js`'s `revealState()`/`tapReveal()`.
2. **Age verification strength** — ✅ self-attested 18+ checkbox at profile
   creation, matching current site norms. Enforced in `profiles.js`.
3. **Bot-fallback exclusion** — ✅ excluded entirely. No fake bot matches;
   `matching.js` just leaves a profile "waiting" if no one compatible is queued.
4. **Feature name** — ✅ committed: route `/blind-date`, flag
   `BLIND_DATE_LIVE`, folder `server/blind-date`.

## Rough timeline

Solo, part-time pace, same cadence as the Circles build.

| Week | Phase |
|---|---|
| 1 | 00–01 — decisions, waitlist live |
| 2–3 | 02–03 — profile, matching engine |
| 4 | 04 — chat room + reveal |
| 4–5 | 05–06 — safety, go live |
| 6–7 | 07 — video escalation |
| ongoing | 08–09 — SEO, ops |

MVP (Phase 00 through go-live) ≈ 4–5 weeks part-time. Video adds ~1.5–2
weeks on top. Phases 00–06 plus the login change are done — the feature is
live. Phase 07 (video) is next up whenever that's prioritized.

## Ideas considered from the BlindMatch AI concept (`READMEchatgpt.md`)

That doc pitches a full standalone dating startup (Flutter app, NestJS
backend, PostgreSQL, paid ad budgets). Adopted the product ideas that fit
into the existing web feature without a rewrite — personality
questionnaire, voice messages, AI icebreaker prompts, travel mode — folded
into the phases above.

**Deliberately not adopted:** rebuilding on Flutter/NestJS/PostgreSQL
(throws away the working React/Node/SQLite stack and the Circles-proven
pattern for no real gain at this stage), video calls in the MVP (already
correctly sequenced as Phase 07, after text validates), and paid
acquisition / ambassador programs (premature before the free version has
any usage).
