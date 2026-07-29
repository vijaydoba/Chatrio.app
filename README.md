# Chatrio

**Chatrio** is an anonymous 1‑on‑1 random chat web app — talk to strangers instantly, no sign‑up required. It pairs two online users in real time over WebSockets, with optional topic‑based matching, and ships a full SEO content layer (176 blog posts) under the same domain.

🌐 **Live:** [chatrio.app](https://chatrio.app)

📘 **Discord setup:** [Server name, channels, announcements, and roadmap](./discord/README.md)

---

## Features

- **Anonymous random chat** — get matched with a stranger 1‑on‑1, no account or phone number needed.
- **Real‑time messaging** — text, images, typing indicators, and delivery receipts over Socket.IO.
- **Topic‑based matching** — users sharing at least one topic are matched first; otherwise anyone is paired.
- **Skip / Next** — instantly leave the current partner and find a new one.
- **Circles** — anonymous local chat: proximity‑based rooms for talking to people nearby without revealing identity (`/circles`, backed by the `server/circles-local` service).
- **Circles Android app** — a Capacitor‑wrapped native build of Circles (push notifications, no marketing chrome). See [`MOBILE-APP.md`](./MOBILE-APP.md).
- **Live online & waiting counts** — broadcast to all connected clients.
- **Smart fallback bot** — if no human is available within a few seconds, a placeholder partner is connected so the user is never left waiting, and leaves shortly after.
- **SEO content layer** — a React blog (176 posts) at `/blog/{slug}` with category pages, all pre‑rendered to static HTML for search engines. Includes geo landing posts (e.g. "Chat With Strangers in Canada/Philippines/Pakistan"), Omegle/OmeTV/Chatroulette/etc. alternative comparison pages, and a relationship-psychology cluster (situationships, love bombing, secure/anxious/avoidant attachment, limerence, ghosting, breadcrumbing) — each with its own hero image and distinct structure (no shared templates, per a July 2026 AdSense scaled‑content fix).
- **AI-search visibility** — `robots.txt` explicitly allows AI crawlers (ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended, etc.) and `client/public/llms.txt` gives AI assistants a structured, accurate summary of the product — keep it in sync when a feature's behavior changes (e.g. Circles).
- **Web manifest + dark/light theme.** There is no active service worker — a broken `/custom-sw.js` registration that pointed at a `.ts` file (never compiled by CRA, so it 404'd on every page load) was removed in July 2026. Re-adding offline/PWA support would need a real, compiled service worker, not just re-registering that path.

> **Note:** the AMP web‑stories layer (455 generated stories) was retired entirely in July 2026 to resolve a Google AdSense "scaled content" flag. Old `/stories/*` and `/web-stories/*` URLs return 410; do not re‑add templated story content. Search Console prefix‑removal requests were also submitted for both paths on 2026‑07‑22 to speed up de‑indexing of the already‑410'd URLs.

---

## Tech Stack

**Frontend** (`client/`)
- React 19 + TypeScript (Create React App)
- React Router 7
- Socket.IO client
- `react-helmet-async` for per‑page meta/SEO
- Static pre‑rendering of routes via `scripts/prerender-all-stable.js` (a custom puppeteer‑based prerenderer — see [Build & Deploy](#build--deploy); the `react-snap` devDependency is still installed but its `postbuild` hook is unreliable and should not be used)
- Capacitor (Android) wraps the same `client/` build for the native Circles app — see [`MOBILE-APP.md`](./MOBILE-APP.md)

**Backend** (`server/`)
- Node.js 20 + Express 4
- Socket.IO server
- SQLite (`chatrio.db`) for persistence
- Groq SDK (`groq-sdk`) + `dotenv`
- `server/circles-local/` — the Circles proximity‑chat service

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
│   │   ├── Chat.tsx        # Real-time chat UI + Socket.IO client
│   │   ├── push.ts         # Native push-notification registration (Android app only)
│   │   ├── pages/          # About, Contact, Privacy, Terms, News, Circles, etc.
│   │   └── data/           # posts.ts (blog metadata), posts-content.ts (post bodies)
│   ├── android/             # Generated Capacitor Android project — see MOBILE-APP.md
│   ├── assets/              # Icon/splash source for `npx capacitor-assets generate`
│   ├── capacitor.config.ts
│   └── build/              # Pre-rendered production output
├── server/                 # Express + Socket.IO backend
│   ├── index.js            # Matching engine, fallback bot, socket events
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

> **Note:** The client currently connects to the production socket server at `https://api.chatrio.app` (see `client/src/Chat.tsx`). To test against your local backend, point that URL at `http://localhost:5050`.

---

## Content Pipeline (blog)

Posts are data‑driven, not per‑file:

1. Append post metadata (slug/title/excerpt/thumbnail/date/category) to `POSTS` in `client/src/data/posts.ts`.
2. Add the HTML body to `POST_CONTENT` (keyed by slug) in `client/src/data/posts-content.ts`.
3. New slugs must not collide with a blog category slug, and check existing posts (including roundups) before adding — near‑duplicate posts have caused AdSense flags.
4. To retire a post: remove it from both files, add a `POST_REDIRECTS` entry in `posts.ts`, and add a matching nginx 301 on the server.
5. Rebuild — the sitemap regenerates automatically via `prebuild`.
6. After content changes, refresh the reference-only backup with `node scripts/generate-blog-backup.js`.

Current production snapshot (2026‑07‑26): **176 posts**. The newest article is
[`Secure Attachment Style: 12 Signs in Online Relationships (2026)`](https://chatrio.app/blog/secure-attachment-style-signs-online-relationships-2026).
It completes the secure/anxious/avoidant attachment cluster and was deployed with
its full article asset, 1,200×630 hero, card/thumbnail variants, canonical metadata,
structured data, internal links, and sitemap entry.

---

## Build & Deploy

> ⚠️ **Do not use `npm run build`.** Its `postbuild` hook runs `react-snap`, which is unreliable on this project — its headless crawl can crash outright partway through (a Suspense/lazy‑route hydration race that reliably reproduces, at a different page each run) instead of just producing empty shells. Use the recipe below instead, which replaces `react-snap`'s crawl step with `scripts/prerender-all-stable.js`, a custom puppeteer‑based prerenderer that waits for real rendered content (not just network‑idle) before snapshotting each page.

```bash
# 1. Quit Google Chrome fully first — required, or the prerender step
#    contends with your open browser for Chrome/puppeteer resources.
osascript -e 'quit app "Google Chrome"'

# 2. Regenerate the sitemap + route list
node scripts/generate-sitemap.js

# 3. Production webpack build only — skips react-snap's postbuild hook
cd client && CI=false npx react-scripts build && cd ..

# 4. Prerender every route to static HTML
node scripts/prerender-all-stable.js
```

After it finishes, verify the log shows every route crawled with no thrown errors (currently `crawled 191 out of 191`: 176 posts plus 15 static/category routes), followed by successful hydration checks for `/`, `/blog`, a representative article, and `/about`. The hydration checks fail the build on React hydration errors, missing content, or lab CLS above `0.05`. Also confirm that no empty shells remain in the output:

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

### Production routing and SEO safeguards

The active nginx site is `/etc/nginx/sites-available/chatrio`. `nginx-seo-fixes.conf` is a reference snippet for the required rules; it is not a complete configuration file and must not replace the active site wholesale.

- Historical article aliases and legacy `/blog/post/{slug}` URLs return `301` to their canonical `/blog/{slug}` URL.
- Known blog pages are served from prerendered `index.html` files; unknown `/blog/*` URLs return a real HTTP `404` instead of the homepage SPA shell.
- `client/public/404.html` provides `Page Not Found` metadata and `noindex` for nginx error responses.
- Retired `/stories/*` and `/web-stories/*` routes return `410 Gone`.
- Blog hero and inline images have explicit dimensions, lazy loading where appropriate, and async decoding to reduce layout movement.
- Sitemap image URLs are normalized to `https://chatrio.app/images/...` (never `https://chatrio.app//images/...`).
- Article content is marked as an AdSense exclusion area to prevent automatic ad placement inside the article body.
- A `Content-Security-Policy` header (enforcing, not report-only) is set in the nginx config — `script-src`/`connect-src`/`frame-src` are scoped to the actual third parties in use (Google Tag Manager, AdSense/`googlesyndication`, `api.chatrio.app` incl. `wss://`). Adding a new third-party script or API host requires widening this policy or it will be silently blocked.

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

The matching engine lives in `server/index.js` and keeps all state in memory:

1. A user emits `ready_to_chat` and joins the **waiting** pool.
2. `tryMatch()` pairs two waiting users who share a topic (or any two users if no topics are set).
3. If still waiting after `BOT_WAIT_MS` (3s), a **fallback partner** is connected so the user isn't stuck, and it disconnects after `BOT_STAY_MS` (5s).
4. `next` leaves the current partner and re‑enters the queue; `disconnect_request` returns the user to idle.

### Key Socket.IO events

| Client → Server | Server → Client |
| --- | --- |
| `set_username`, `set_topics` | `online`, `waiting_count` |
| `ready_to_chat`, `next` | `waiting`, `partner_found`, `idle` |
| `message`, `image`, `typing` | `message`, `image`, `partner_typing` |
| `delivered`, `disconnect_request` | `msg_sent`, `msg_delivered`, `friend_left` |

---

## Environment Variables

| Variable | Location | Description |
| --- | --- | --- |
| `PORT` | server | Port the Express/Socket.IO server listens on |
| `FRONTEND_ORIGIN` | server | Allowed CORS origin for the frontend |
| `GROQ_API_KEY` | server | Groq API key (keep secret — never commit) |

---

## License

Private project. All rights reserved © Chatrio.
