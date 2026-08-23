# Autodivyesh — Blog Writer Routine (Divyesh account)

A second, independent cloud routine that writes daily blog posts for chatrio.app, running under the **Divyesh Dhanani** Claude account instead of the original `vijay83061@gmail.com` account documented in `AUTOPOST.md`.

```
07:00 UTC  Autodivyesh cloud routine writes 1 post → commits → pushes to GitHub main
                                                        │
09:00 UTC  VPS cron pulls latest → builds → prerenders → deploys → notifies search engines
```

The build/deploy half of the pipeline (VPS cron, `deploy.sh`, IndexNow, GSC resubmit) is unchanged — see `AUTOPOST.md` sections 2 and 3 for that. This doc only covers the content-writer half.

## Routine details

- **Name:** Autodivyesh - Chatrio daily blog post writer (1/day)
- **Trigger ID:** `trig_01LxeEgKzuatsWYV9btgzaN2`
- **Owner account:** Divyesh Dhanani (not vijay83061 — routines are per-account and not shared)
- **Model:** `claude-haiku-4-5-20251001`
- **Schedule:** `0 7 * * *` (07:00 UTC daily)
- **Repo:** `https://github.com/vijaydoba/Chatrio.app`
- **Dashboard:** https://claude.ai/code/routines/trig_01LxeEgKzuatsWYV9btgzaN2

Each run it:
1. Pulls the repo fresh
2. Writes **exactly 1** new post into `client/src/data/posts.ts` (metadata) and `client/src/data/posts-content.ts` (body HTML), matching existing tone/structure
3. Reuses existing images only — never invents new filenames — and verifies all 6 responsive variants exist for whichever image it picks
4. Runs the same QA gate as the original writer (`generate-sitemap.js` → `generate-blog-content.js` → `audit-blog.js`) and will not commit if it fails
5. Commits and pushes straight to `main`

To edit its instructions, model, schedule, or post count, use `/schedule` while logged into the Divyesh account, or the dashboard link above.

## Old routine status

The original routine (`trig_01QTosZaDhtkkU6ivwVmiyQQ`, 7 posts/day, `vijay83061` account) is currently **disabled** — the vijay83061 account ran out of credit. So this Autodivyesh routine is the only one actually writing posts right now: 1/day.

If credit is later topped up on vijay83061 and that routine gets re-enabled (manually or automatically), you'd be back to two writers pushing to `origin/main` around the same time (up to 8 posts/day combined, plus possible push conflicts). Worth checking https://claude.ai/code/routines on that account before assuming it's still off.

## Gotchas inherited from the original setup

See `AUTOPOST.md`'s "Gotchas discovered while building this" section — the build/deploy side (npm ci, prerender, VPS clock, node_modules tracking) is identical and unaffected by which account writes the content.
