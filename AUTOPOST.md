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
- **Schedule:** `0 9 * * *` (daily 9am UTC) via `crontab -l` on the VPS
- **Logs:** `/root/chatrio-deploy/logs/deploy-*.log`
- **Working checkout:** `/root/chatrio-deploy/repo` (separate from any local/dev checkout)

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

## Gotchas discovered while building this

- **`client/build/` is git-tracked in this repo.** A `git reset --hard` wipes any locally-built-but-uncommitted output. Not a problem for real cron runs (which always rebuild from source), but matters if you're testing manually.
- **`npx react-scripts build` skips npm's `prebuild` hook.** That hook is what normally runs `generate-blog-content.js` and `audit-blog.js`. `deploy.sh` calls them explicitly instead — if you ever change the manual build recipe in `README.md`, keep that in mind.
- **Puppeteer:** `client/package.json` now has a direct `puppeteer` dependency (modern version) instead of relying on `react-snap`'s ancient bundled copy — the old one predated browser support for computing reserved image space from `width`/`height` attributes, which caused real (and false-positive) CLS failures during testing.
- **`PRERENDER_CHROME_PATH` env var:** `prerender-all-stable.js` uses your real installed Chrome on macOS by default; on the VPS, `deploy.sh` points it at puppeteer's own downloaded Chrome via this env var.

## If something breaks

1. Check `/root/chatrio-deploy/logs/` on the VPS for the most recent failed run.
2. The most likely failure point is the QA gate (step 2) — it fails loudly and safely if a post is missing metadata, an image, or has a broken internal link, rather than deploying broken content.
3. The cloud routine's own runs are visible on its dashboard (link above).
