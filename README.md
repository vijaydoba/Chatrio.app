# Chatrio

**Chatrio** is an anonymous 1‑on‑1 random chat web app — talk to strangers instantly, no sign‑up required. It pairs two online users in real time over WebSockets, with optional topic‑based matching, and also ships a full SEO content layer (blog + AMP web stories) under the same domain.

🌐 **Live:** [chatrio.app](https://chatrio.app)

---

## Features

- **Anonymous random chat** — get matched with a stranger 1‑on‑1, no account or phone number needed.
- **Real‑time messaging** — text, images, typing indicators, and delivery receipts over Socket.IO.
- **Topic‑based matching** — users sharing at least one topic are matched first; otherwise anyone is paired.
- **Skip / Next** — instantly leave the current partner and find a new one.
- **Live online & waiting counts** — broadcast to all connected clients.
- **Smart fallback bot** — if no human is available within a few seconds, a placeholder partner is connected so the user is never left waiting, and leaves shortly after.
- **SEO content layer** — a React blog, category pages, and 200+ AMP web stories, all pre‑rendered to static HTML for search engines.
- **PWA‑ready** — service worker registration, manifest, and dark/light theme.

---

## Tech Stack

**Frontend** (`client/`)
- React 19 + TypeScript (Create React App)
- React Router 7
- Socket.IO client
- `react-helmet-async` for per‑page meta/SEO
- `react-snap` for static pre‑rendering of routes

**Backend** (`server/`)
- Node.js 20 + Express 4
- Socket.IO server
- Groq SDK (`groq-sdk`) + `dotenv`

**Tooling** (`scripts/`)
- Sitemap generation, AMP web‑story generation, and IndexNow/Google notification helpers.

---

## Project Structure

```
chatrio/
├── client/                 # React + TypeScript frontend (CRA)
│   ├── public/             # Static assets, branding, manifest
│   ├── src/
│   │   ├── App.tsx         # App shell, routing, blog/SEO pages
│   │   ├── Chat.tsx        # Real-time chat UI + Socket.IO client
│   │   ├── pages/          # About, Contact, Privacy, Terms, Stories, News, etc.
│   │   └── data/           # posts.ts (blog), stories.ts (web stories)
│   └── build/              # Pre-rendered production output
├── server/                 # Express + Socket.IO backend
│   └── index.js            # Matching engine, fallback bot, socket events
├── scripts/                # Sitemap & web-story generators, SEO notifiers
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

## Build & Deploy

```bash
cd client
npm run build
```

The build pipeline runs automatically:
- **prebuild** — generates the sitemap and AMP web stories
- **build** — Create React App production build
- **postbuild** — pre‑renders routes with `react-snap` and regenerates web stories into `build/web-stories`

Output is written to `client/build/`, served as a static site. The backend (`server/`) is deployed separately as a Node service.

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
