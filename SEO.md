# Chatrio SEO

Living reference for chatrio.app's SEO setup: what's implemented, where it lives,
how it deploys, and what's still open. Last updated **2026-09-25**.

---

## Status at a glance

| # | Task | Status |
|---|------|--------|
| P0-1 | `/video-chat` in sitemap (indexable, prerendered) | ✅ Live |
| P0-2 | Taxonomy dedup — `/blog/tag/*` is the sole indexable taxonomy | ✅ Live |
| P0-3 | Clean ASCII category slugs (`chat-and-connection`, `mental-health`) | ✅ Live |
| P0-4 | Yearless post slugs (dropped stale `-2025`) + 301s | ✅ Live |
| P0-5 | Structured data (JSON-LD) across all page types | ✅ Live |
| P0-6 | GSC indexation audit | ✅ Done (via API) |
| P1-10 | Title/meta hygiene | ✅ Clean (auto-capped) |
| P2-11 | Core Web Vitals (gzip) | ✅ Live |
| P1-7 | Prune/consolidate thin posts | ⏳ Open (see below) |
| P1-8 | Topic clusters + internal linking | ⏳ Open |
| P1-9 | Country landing pages | ⏳ Open (strategic decision) |
| P2-12 | Backlinks | ⏳ Open (off-platform) |
| P2-13 | Tracking & iterate | ⏳ Open (ongoing; SEMrush deactivated) |

---

## Architecture

### Blog taxonomy
- **Tag hubs** (`/blog/tag/<slug>`) are the **one indexable taxonomy**. Gated at
  ≥3 posts & ≤50% coverage via `client/src/data/blog-topics.rules.js`
  (shared by the app and `scripts/generate-sitemap.js`).
- **Category filter views** (`/blog/<category>`) are `noindex,follow`, kept out of
  the sitemap, but still prerendered (no empty CSR shells). The 4 that collide
  with a same-named tag hub (love/romance/dating/relationships) also
  `canonical → /blog/tag/<slug>`.
- Category slug ↔ name mapping is centralized in `client/src/data/posts.ts`
  (`CATEGORY_TO_SLUG`, `SLUG_TO_CATEGORY`, `CATEGORY_CANONICAL_TAG`). Legacy
  space/encoded slugs still resolve in-app as a safety net.

### Slugs & redirects
- Post slugs are **yearless** where the content is evergreen (no `-2025` suffix).
- In-app redirects: `POST_REDIRECTS` in `client/src/data/posts.ts`
  (`<Navigate replace>` — covers SPA navigation).
- **True 301s live in nginx on the VPS**, NOT in this repo. `nginx-seo-fixes.conf`
  is a **reference doc only**; the live server block is
  `/etc/nginx/sites-available/chatrio` (symlinked from `sites-enabled`).
  When renaming a slug: add a 301 there AND grep the live config for existing
  redirects whose *target* is the old slug (they'll silently start 404ing).

### Structured data (JSON-LD)
- **Homepage:** `Organization` + `WebSite` (with `SearchAction`) + `FAQPage`
  (+ `HowTo`, `SoftwareApplication`).
- **Blog posts:** `BlogPosting` (headline, datePublished, dateModified, author,
  image, publisher, mainEntityOfPage) + `BreadcrumbList`.
- **Tag hubs:** `CollectionPage` (ItemList of posts) + `BreadcrumbList`.
- **Blog list / categories:** `Blog` + `BreadcrumbList`.
- Breadcrumb category links use `CATEGORY_TO_SLUG` (clean URLs, no `%`-encoding).

### Titles & meta
- Titles auto-capped to ≤60 chars and descriptions to ≤155 at render
  (`finalSeoTitle` / `finalSeoDescription`); enforced at build by
  `scripts/audit-blog.js`. No duplicate titles/descriptions across posts.

### Performance (Core Web Vitals)
- **gzip** compresses HTML/JS/CSS. NOTE: the chatrio nginx server block needs its
  own `gzip_types` — the http-level list is commented out, so without a scoped
  block only HTML compresses (main.js 530KB → 151KB once fixed).
- `/static/*` served `Cache-Control: immutable, max-age=1yr`.
- Heavy `maplibre-gl` chunk (~2MB) is code-split to `/circles` only.
- Blog images are lazy-loaded with explicit width/height (CLS-safe); hero is
  inline SVG/text (no LCP image to preload).

---

## Deploy

The site is a prerendered CRA build served by nginx from `/var/www/chatrio` on the
VPS (`185.190.142.158`).

- **To deploy:** push to `origin/main`, then run the deploy. The deploy cron only
  fires **09:00 UTC daily**, so trigger off-cycle manually:
  ```bash
  ssh -i ~/.ssh/loserbuddy-vps root@185.190.142.158
  cd /root/chatrio-deploy && nohup ./deploy.sh > manual-deploy.out 2>&1 &
  ```
- `deploy.sh`: `git reset --hard origin/main` → sitemap/blog-content/audit →
  `react-scripts build` → `prerender-all-stable.js` (~256 pages, ~8 min) →
  empty-shell guard → rsync → verify 200s → IndexNow + GSC sitemap resubmit.
- The empty-shell guard aborts (leaving the live site untouched) if any page fails
  to prerender — so a bad build never reaches production.
- `scripts/generate-sitemap.js` also updates `reactSnap.include` in
  `client/package.json` (what gets prerendered). Add new indexable routes to its
  `staticPages` list; use `sitemap: false` to prerender-but-exclude-from-sitemap.

---

## Remaining work

### P1-7 — Prune / consolidate thin posts
Data-backed plan ready in **`PRUNE-PLAN.md`**: 109 of 203 posts have 0 GSC
impressions over 90 days; after excluding 5 strategic (young) Circles/Blind Date
cluster posts, **104 prune candidates** remain. NOT auto-executed — each removal
needs a consolidation target + review (301 via `POST_REDIRECTS` + nginx, or 410
for pure filler). Data pulled via the GSC service account (`webmasters` scope,
`searchAnalytics.query`).

### P1-8 — Topic clusters + internal linking
Group posts into clusters pointing to a pillar page and to each other; every post
should link to a money page (`/chat`, `/video-chat`, `/circles`) with descriptive
anchor text. Non-destructive; can start anytime.

### P1-9 — Country landing pages
Dedicated `/chat/<country>` pages for high-intent markets. **Strategic decision
first** — domain authority is the current bottleneck; avoid filler.

### P2-12 / P2-13 — Backlinks & tracking
Off-platform (outreach) and ongoing monitoring. Not deployable code.

---

## Key files

| Path | Role |
|------|------|
| `client/src/data/posts.ts` | Post data, `POST_REDIRECTS`, category slug maps |
| `client/src/data/blog-topics.rules.js` | Tag-hub qualification rules (app + generator) |
| `client/src/pages/BlogPost.tsx` | `BlogPosting` + `BreadcrumbList` JSON-LD |
| `client/src/pages/BlogList.tsx` | Category views (noindex + canonical), `Blog` + breadcrumb |
| `client/src/pages/TagPage.tsx` | Tag hubs (`CollectionPage` + breadcrumb) |
| `scripts/generate-sitemap.js` | Generates `sitemap.xml` + `reactSnap.include` |
| `scripts/audit-blog.js` | Build-time SEO QA (titles, slugs, sitemap coverage) |
| `nginx-seo-fixes.conf` | **Reference** for the live nginx 301/gzip blocks |
