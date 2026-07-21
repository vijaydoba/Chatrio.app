# Circles — Local (Proximity) Chat

Anonymous, location-based chat for Chatrio: find people **near you**, send a
one-shot intro DM, and chat live. Runs as a **fully isolated service** so the
core random-chat server is never at risk.

> **Brand note:** unlike random chat (no account, ephemeral), Circles uses a
> persistent **anonymous** identity (a device token — no name, email, or
> password) so DMs and blocks survive across sessions.

---

## 1. Architecture

| Concern | Decision |
|---|---|
| **Service** | Standalone Node service (`server/circles-local/`), its own SQLite DB + pm2 process. The live `chatrio-api` (random chat) is untouched. |
| **Identity** | Anonymous device token (UUID in `localStorage`), sent as the `X-Anon-Token` header / socket `auth.token`. No PII. |
| **Location** | Browser geolocation → **fuzzed** to a coarse grid (~2 km) on arrival. Exact coordinates are **never** stored or returned. Distance is shown as buckets ("very close", "~3 km away") — never a precise number or a map. |
| **Hosting (prod)** | Behind nginx at `https://api.chatrio.app/circles-api/*` → `127.0.0.1:5060` (reuses the existing TLS cert). |

### Safety model (deliberate)
- **18+ age gate** — required before location / nearby / DM actions.
- **One-shot DM** — you send a single intro message; the recipient **accepts**
  (opens the chat) or **declines** (you're told "not interested" and **can't
  re-message** — decline auto-creates a block).
- **Report & block** everywhere (reporting also blocks).
- **Rate limits** on nearby refresh, intro requests, and messages.
- **Fuzzed location only**, no exact position, no live tracking.

---

## 2. Data model (SQLite)

| Table | Purpose |
|---|---|
| `users` | `token`, `nickname`, `age_ok`, `last_seen` |
| `user_location` | fuzzed `lat`/`lng`, `is_visible`, `updated_at` |
| `dm_requests` | `from_user`, `to_user`, `opener`, `status` (pending/accepted/declined) · **UNIQUE(from,to)** |
| `dm_messages` | `a_user` (min id), `b_user` (max id), `from_user`, `text` |
| `blocks` | `blocker`, `blocked` (decline/report insert here) |
| `reports` | `reporter`, `reported`, `reason` |
| `groups` | `name`, `topic`, `creator`, fuzzed `lat`/`lng`, `last_active` (Phase 2 local rooms) |
| `group_members` | `group_id`, `user_id` · **PK(group_id,user_id)** |
| `group_messages` | `group_id`, `from_user`, `text` |

---

## 3. API reference

All REST calls require the `X-Anon-Token: <uuid>` header. Base URL is
`CIRCLES_API_BASE` (`http://localhost:5060` in dev, `https://api.chatrio.app/circles-api` in prod).

### REST
| Method & path | Body | Notes |
|---|---|---|
| `GET /health` | — | liveness |
| `GET /me` | — | get/create the anon profile |
| `POST /me` | `{ nickname?, ageOk? }` | set nickname / confirm 18+ |
| `POST /location` | `{ lat, lng }` | fuzzes + stores; requires `ageOk` |
| `POST /location/visibility` | `{ visible }` | go invisible / visible |
| `GET /nearby?radius=` | — | nearby users + bucketed distance |
| `POST /dm/request` | `{ toUserId, text }` | one-shot intro (15/hr) |
| `GET /dm/incoming` | — | pending intro requests to me |
| `GET /dm/sent` | — | my requests + status (see declines) |
| `POST /dm/respond` | `{ requestId, action }` | `accept` \| `decline` |
| `GET /dm/threads` | — | accepted conversations |
| `GET /dm/with/:otherId` | — | message history |
| `POST /block` | `{ userId }` | block |
| `POST /report` | `{ userId, reason }` | report (also blocks) |
| `POST /groups` | `{ name, topic? }` | create a local room at your fuzzed area (5/hr); creator auto-joins |
| `GET /groups/nearby?radius=` | — | nearby rooms + member count + bucketed distance |
| `GET /groups/mine` | — | rooms I'm in + last message |
| `POST /groups/:id/join` | — | join a room |
| `POST /groups/:id/leave` | — | leave (room is deleted when it empties) |
| `GET /groups/:id/messages` | — | room history (hides blocked senders) |

### Admin / moderation (Phase 3)
Gated by `X-Admin-Token: <CIRCLES_ADMIN_TOKEN>` (set the env var; if unset, all admin
routes return 401). A banned user is rejected at the door on every REST call **and**
the socket handshake, and is pulled out of nearby discovery.
| Method & path | Body | Notes |
|---|---|---|
| `GET /admin/reports` | — | reports newest-first + reporter/reported nicks, repeat-offender count, ban state |
| `GET /admin/bans` | — | current bans |
| `POST /admin/ban` | `{ userId, reason? }` | ban + disconnect their live sockets |
| `POST /admin/unban` | `{ userId }` | lift a ban |

### Socket.io (real-time DM + groups)
Connect with `auth: { token }`. In prod the client sets `path: "/circles-api/socket.io"`.

- **emit** `dm_open { otherId }` — join the thread room
- **emit** `dm_message { otherId, text }` — send (30 / 10s)
- **emit** `dm_typing { otherId, typing }`
- **receive** `dm_message`, `dm_inbox` (new-message badge + sound),
  `dm_request` (real-time intro alert to the recipient), `dm_accepted`,
  `dm_declined`, `dm_typing`, `dm_error`
- **emit** `group_open { groupId }` — join the room (must be a member)
- **emit** `group_message { groupId, text }` — send (30 / 10s)
- **emit** `group_typing { groupId, typing }`
- **receive** `group_message` (includes `from_nick`), `group_typing`, `group_error`

---

## 4. Files

**Backend** (`server/circles-local/`)
- `db.js` — SQLite schema (users, location, DM, groups, blocks, reports, **bans**)
- `geo.js` — fuzzing, haversine, distance buckets, bounding box
- `store.js` — domain logic (identity, location, nearby, DM, groups, safety, **moderation**)
- `index.js` — express REST + socket.io (port `CIRCLES_PORT`, default 5060); ban
  enforcement in REST `auth` + socket handshake; `/admin/*` gated by `CIRCLES_ADMIN_TOKEN`

**Frontend** (`client/src/`)
- `circlesApi.ts` — token mgmt + REST client + socket; `circlesAdmin` admin client
- `pages/CirclesLocal.tsx` — full flow: age gate → location → nearby → intro → live thread + groups; **notifications** (unread badges, sound + mute, tab-title alert)
- `pages/circles-local.css`
- `pages/CirclesAdmin.tsx` + `pages/circles-admin.css` — token-gated moderation dashboard
- `useKeyboardViewport.ts` — WhatsApp/Instagram-style mobile keyboard (composer stays above the keyboard)
- `config.ts` — `CIRCLES_API_BASE`
- Routes: `/circles` → `CirclesLocal`; `/circles-admin` → `CirclesAdmin`; `/nearby` → redirect to `/circles`

---

## 5. Local development

```bash
# 1. Backend (reuses ../node_modules — no install needed locally)
cd server/circles-local
CIRCLES_PORT=5060 FRONTEND_ORIGIN=http://localhost:3003 node index.js
# add CIRCLES_LOG=1 to log every incoming request (handy for debugging the client)

# 2. Frontend, pointed at the local service
cd client
PORT=3003 REACT_APP_CIRCLES_API_BASE=http://localhost:5060 npm start
```

Open `http://localhost:3003/circles` in a **normal** window and an **incognito**
window (two anonymous identities). In each: nickname → 18+ → "Find people near
me" → they appear → **Say hi** → accept → live chat. Try **Decline** too. For
**Groups**: open the **Groups** tab → "Start a group here" → the other identity
sees it under "Near you" → **Join** → live room.

> **"Failed to fetch" on localhost?** The PWA service worker (`client/public/custom-sw.ts`)
> is cache-first and may serve a previously-cached **prod** build that points at
> `api.chatrio.app/circles-api` (which rejects the `localhost:3003` origin → fetch
> fails). Fix: DevTools → **Application → Service Workers → Unregister**, then
> **Clear site data**, and reload. Tick **"Update on reload"** + **"Bypass for
> network"** while developing so the worker stops shadowing the dev build.

---

## 6. Production deployment

**Backend (new pm2 service — random chat untouched):**
```bash
rsync -avz --exclude node_modules --exclude 'circles-local.db*' \
  server/circles-local/ root@<vps>:/var/www/chatrio-circles-server/
ssh root@<vps> 'cd /var/www/chatrio-circles-server && npm install --omit=dev'
# .env: CIRCLES_PORT=5060, FRONTEND_ORIGIN=https://chatrio.app, CIRCLES_ADMIN_TOKEN=<secret> (for /admin/* + /circles-admin)
ssh root@<vps> 'cd /var/www/chatrio-circles-server && pm2 start index.js --name chatrio-circles-api && pm2 save'
```

**nginx** — add to the `api.chatrio.app` server block (REST + websockets):
```nginx
location /circles-api/ {
    proxy_pass http://localhost:5060/;   # trailing slash strips the prefix
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```
`nginx -t && systemctl reload nginx`

**Frontend** — build and rsync to `/var/www/chatrio` (the static site). Geolocation
needs HTTPS, which prod already serves.

---

## 7. Status & roadmap

- **Phase 1 — Nearby + 1:1 DM** ✅ live at `api.chatrio.app/circles-api`; frontend at `/circles`.
- **Phase 2 — Local group rooms** ✅ built & smoke-tested. **Backend live** (deployed
  2026-06-29). `groups` / `group_members` / `group_messages` tables, REST (`/groups/*`)
  + `group_*` sockets, "Groups" tab (create → discover nearby → join → live room).
  Blocked senders hidden from history **and live traffic**; rooms self-delete when empty.
- **Phase 3 — Moderation** ✅ built. **Backend live** (deployed 2026-06-29). Admin
  `reports` view, ban/unban with at-the-door enforcement (REST + socket) + live-socket
  disconnect (`bans` table, `/admin/*` gated by `CIRCLES_ADMIN_TOKEN`); token-gated
  **admin dashboard UI** at `/circles-admin`; fuller privacy/safety copy on the age gate.

### Done today (2026-06-29)
- **Backend deployed** to `/var/www/chatrio-circles-server` (pm2 `chatrio-circles-api`):
  Phase 2 groups + Phase 3 moderation + the group block-leak fix + the `dm_request`
  real-time intro emit. `CIRCLES_ADMIN_TOKEN` added to the prod `.env`.
- **Group block fix:** live `group_message` / `group_typing` now delivered per-socket,
  skipping anyone in a block relationship (previously only history hid blocked senders).
- **Chat UI overhaul** (a11y + polish): aria-labels on icon buttons, keyboard-navigable
  rows, `:focus-visible` rings, inline SVG icons (no emoji), 44px touch targets,
  message timestamps, avatars, animated typing dots, bubble word-wrap.
- **Notifications (in-app, no infra):** unread count badges (Chats tab + per-thread,
  cleared on open), Web-Audio ping on new message / intro / accept, **mute toggle**
  (persisted), browser-tab title alert when backgrounded, real-time intro requests.
- **Admin dashboard UI** (`/circles-admin`) + safety copy on the age gate.

### Remaining
1. **Finish frontend deploy** — ⏸ **paused here.** The prod build is done locally
   (`client/build/`, bundle `main.c4bc5a35.js`, includes the UI overhaul +
   notifications + `/circles-admin`). Next step is just the rsync:
   `rsync -avz --delete client/build/ root@<vps>:/var/www/chatrio/` (dry-run with
   `-n` first — `--delete` only removes the old hashed JS bundle). Backend is
   already live, so this single step makes everything go live.
2. **Browser push (background notifications)** — not started. Needs a VAPID keypair,
   a `push_subscriptions` table + subscribe endpoint, `web-push` send on new
   message/intro when the recipient is offline, and `push` / `notificationclick`
   handlers in `client/public/custom-sw.ts`.
3. **Invite the waitlist** (see [circles-waitlist] in project memory).

### Known issues (not Circles-specific)
- SEO prerender (`react-snap`, run in the client `postbuild`) crashes on one Spanish
  web-story (`/stories/habla-con-extraños-en-méxico`, React #418 hydration mismatch).
  Worked around by tolerating the single-page failure — that one story falls back to
  client render; all other pages prerender fine. Pre-existing, unrelated to Circles.
