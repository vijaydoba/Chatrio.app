# Autopost — Automated Daily Blog Pipeline

Two independent, always-on pieces work together to write, build, deploy, and index new blog posts every day with no manual steps. Neither depends on your local machine being on.

```
07:00 UTC  Cloud routine writes 7 posts → commits → pushes to GitHub main
                                                        │
09:00 UTC  VPS cron pulls latest → builds → prerenders → deploys → notifies search engines
```

## 1. Content writer (cloud routine)

Runs on Anthropic's cloud infrastructure, not your machine or the VPS.

- **Name:** Chatrio daily blog post writer
- **Schedule:** daily at 07:00 UTC
- **Dashboard:** https://claude.ai/code/routines/trig_01QTosZaDhtkkU6ivwVmiyQQ
- **Repo access:** GitHub App installed on `vijaydoba/Chatrio.app`

Each run it:
1. Pulls the repo fresh
2. Writes 7 new posts into `client/src/data/posts.ts` (metadata) and `client/src/data/posts-content.ts` (body HTML), matching existing tone/structure
3. Reuses existing images only — never invents new filenames — and verifies all 6 responsive variants exist for whichever image it picks
4. Runs the same QA gate the deploy script uses (`generate-sitemap.js` → `generate-blog-content.js` → `audit-blog.js`) and will not commit if it fails
5. Commits and pushes straight to `main`

To edit its instructions, list/run it, or change the schedule, use `/schedule` or the dashboard link above.

## 2. Build & deploy (VPS cron)

Runs on the Contabo VPS (185.190.142.158), independent of the cloud routine and your machine.

- **Script:** `/root/chatrio-deploy/deploy.sh`
- **Schedule:** `0 9 * * *` (daily 9am UTC) via `crontab -l` on the VPS — crontab starts with `CRON_TZ=UTC` so this always means 09:00 UTC regardless of the box's local timezone/DST
- **Logs:** `/root/chatrio-deploy/logs/deploy-*.log`
- **Working checkout:** `/root/chatrio-deploy/repo` (separate from any local/dev checkout)

⚠️ **Nothing deploys until it's on GitHub.** The VPS cron only pulls from `origin/main` — it never looks at your laptop. If you make local edits (new posts, image swaps, code changes), they sit invisible to the pipeline until you `git commit` + `git push origin main`. If you're not sure whether your local changes are live, run `git status` — untracked/modified files mean nothing has shipped yet.

Each run it:
1. `git fetch` + `git reset --hard origin/main` — if there's no new commit, skips straight to step 7 (still re-notifies search engines)
2. `generate-sitemap.js` → `generate-blog-content.js` → `audit-blog.js` — aborts the whole deploy if this QA gate fails, so broken content never reaches production
3. `npm ci --legacy-peer-deps` in `client/` (see gotcha below)
4. `CI=false npx react-scripts build`
5. `prerender-all-stable.js` — full static prerender + hydration/CLS check across every route
6. Empty-shell check, then `rsync` to `/var/www/chatrio`
7. `curl` checks on `/` and `/blog`
8. `node scripts/notify-google.js` (IndexNow — Bing/Yandex)
9. `node scripts/gsc-resubmit-sitemap.js` (Google Search Console — see below)

To force a full rebuild without waiting for a new commit: `FORCE_BUILD=1 /root/chatrio-deploy/deploy.sh`

## 3. Search Console indexing

`scripts/gsc-resubmit-sitemap.js` calls the Search Console API's `sitemaps.submit` — the real, Google-supported way to prompt a recrawl. (Google's separate "Indexing API" is restricted by policy to Job/Livestream pages; using it for blog posts gets silently ignored and risks a misuse flag, so this is the correct approach, not a workaround.)

- **GCP project:** `chatrio-gsc` (under `vijay83061@gmail.com`)
- **Service account:** `chatrio-gsc-indexer@chatrio-gsc.iam.gserviceaccount.com`, added as a **Full** user on the `chatrio.app` property in Search Console
- **Key location:** `/root/chatrio-deploy/secrets/gsc-service-account.json` on the VPS (root-only readable, `chmod 600`, never committed to git)

### What "indexed" actually means per deploy

Nothing is instant. Each deploy's notify step (`scripts/notify-google.js` + `scripts/gsc-resubmit-sitemap.js`) only *requests* a recrawl — it doesn't force immediate indexing:

- **Yandex** — real-time IndexNow ping, currently accepted (202).
- **Bing** — currently **broken**: `api.indexnow.org` and `www.bing.com` both reject every submission with `403 UserForbiddedToAccessSite`, meaning Bing isn't being notified of new posts at all right now. Needs re-verifying the IndexNow key for the site (likely the same key-mismatch class of issue as past IndexNow gotchas) — not yet fixed as of 2026-08-06.
- **Google** — does not support IndexNow at all. We resubmit `sitemap.xml` to Search Console instead, which just prompts Google to recrawl; actual indexing still typically takes hours to days on Google's own schedule, independent of how fast the deploy ran.

## Gotchas discovered while building this

- **`client/build/` is git-tracked in this repo.** A `git reset --hard` wipes any locally-built-but-uncommitted output. Not a problem for real cron runs (which always rebuild from source), but matters if you're testing manually.
- **`npx react-scripts build` skips npm's `prebuild` hook.** That hook is what normally runs `generate-blog-content.js` and `audit-blog.js`. `deploy.sh` calls them explicitly instead — if you ever change the manual build recipe in `README.md`, keep that in mind.
- **Puppeteer:** `client/package.json` now has a direct `puppeteer` dependency (modern version) instead of relying on `react-snap`'s ancient bundled copy — the old one predated browser support for computing reserved image space from `width`/`height` attributes, which caused real (and false-positive) CLS failures during testing.
- **`PRERENDER_CHROME_PATH` env var:** `prerender-all-stable.js` uses your real installed Chrome on macOS by default; on the VPS, `deploy.sh` points it at puppeteer's own downloaded Chrome via this env var.
- **VPS system clock was Europe/Berlin (CEST/CET), not UTC — fixed 2026-08-07 by changing the clock itself, not the crontab.** The 2026-08-06 fix (adding `CRON_TZ=UTC` as the first line of the crontab) did not actually work: Ubuntu 24.04's stock `cron` package (`cron` 3.0pl1, not `cronie`) does not implement `CRON_TZ` at all — confirmed via `strings /usr/sbin/cron`, which contains no reference to it. The line was silently accepted as a harmless env-var assignment with zero effect on scheduling, so `0 9 * * *` kept being evaluated in local time. On 2026-08-07 this caused the deploy to fire at 07:00 UTC (09:00 CEST) again, 21 minutes *before* that morning's 07:21 UTC writer push, so the site rebuilt on stale content and the day's 7 posts stayed unpublished until a manual `FORCE_BUILD=1` deploy. **Real fix:** ran `timedatectl set-timezone UTC` on the VPS so the system clock itself is UTC — `0 9 * * *` now unambiguously means 9am UTC with no dependency on an unsupported cron feature and no DST drift. The `CRON_TZ=UTC` crontab line is harmless but no longer load-bearing; don't rely on it if you ever touch this crontab again.
- **`server/node_modules/` was accidentally git-tracked** despite being in `.gitignore` — 948 stray files were committed before the ignore rule existed. Cleaned up 2026-08-06 (`git rm -r --cached`-equivalent). Don't re-add it; `npm ci` regenerates it on every deploy anyway.

## If something breaks

1. Check `/root/chatrio-deploy/logs/` on the VPS for the most recent failed run.
2. The most likely failure point is the QA gate (step 2) — it fails loudly and safely if a post is missing metadata, an image, or has a broken internal link, rather than deploying broken content.
3. The cloud routine's own runs are visible on its dashboard (link above).
4. If posts look "missing" but the cloud routine says it ran: check `git log origin/main` vs your local `git log` — the writer pushes straight to `main`, so a stale local checkout or an un-pushed local commit sitting alongside it can make things look broken when they're actually just not merged yet (this happened 2026-08-06 — see the timezone gotcha above for the other half of that incident).
