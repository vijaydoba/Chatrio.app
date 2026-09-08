# Chatrio

**Chatrio** is a random chat web app — talk to strangers instantly by text or video. Text chat (`/chat`) stays fully anonymous with no sign‑up. Video chat (`/video-chat`) requires a lightweight account (email one‑time code or Google Sign‑In) so two people who hit it off can add each other as friends and reconnect directly later, instead of it being purely one‑off. It pairs two online users in real time over WebSockets, with optional topic‑based matching for text chat, WebRTC video (both as an in-chat escalation and as its own dedicated Random Video Chat mode), and ships a full SEO content layer (200 blog posts) under the same domain.

🌐 **Live:** [chatrio.app](https://chatrio.app)

📘 **Discord setup:** [Server name, channels, announcements, and roadmap](./discord/README.md)

> **2026‑09‑08/09:** Random Video Chat shipped to production for the first time, along with account‑gated features layered on top — a 15s "decide fast" match countdown, Add Friend, and direct reconnect with a friend later. This also surfaced (and fixed) a real production drift: `chatrio-api` (port 5050) — the process nginx had actually been routing general chat/video-chat traffic to — was a stale build that still had the old synthetic bot‑fallback for text chat, predating the 2026‑08‑20 removal below. Text chat in production was quietly matching some users with fake bots the whole time. That process has been retired; everything now runs on the up‑to‑date consolidated service (see Tech Stack and Build & Deploy below). Real matches only, confirmed live, for both text and video chat.

---

## Features

- **Anonymous random chat** — get matched with a stranger 1‑on‑1, no account or phone number needed.
- **Real‑time messaging** — text, images, typing indicators, and delivery receipts over Socket.IO.
- **Topic‑based matching** — users sharing at least one topic are matched first; otherwise anyone is paired.
- **Skip / Next** — instantly leave the current partner and find a new one.
- **Circles** — anonymous local chat: proximity‑based rooms for talking to people nearby without revealing identity (`/circles`, backed by the `server/circles-local` service). Coarse-area matching only (never exact location), no account — identity is an anonymous on-device token.
- **Circles Android app** — a Capacitor‑wrapped native build of Circles (push notifications, no marketing chrome). Live on the Play Console Internal testing track; a Closed testing release (the required 12‑tester/14‑day step before public release) has been submitted to Google for review as of 2026‑08‑04 — 3 of 12 testers recruited so far, opt‑in link not yet functional pending approval. See [`MOBILE-APP.md`](./MOBILE-APP.md).
- **Blind Date** — profile‑matched 1:1 chat (`/blind-date`): personality/compatibility matching instead of proximity, names and photos stay hidden until both sides opt to reveal (or after 10 minutes). Requires a real chatrio account, unlike Circles. Gated behind a `BLIND_DATE_LIVE` flag in `client/src/config.ts` — currently `false` (coming‑soon waitlist page) while still in beta; flip to `true` to restore the live matching flow at `/blind-date/chat`.
- **Waitlist capture** — both Circles and Blind Date fall back to a "coming soon" email‑capture page when their live flag is off. Signups land in a `waitlist` table (`email`, `source`, timestamp) and can be pulled anytime via `GET /waitlist` on the main API, authenticated with `ADMIN_TOKEN` as a bearer token or `?key=` query param.
- **Live online & waiting counts** — broadcast to all connected clients.
- **Real matches only** — there is no fallback/placeholder partner anywhere in the product (text chat, video escalation, or Random Video Chat). If no one else is online, the user waits until a real stranger joins. A synthetic fallback bot existed on both the text-chat and Random Video Chat matching pools through 2026‑08‑19 and was removed 2026‑08‑20 at the product owner's request — do not re‑add it without asking first. (A stale, pre‑removal build was still quietly live in production for general chat traffic until 2026‑09‑09 due to an nginx/pm2 drift — see the banner above.)
- **Video call escalation (in-chat)** — from an active `/chat` text conversation, either side can start a WebRTC video call with their current partner (camera/mic toggle, decline/cancel, hang up). Signaling is a thin Socket.IO relay in `server/index.js` scoped to the existing text-chat pairing; the peer-connection logic lives in `client/src/videoChat.ts`. The call tears down automatically on skip/leave/disconnect.
- **Random Video Chat (`/video-chat`)** — a separate, dedicated random-matching pool from text chat, requiring a signed-in account (see Authentication below). Video starts immediately the moment two real users are paired (no invite/accept step, unlike the in-chat escalation above), and includes its own live text chat panel alongside the video (message bubbles, typing indicator, delivery ticks). Mute, camera toggle, Skip, and End are all supported. A 15-second countdown starts on every match — Monkey-app-style "decide fast" urgency — and clears automatically the moment WebRTC actually connects; if it runs out first, both sides are released back into the queue. Matching state and signaling relay live in `server/index.js` (the `vc` state and `vc_*` events); the client is `client/src/randomVideoCall.ts` (peer-connection controller) and `client/src/pages/VideoChat.tsx` (page/UI).
- **Authentication (email code or Google)** — `/login` and `/signup` (`client/src/pages/Auth.tsx`) offer two paths: a 6-digit email one-time code (passwordless — the account is found-or-created on verify, so there's no separate "sign up" step for this path) or Google Sign-In (`@react-oauth/google`, verified server-side with `google-auth-library`). Both issue the same JWT used by the pre-existing password-based login. Logic lives in `server/auth.js`; codes are emailed via [Resend](https://resend.com) (`RESEND_API_KEY`) and fall back to logging the code to the server console if that key isn't set (dev-only). Text chat and Circles are unaffected — only Video Chat and Friends require this.
- **Add Friend & Reconnect** — from the video-call controls (or right after), either side can add the other as a friend (`server/friends.js`, `friends` table). If you both add each other, it auto-accepts instantly; otherwise it's a pending request the other person can accept/decline later on `/friends`. Accepted friends get a "Reconnect" button that pairs you directly with them next time they're in the video chat lobby, bypassing the random queue entirely (`vc_direct_connect`).
- **SEO content layer** — a React blog (184 posts) at `/blog/{slug}` with category pages, all pre‑rendered to static HTML for search engines. Includes geo landing posts (e.g. "Chat With Strangers in Canada/Philippines/Pakistan"), Omegle/OmeTV/Chatroulette/etc. alternative comparison pages, relationship psychology, and two Circles/local-community clusters — each with its own hero image and distinct structure (no shared templates, per a July 2026 AdSense scaled‑content fix).
- **AI-search visibility** — `robots.txt` explicitly allows AI crawlers (ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended, etc.) and `client/public/llms.txt` gives AI assistants a structured, accurate summary of the product — keep it in sync when a feature's behavior changes (e.g. Circles).
- **Web manifest + dark/light theme.** The only active service worker is `public/circles-push-sw.js`, registered from `circlesApi.ts` when a Circles user opts into browser push notifications — it's scoped to the whole origin but has no `fetch` handler, so it cannot cache or intercept page loads/navigation anywhere on the site, Circles or otherwise. `client/public/custom-sw.ts` is unrelated dead code — never registered by any code path, present only so it gets type-checked. There is no offline/PWA caching layer; adding one would mean writing and registering a real service worker, not resurrecting that file.

> **Note:** the AMP web‑stories layer (455 generated stories) was retired entirely in July 2026 to resolve a Google AdSense "scaled content" flag. Old `/stories/*` and `/web-stories/*` URLs return 410; do not re‑add templated story content. Search Console prefix‑removal requests were also submitted for both paths on 2026‑07‑22 to speed up de‑indexing of the already‑410'd URLs.

---

## Tech Stack

**Frontend** (`client/`)
- React 19 + TypeScript (Create React App)
- React Router 7
- Socket.IO client
- WebRTC (`RTCPeerConnection`, STUN only — no TURN server) for in-chat video escalation and Random Video Chat, signaled over the existing Socket.IO connection
- `react-helmet-async` for per‑page meta/SEO
- Static pre‑rendering of routes via `scripts/prerender-all-stable.js` (a custom puppeteer‑based prerenderer — see [Build & Deploy](#build--deploy); `react-snap` itself was removed 2026-08-18, its bundled ancient puppeteer's Chromium download was breaking deploys and its `postbuild` hook was already unused/unreliable)
- Capacitor (Android) wraps the same `client/` build for the native Circles app — see [`MOBILE-APP.md`](./MOBILE-APP.md)

**Backend** (`server/`)
- Node.js 20 + Express 4
- Socket.IO server
- SQLite (`chatrio.db`) for persistence
- Groq SDK (`groq-sdk`) + `dotenv`
- `bcryptjs` + `jsonwebtoken` (password/JWT auth), `google-auth-library` (Google Sign-In token verification), `resend` (email-code delivery)
- `server/circles-local/` — the Circles proximity‑chat service
- In production, deployed as 3 separate pm2 services on the VPS, each with its own `.env` and SQLite file: **`chatrio-auth-api`** (consolidated 2026‑09‑09 — text chat, Random Video Chat, in-chat video escalation, auth, Friends, and Circles' recurring-cohort mode all in one process, `server/index.js`; nginx routes both `api.chatrio.app/` and `api.chatrio.app/auth/` here), `chatrio-circles-api` (the separate proximity-chat service, `server/circles-local/`), and `chatrio-blind-date-api`. A 4th process, `chatrio-api` (a stale pre‑auth build that predated this consolidation), was retired 2026‑09‑09 — see the banner above.

**Tooling** (`scripts/`)
- Sitemap generation, IndexNow submission (`notify-google.js` — submits to participating engines; Google discovers via the sitemap/Search Console), banner/portrait generators, and SEO research helpers.

---

## Project Structure

```
chatrio/
├── client/                 # React + TypeScript frontend (CRA)
│   ├── public/             # Static assets, branding, manifest, sitemap.xml
│   │   └── images/portraits/   # country portrait art (geo post posters)
│   ├── src/
│   │   ├── App.tsx         # App shell, routing, blog/SEO pages; native-app chrome gate
│   │   ├── Chat.tsx        # Real-time text chat UI + Socket.IO client + in-chat video escalation
│   │   ├── auth.tsx        # AuthProvider/useAuth — password, email-code, and Google Sign-In, JWT in localStorage
│   │   ├── videoChat.ts    # WebRTC controller for the in-chat video escalation (invite/accept flow)
│   │   ├── randomVideoCall.ts  # WebRTC controller for Random Video Chat (auto-start, no invite step)
│   │   ├── push.ts         # Native push-notification registration (Android app only)
│   │   ├── pages/          # About, Contact, Privacy, Terms, News, Circles, VideoChat.tsx (/video-chat), Auth.tsx (/login, /signup), Friends.tsx (/friends), etc.
│   │   └── data/           # posts.ts (blog metadata), posts-content.ts (post bodies)
│   ├── android/             # Generated Capacitor Android project — see MOBILE-APP.md
│   ├── assets/              # Icon/splash source for `npx capacitor-assets generate`
│   ├── capacitor.config.ts
│   └── build/              # Pre-rendered production output
├── server/                 # Express + Socket.IO backend
│   ├── index.js            # Text-chat matching engine + in-chat video signaling relay, the Random Video Chat matching pool (`vc`) incl. match countdown + friend-request/direct-connect events, plus Circles' recurring-cohort mode
│   ├── auth.js             # Passwordless email-code + Google Sign-In (JWT shared with circles.js's password login)
│   ├── friends.js          # Add Friend / accept / decline / list REST endpoints (`friends` table)
│   ├── circles.js          # Password auth, recurring-cohort Circles logic (SQLite via db.js)
│   └── circles-local/      # Circles proximity-chat service (+ push.js for FCM sends)
├── scripts/                # Sitemap generator, prerender-all-stable.js, IndexNow notifier, SEO helpers
├── marketing/              # Directory-submission / backlink plan + tracker (not deployed)
├── MOBILE-APP.md           # Circles Android app: build, push setup, Play Store checklist
└── .htaccess               # Apache rewrite/host config
```

---

## Getting Started

### Prerequisites
- Node.js **20.x**
- npm

### 1. Backend

```bash
cd server
npm install
```

Create `server/.env` (this file is gitignored — never commit it):

```env
PORT=5050
FRONTEND_ORIGIN=http://localhost:3000
GROQ_API_KEY=your_groq_api_key_here
JWT_SECRET=any_random_string          # shared by password, email-code, and Google auth
GOOGLE_CLIENT_ID=your_google_oauth_client_id   # optional — Google Sign-In button hides itself without it
RESEND_API_KEY=your_resend_api_key    # optional — without it, email codes just log to the server console
```

Run the server:

```bash
npm start          # node index.js
```

The API listens on `http://localhost:5050` with health checks at `/` and `/health`.

### 2. Frontend

```bash
cd client
npm install
npm start          # runs on http://localhost:3000
```

> **Note:** `Chat.tsx` (text chat) hardcodes the production socket server `https://api.chatrio.app` — edit that URL directly to test against your local backend. `pages/VideoChat.tsx` (Random Video Chat) instead reads `process.env.REACT_APP_API_BASE` (falling back to the same production URL), so `REACT_APP_API_BASE=http://localhost:5050 npm start` is enough to point *that* page at a local backend without editing source. The two are inconsistent on purpose for now — video calling depends on server-side signaling code that only exists locally/on newer deploys, so this env var was added to make that page testable without touching `Chat.tsx`.
>
> To test Google Sign-In locally, create `client/.env` with `REACT_APP_GOOGLE_CLIENT_ID=your_google_oauth_client_id` (must match the server's `GOOGLE_CLIENT_ID`) and add `http://localhost:3000` as an authorized JavaScript origin on that OAuth Client ID in Google Cloud Console. CRA only reads `.env` at build/start time — restart `npm start` after changing it. Without it, the Google button just doesn't render; the email-code path works with zero setup beyond `JWT_SECRET`.

---

## Content Pipeline (blog)

Posts are data‑driven, not per‑file:

1. Append post metadata (slug/title/excerpt/thumbnail/date/category) to `POSTS` in `client/src/data/posts.ts`.
2. Add the HTML body to `POST_CONTENT` (keyed by slug) in `client/src/data/posts-content.ts`.
3. New slugs must not collide with a blog category slug, and check existing posts (including roundups) before adding — near‑duplicate posts have caused AdSense flags.
4. To retire a post: remove it from both files, add a `POST_REDIRECTS` entry in `posts.ts`, and add a matching nginx 301 on the server.
5. Rebuild — the sitemap regenerates automatically via `prebuild`.
6. After content changes, refresh the reference-only backup with `node scripts/generate-blog-backup.js`.

### Current blog snapshot

- **189 posts** in source as of **2026‑08‑04**.
- **204 routes** in the production prerender (blog posts plus site pages).
- The latest release is deployed and its five canonical URLs return HTTP 200.
- `sitemap.xml`, the blog feed, post backup, and static article HTML are generated from the same post data.

### Circles launch cluster (2026‑08‑02)

| Article | Primary search intent | Production URL |
| --- | --- | --- |
| Circles App: Anonymous Nearby Chat Guide | Branded app guide / anonymous nearby chat | [circles-app-anonymous-nearby-chat-guide](https://chatrio.app/blog/circles-app-anonymous-nearby-chat-guide) |
| Community App Privacy: 10 Checks Before You Join | Community-app privacy and safety | [community-app-privacy-safety-checklist](https://chatrio.app/blog/community-app-privacy-safety-checklist) |
| 25 Local Group Chat Ideas to Meet People Nearby | Local group-chat ideas | [local-group-chat-ideas-for-meeting-people](https://chatrio.app/blog/local-group-chat-ideas-for-meeting-people) |
| How Approximate Location Protects Nearby Chat | Approximate-location privacy | [how-approximate-location-protects-nearby-chat](https://chatrio.app/blog/how-approximate-location-protects-nearby-chat) |
| 30 Conversation Starters for Someone Nearby | First-message conversation starters | [first-message-to-someone-nearby-conversation-starters](https://chatrio.app/blog/first-message-to-someone-nearby-conversation-starters) |

The cluster was selected after Semrush US keyword research. Useful demand signals included **community app** (1,300 monthly searches, KD 19), **anonymous chat app** (1,000, KD 50), **group chat app** (390, KD 39), and **conversation starters** (49,500, KD 38). Treat these values as the dated 2026‑08‑02 research snapshot, not permanent metrics.

Each article:

- has an original 1200×630 hero plus 280×190 card and 104×104 thumbnail variants under `client/public/images/`;
- links naturally to the other Circles articles and the `/circles` landing page;
- is linked directly from the Circles landing page so it is not an orphan;
- extends the existing Circles coverage without duplicating its search intent.

Circles-release validation: the 184-post content audit passed, all 199 routes prerendered, hydration CLS measured **0.000**, aliases returned 301, and missing routes returned 404. Yandex accepted the IndexNow submission (202); Bing's IndexNow endpoints returned 403 even though the ownership key files were publicly reachable, so Google discovery continues through the live sitemap/Search Console rather than IndexNow.

### Community-app comparison cluster (2026‑08‑04)

| Article | Primary search intent | Production URL |
| --- | --- | --- |
| 7 Best Community Apps to Meet People Nearby | Community-app comparison | [best-community-apps-to-meet-people-nearby-2026](https://chatrio.app/blog/best-community-apps-to-meet-people-nearby-2026) |
| 7 Best Nextdoor Alternatives for Neighbors | Nextdoor alternatives | [best-nextdoor-alternatives-neighborhood-apps-2026](https://chatrio.app/blog/best-nextdoor-alternatives-neighborhood-apps-2026) |
| 7 Best Yik Yak Alternatives for Local Chat | Yik Yak alternatives | [best-yik-yak-alternatives-anonymous-local-chat-2026](https://chatrio.app/blog/best-yik-yak-alternatives-anonymous-local-chat-2026) |
| 7 Best Meetup Alternatives to Meet People | Meetup alternatives | [best-meetup-alternatives-make-friends-nearby-2026](https://chatrio.app/blog/best-meetup-alternatives-make-friends-nearby-2026) |
| 7 Best Group Chat Apps for Communities | Group-chat app comparison | [best-group-chat-apps-for-local-communities-2026](https://chatrio.app/blog/best-group-chat-apps-for-local-communities-2026) |

This cluster extends the dated Semrush demand signals above and the Search Console opportunity around platonic local connection without creating new pages for queries whose canonical URLs are still consolidating. Each article is 800–930 words, includes current product-source links, cross-links the cluster, and has original hero, card, and thumbnail artwork.

Latest-release validation: the 189-post content audit passed, all 204 routes prerendered, hydration CLS measured **0.000**, all five new canonical URLs and the new hashed JavaScript bundle returned 200, a historical alias returned 301, and a missing article returned 404.

---

## Build & Deploy

> ⚠️ Use the recipe below, not a plain `npm run build`. `react-snap` (formerly wired up via a `postbuild` hook) was removed 2026-08-18 — its headless crawl used to crash outright partway through (a Suspense/lazy‑route hydration race that reliably reproduced, at a different page each run) instead of just producing empty shells, and its bundled ancient puppeteer's Chromium download was also breaking `npm ci` on the VPS. The recipe below replaces that crawl step with `scripts/prerender-all-stable.js`, a custom puppeteer‑based prerenderer that waits for real rendered content (not just network‑idle) before snapshotting each page.

```bash
# 1. Quit Google Chrome fully first — required, or the prerender step
#    contends with your open browser for Chrome/puppeteer resources.
osascript -e 'quit app "Google Chrome"'

# 2. Regenerate the sitemap + route list
node scripts/generate-sitemap.js

# 3. Production webpack build only
cd client && CI=false npx react-scripts build && cd ..

# 4. Prerender every route to static HTML
node scripts/prerender-all-stable.js
```

After it finishes, verify the log shows every route crawled with no thrown errors (currently `crawled 199 out of 199`: 184 posts plus 15 static/category routes), followed by successful hydration checks for `/`, `/blog`, a representative article, and `/about`. The hydration checks fail the build on React hydration errors, missing content, or lab CLS above `0.05`. Also confirm that no empty shells remain in the output:

```bash
rg -l '<div id="root"></div>' client/build   # should print nothing
```

The stable prerenderer accepts `PRERENDER_BUILD_DIR=/absolute/path` when a clean, isolated build is needed, and `PRERENDER_PORT=46027` when another crawl is already using the default local port. Before deploying, also verify that article pages have the expected canonical URL, all article `<img>` elements have `width` and `height`, and all referenced assets exist.

Deployment is a manual rsync to `/var/www/chatrio`, which nginx serves. Always dry-run the exact command before removing `-n`, because `--delete` removes files that are no longer present in the build:

```bash
chmod 0755 client/build
rsync -avzn --delete client/build/ root@185.190.142.158:/var/www/chatrio/
rsync -avz --delete client/build/ root@185.190.142.158:/var/www/chatrio/
ssh root@185.190.142.158 'chmod 0755 /var/www/chatrio'
```

The trailing slash on `client/build/` is intentional. The final `chmod` prevents nginx `403` responses if an isolated temporary build directory was created with mode `0700`. The production API is deployed separately as a pm2-managed Node service on the same VPS.

### Backend deploy

The consolidated `chatrio-auth-api` service (`server/index.js` + `circles.js`/`db.js`/`auth.js`/`friends.js`) lives at `/var/www/chatrio-auth-api` on the VPS — it is **not** a git checkout, just the plain files, so deploys are an explicit file-by-file rsync (not a whole-directory sync, to avoid pulling in the unrelated `blind-date/`/`circles-local/` subfolders that also live under `server/` locally):

```bash
cd server
rsync -avz index.js circles.js db.js auth.js friends.js package.json package-lock.json \
  root@185.190.142.158:/var/www/chatrio-auth-api/
ssh root@185.190.142.158 'cd /var/www/chatrio-auth-api && npm install --omit=dev && pm2 restart chatrio-auth-api'
```

`db.js`'s schema block is additive/idempotent (`CREATE TABLE IF NOT EXISTS`, plus a `PRAGMA table_info` check before any `ALTER TABLE`), so redeploying never touches the existing `chatrio.db` or its data. New env vars (`GOOGLE_CLIENT_ID`, `RESEND_API_KEY`, etc.) go in `/var/www/chatrio-auth-api/.env` directly on the VPS — `pm2 restart chatrio-auth-api --update-env` after editing it, or they won't be picked up.

Adding a new third-party auth provider or API host requires two nginx-adjacent changes on top of the code, both easy to forget:
1. **CSP** — the `chatrio` site's `Content-Security-Policy` header scopes `script-src`/`connect-src`/`frame-src` to known third parties (see below). A new provider's domain (e.g. `accounts.google.com` for Google Sign-In) needs adding to `connect-src` and `frame-src` or the browser silently blocks it — this fails silently in production with no error surfaced to the user, only in the browser console.
2. **Routing** — new REST routes only need adding to `server/index.js`; they're automatically reachable through the existing `location /` → `chatrio-auth-api` nginx block. Only routes that need their *own* dedicated backend process (like `/friends` did briefly need before consolidation) require a new `location` block in `/etc/nginx/sites-available/chatrio-api`.

### Production routing and SEO safeguards

The active nginx site is `/etc/nginx/sites-available/chatrio`. `nginx-seo-fixes.conf` is a reference snippet for the required rules; it is not a complete configuration file and must not replace the active site wholesale.

- Historical article aliases and legacy `/blog/post/{slug}` URLs return `301` to their canonical `/blog/{slug}` URL.
- Known blog pages are served from prerendered `index.html` files; unknown `/blog/*` URLs return a real HTTP `404` instead of the homepage SPA shell.
- `client/public/404.html` provides `Page Not Found` metadata and `noindex` for nginx error responses.
- Retired `/stories/*` and `/web-stories/*` routes return `410 Gone`.
- Blog hero and inline images have explicit dimensions, lazy loading where appropriate, and async decoding to reduce layout movement.
- Sitemap image URLs are normalized to `https://chatrio.app/images/...` (never `https://chatrio.app//images/...`).
- Article content is marked as an AdSense exclusion area to prevent automatic ad placement inside the article body.
- A `Content-Security-Policy` header (enforcing, not report-only) is set in the nginx config — `script-src`/`connect-src`/`frame-src` are scoped to the actual third parties in use (Google Tag Manager, AdSense/`googlesyndication`, `api.chatrio.app` incl. `wss://`, and — as of 2026‑09‑08 for Google Sign-In — `accounts.google.com` in both `connect-src` and `frame-src`). Adding a new third-party script or API host requires widening this policy or it will be silently blocked.

### Hydration and CLS safeguard

The July 2026 homepage hydration mismatch (`React #418`) was traced to the global `<Suspense>` boundary replacing manually prerendered content while React attached to it. Blog pages could similarly replace the server-visible article body with a loading state. Home, blog, article, and static routes now hydrate without that boundary; only genuinely lazy product routes use it, and article hydration starts from the prerendered body. Keep the representative hydration checks in `scripts/prerender-all-stable.js` enabled so this does not regress. Search Console's field CLS is a rolling measurement, so only start validation after this build is deployed and allow the field window to refresh.

Whenever a blog slug is retired or renamed, keep `POST_REDIRECTS` in `client/src/data/posts.ts` and the matching production nginx redirect in sync. Back up the active site configuration, test it, and only then reload nginx:

```bash
ssh root@185.190.142.158 'cp /etc/nginx/sites-available/chatrio /root/chatrio.nginx.bak.$(date +%F-%H%M%S) && nginx -t && systemctl reload nginx'
```

After every frontend deployment, check at least one canonical article, one historical alias, one deliberately missing article, and the deployed hashed JavaScript asset:

```bash
curl -I https://chatrio.app/
curl -I https://chatrio.app/blog/best-opening-lines-for-online-chat-with-strangers
curl -I https://chatrio.app/blog/best-opening-lines-online-chat
curl -I https://chatrio.app/blog/definitely-missing-seo-check
curl -I https://chatrio.app/static/js/main.HASH.js   # replace HASH using asset-manifest.json
```

The first four expected statuses are `200`, `200`, `301`, and `404`; the actual hashed asset must also return `200`. Source-level CLS mitigations can be checked immediately, but Google's field CLS value uses a rolling collection window and will not change immediately after deployment. Optionally run `node scripts/notify-google.js` from the repository root to submit updated URLs through IndexNow.

---

## How Matching Works

Both matching engines live in `server/index.js` and keep all state in memory. There is no fallback/bot partner in either — a user waits until a real match is found (removed 2026‑08‑20; see Features above).

### Text chat (`/chat`)

1. A user emits `ready_to_chat` and joins the **waiting** pool (`state.waiting`).
2. `tryMatch()` pairs two waiting users who share a topic (or any two users if no topics are set).
3. `next` leaves the current partner and re‑enters the queue; `disconnect_request` returns the user to idle.
4. Once paired, either side can additionally emit `video_invite` to escalate the existing text conversation to a WebRTC video call (see the `video_*` events below) — this is optional and separate from Random Video Chat.

### Random Video Chat (`/video-chat`)

A second, independent matching pool (`vc` in `server/index.js`) so video and text matching never cross-pair. Unlike text chat, this pool requires a signed-in account: the client connects its socket with `auth: { token }` (the JWT from `auth.tsx`), and the server decodes it once per connection into `socket.data`-scoped `authedUser`, shared with Circles' cohort-room auth.

1. A user emits `vc_ready_to_chat` (after the browser grants camera/mic access) and joins `vc.waiting`. Rejected with `vc_error {code: "AUTH_REQUIRED"}` if not signed in.
2. `tryVcMatch()` pairs two waiting users — there's no topic filter here. `pairPeers()` (shared by both the random-queue path and direct reconnect below) also starts the 15s match countdown and, if both users are authenticated, includes each side's `partnerUserId` in the `vc_partner_found` payload.
3. Video starts immediately on match; there is no invite/accept step, unlike the in-chat escalation. The client reports `vc_connected` once its `RTCPeerConnection` reaches `"connected"`, which clears that pair's countdown timer server-side. If neither side connects before the countdown expires, `vc_countdown_expired` fires for both and they're released back into the queue.
4. `vc_next` (Skip) leaves the current partner and re‑enters the queue; `vc_disconnect_request` (End) returns the user to the lobby, releases the camera, and forgets that user's socket↔userId mapping.
5. A lightweight text side-channel (`vc_message`/`vc_typing`/`vc_delivered`) rides alongside the video call, rendered in `VideoChat.tsx`'s chat panel.

### Add Friend & Reconnect

- `vc_friend_request {toUserId}` (only valid against your *current* partner) calls `upsertFriendRequest()` in `server/friends.js`. First request from either side creates a `pending` row (canonically ordered `user_id_a < user_id_b`); if the other side already requested first, it auto-accepts instead of creating a second pending row.
- The requester gets `vc_friend_request_sent {status}`; the partner (if still connected) gets `vc_friend_request_received {fromUserId, fromName, status}`.
- `GET /friends`, `POST /friends/:userId/accept`, `POST /friends/:userId/decline` (REST, JWT-protected) back the `/friends` page — for reviewing/accepting requests outside of an active call.
- `vc_direct_connect {friendUserId}` looks up that user's current socket via `vc.userSockets` (populated whenever an authenticated user emits `vc_ready_to_chat` *or* `vc_direct_connect`); if they're idle in `vc.waiting`, it calls `pairPeers()` directly, skipping the random-queue scan entirely. Otherwise it emits `vc_friend_offline` and the client falls back to the normal queue.

### Key Socket.IO events

| Client → Server | Server → Client |
| --- | --- |
| `set_username`, `set_topics` | `online`, `waiting_count` |
| `ready_to_chat`, `next` | `waiting`, `partner_found`, `idle` |
| `message`, `image`, `typing` | `message`, `image`, `partner_typing` |
| `delivered`, `disconnect_request` | `msg_sent`, `msg_delivered`, `friend_left` |
| `video_invite/accept/decline/cancel`, `video_offer/answer/ice_candidate`, `video_end` | same names relayed to the partner — in-chat video escalation, scoped to `state.partner` |
| `vc_ready_to_chat`, `vc_next`, `vc_disconnect_request` | `vc_waiting`, `vc_partner_found` (incl. `partnerUserId`), `vc_idle`, `vc_waiting_count`, `vc_friend_left`, `vc_error {code:"AUTH_REQUIRED"}` |
| `vc_offer/answer/ice_candidate`, `vc_end` | same names relayed to the partner — Random Video Chat signaling, scoped to `vc.partner` |
| `vc_message`, `vc_typing`, `vc_delivered` | `vc_message`, `vc_partner_typing`, `vc_msg_sent`, `vc_msg_delivered` — Random Video Chat's text side-channel |
| `vc_connected` | `vc_match_countdown {seconds}`, `vc_countdown_expired` — the 15s "decide fast" match timer |
| `vc_friend_request {toUserId}`, `vc_direct_connect {friendUserId}` | `vc_friend_request_sent`, `vc_friend_request_received`, `vc_friend_offline` — Add Friend & Reconnect |

### Key REST endpoints (auth & friends)

| Endpoint | Notes |
| --- | --- |
| `POST /auth/signup`, `POST /auth/login` | Original password-based auth (`server/circles.js`) |
| `POST /auth/request-code`, `POST /auth/verify-code` | Passwordless email-code login/signup (`server/auth.js`) — find-or-creates the account on verify |
| `POST /auth/google` | Google Sign-In — verifies the ID token server-side, find-or-creates by `google_id`/email |
| `GET /auth/me` | Resolve the current user from a bearer JWT |
| `GET /friends`, `POST /friends/:userId/accept`, `POST /friends/:userId/decline` | Friends list + pending-request management (`server/friends.js`) |

---

## Environment Variables

| Variable | Location | Description |
| --- | --- | --- |
| `PORT` | server | Port the Express/Socket.IO server listens on |
| `FRONTEND_ORIGIN` | server | Allowed CORS origin for the frontend |
| `GROQ_API_KEY` | server | Groq API key (keep secret — never commit) |
| `JWT_SECRET` | server | Signs/verifies auth tokens for password, email-code, and Google login alike — must be identical across any process that needs to validate a token issued elsewhere (e.g. the video-chat socket handshake) |
| `GOOGLE_CLIENT_ID` | server | Google OAuth Client ID — audience-checked when verifying Sign-In tokens; without it, `/auth/google` returns a 500 |
| `RESEND_API_KEY` | server | [Resend](https://resend.com) API key for sending email-code emails; without it, codes are logged to the server console instead (dev-only fallback) |
| `RESEND_FROM` | server | Optional override for the "from" address (defaults to `Chatrio <noreply@chatrio.app>`) — the domain must be verified on Resend |
| `REACT_APP_API_BASE` | client | Overrides the socket server URL for `pages/VideoChat.tsx` only (defaults to `https://api.chatrio.app`); see the note under Getting Started — `Chat.tsx` does not read this var |
| `REACT_APP_GOOGLE_CLIENT_ID` | client | Same Google OAuth Client ID as the server's `GOOGLE_CLIENT_ID` — enables the "Continue with Google" button on `/login`/`/signup`; button stays hidden if unset |

---

## License

Private project. All rights reserved © Chatrio.
