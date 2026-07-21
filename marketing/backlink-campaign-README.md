# Backlink campaign — status & how to continue

Tracker: `marketing/backlink-targets-master.csv` (source of truth for status per directory)
Copy to paste into forms: `marketing/directory-submission-copy.md`
Raw submit URLs: `marketing/backlink-submit-urls.csv`

## How this works (read before resuming)

Claude cannot create new accounts anywhere (hard rule, not a preference) — no entering a password, no "Continue with Google" to register on a new site, no email/SMS verification. So the workflow each session is:

1. You open the directory's signup/login page yourself and log in (Google/GitHub SSO is usually fastest).
2. Tell Claude which site you're logged into.
3. Claude takes over the browser tab and fills in / submits the actual listing (using the copy in `directory-submission-copy.md`), then updates the CSV status.

If a site turns out to require something Claude can't do alone (SMS PIN, phone-based lead-gen form, manual review gate), it gets marked `blocked` in the CSV with a note on what's needed from you.

## Done as of 2026-07-13

- **Dev.to** — published a real technical article ("Pre-rendering a 160-post React SPA with react-snap: the gotcha that silently breaks your SEO") with a live link back to chatrio.app: https://dev.to/vijay_rathod_b9db92cb65f8/pre-rendering-a-160-post-react-spa-with-react-snap-the-gotcha-that-silently-breaks-your-seo-3ino
- **Crunchbase** — company profile submitted (name, description, website, contact email, founded date, industries). Queued for Crunchbase's review, may take a few minutes/hours to go live.
- **Wikidata** — item created: https://www.wikidata.org/wiki/Q140529478 (Chatrio). Statements: instance of = website, official website = https://chatrio.app, inception = 2025. Left country/HQ blank (no real address to cite). Notability risk: no third-party press coverage yet, so a patroller could flag/delete it later — worth monitoring, not guaranteed to stick.
- **Scoop.it** — 2 scoops published to topic https://www.scoop.it/topic/vijay-babubhai-doba: chatrio.app homepage and chatrio.app/blog index, each with relevant tags and an insight note per Variant C in the copy doc.
- **TheSaaSDirectory** — listing submitted 2026-07-14, awaiting moderation approval. HQ set to Surat, Gujarat, India (per your input). Categories: Communications and Media Software, Social Networks Software, Live Chat Software (only picked categories that were an honest fit, not padded to hit 5). Founder/CEO fields left blank (no confirmed name to enter).
- **Substack** — publication created 2026-07-14 at https://vijay83061.substack.com, renamed to "Chatrio" (description + Technology/Culture categories). First post "Welcome to Chatrio: Free, Anonymous Random Chat" published with links back to chatrio.app and chatrio.app/blog.
- **Diigo** — 2 bookmarks added to vijay83061 library: chatrio.app homepage + a strong blog post, both tagged and annotated.
- **Pearltrees** — 2 pearls added to vijay83061 account: chatrio.app homepage + chatrio.app/blog.
- **Feedspot** — chatrio.app/blog submitted to publisher directory (free tier), confirmed.
- **PR.com** — press release "Chatrio Launches Circles..." submitted at free ($0) visibility tier, hook = Circles launch + 160+ blog posts, industry Technology: Internet. Contact name/phone were entered by you directly (not fabricated by Claude).
- **Indie Hackers** — product page created at indiehackers.com/product/chatrio with full details (motivation, founder info, tags); build-in-public intro post published and live.
- **AlternativeTo** — app page live at alternativeto.net/software/chatrio/, awaiting the site's own 24h moderation approval. Tags: anonymous-chat, random-chat, chatroulette-alternative. Also linked 3 alternatives (Chatroulette, OmeTV, OmegleMe) since apps without alternatives listed are "almost invisible" per the site's own warning.

## Done as of 2026-07-19

- **Startup Fame** — profile created at startupfa.me/dashboard/chatrio (Variant A copy, corrected from the tool's own AI-generated draft which overstated Circles as already-shipped; HQ set to India; "I am the founder" checked for the extra dofollow link). Embedded the "Featured on Startup Fame" badge in chatrio.app's footer (`client/src/App.tsx`), deployed it (see build fix below), and re-ran Startup Fame's verification — **passed**, "will be reviewed soon." Logo/screenshot not uploaded (see file upload note below).
- **Deploy pipeline fixed** — the site had a real, unrelated deploy-blocking bug (a Suspense race in `App.tsx` causing react-snap to freeze empty fallback HTML into the static build → hydration mismatch → fatal crash on random pages). A parallel session diagnosed this and left `scripts/prerender-all-stable.js` as the fix, which restarts Chrome every 10 routes and waits for real content before snapshotting instead of racing it. Used that script (not `npm run build`/react-snap) to get a clean 175/175 crawl with zero empty shells, then rsynced to chatrio.app. **Going forward, always build with**: `cd client && npx react-scripts build && cd .. && node scripts/prerender-all-stable.js` — not `npm run build`.
- **SaaSHub** — Chatrio already had an auto-generated listing (saashub.com/chatrio) with an inaccurate, generic "chat widget" description (not written by Claude, likely an auto-scrape). Submitted an edit suggestion correcting the description to Variant B copy and adding HQ (Surat, Gujarat, India); pending moderator approval. Categories and the competitor "alternatives" list were already accurate.
- **Google Disavow — DONE.** Claude couldn't upload the file (Chrome blocks extensions from setting file inputs; tried both the file_upload tool and a JS DataTransfer workaround), so you uploaded `marketing/disavow-chatrio.txt` yourself at search.google.com/search-console/disavow-links. Confirmed live: "7 domains and 0 URLs are disavowed", uploaded 2026-07-19 5:41:47 PM UTC+2, for property https://chatrio.app/.

### File upload limitation (applies going forward)

Any directory step that needs a logo/screenshot/file upload can't be automated by Claude in this environment — Chrome blocks extensions from setting file inputs. Text fields, dropdowns, and checkboxes all work fine. Expect to upload images yourself when a listing calls for one.

### Medium-priority sweep, 2026-07-19

Went through all 20 medium-priority sites without logging into anything new. Result: almost all of them need you.

- **Dead domains**: StartUs (startus.cc), Launched.io — neither resolves anymore.
- **Bad fit, skipped**: Business Software (B2B enterprise software directory, not consumer chat), TrustMRR (MRR-based marketplace for selling revenue-generating SaaS, not a general directory).
- **Paid-only, skipped**: New SaaSly ($20 one-time, no free tier). Makerthrive also pivoted to paid sponsorships only.
- **Blocked on login/account creation**: F6S, Open Launch, Promote Project, FiveTaco, BusinessHunt (the working domain is .co, not .com), Uneed (free preview works, but saving needs an account), 10words (needs a password).
- **Blocked on file upload**: Today Launches (mandatory logo), StartupTracker (mandatory logo — also has no Chatrio Twitter/X handle to give it, which is separately required).
- **Blocked on other things**: OpenPR (explicitly rejects Gmail addresses, needs a real name — you'll need to submit this one yourself with a non-Gmail email), StartupBuffer (Cloudflare bot-check), Feedough (submission page 404s, no working link found), Indie Hacker Tools (submission page renders blank/broken), Startup Stash (submit button doesn't do anything).

Net: nothing left in medium priority that Claude can push forward alone. See the CSV for the full per-site notes.

## Blocked (need you, not Claude)

- **SourceForge** — project created (`chatrio`), but publishing requires phone verification (SMS PIN). Go to sourceforge.net, finish the phone verification dialog yourself, then tell Claude to finish the project details and publish.
- **Product Hunt / BetaList** — need screenshots + demo video assets first, and a 2-3 week account warm-up before launch day. Not a quick-win; revisit as a planned launch, not a drive-by submission.
- **Taalk** — submission form is a Google Form that requires signing into a Google account to fill out ("Sign in to continue"). Log into Google yourself, then Claude can fill and submit.
- **Slant** — site's own search endpoint returns a 500 error as of 2026-07-14; no existing "best Omegle alternative" question found to answer. Retry later, this is Slant's bug not ours.

## Skipped (bad fit, not worth forcing)

- **SourceForge's free listing path** was actually skipped in favor of the phone-verified project route above — the free "Create a Project" flow is for open-source code hosting (git/downloads), which doesn't fit a closed-source product without faking a project.
- **WebWiki** — no working self-serve submission path found (old `/addurl.html` pattern 404s); domain search also 404s. Not pursued further; low priority (DR 60) so not worth more digging unless it resurfaces as valuable.
- **Tech.co** — no self-serve submission form found; it's an editorial news site, not a directory. Would need a journalist pitch/outreach email instead — treat like the listicle outreach batch, not a quick form fill.

## Remaining — todo (in priority order)

High priority:
- LinkedIn company page — https://www.linkedin.com/company/setup/new/ (explicitly on hold per your instruction, revisit when ready)
- Slashdot — https://slashdot.org/submission (not logged in as of 2026-07-14)

Medium priority: exhausted for now — see "Medium-priority sweep, 2026-07-19" above. Everything left needs you to either log in, submit with your own real email/name, or is a dead/bad-fit site not worth pursuing.

Low priority:
SideProjectors, Build Voyage, AlphaDigits, Fazier, Microlaunch, PitchWall, PeerPush, OpenHunts, What Launched Today, Tiny Launch.

Manual / not a form submission:
- Listicle outreach batch (10 targets) — cold outreach to existing "best Omegle alternatives 2026" posts. Not started; needs target research + drafted pitch emails (agreed earlier as a separate deliverable, not yet done).
- Reddit (r/omegle, r/chatting, r/MakeNewFriendsHere) — genuine participation only, 90/10 rule, no bulk posting.

## Next session starting point

High priority is down to Slashdot (LinkedIn on hold). Log into Slashdot, then say it's ready — Claude will fill in and submit using `directory-submission-copy.md`, then update the CSV.

Medium priority is exhausted — what's left needs you to log in, submit with your own name/email, or isn't worth pursuing (dead/bad-fit sites). Low priority (SideProjectors, Build Voyage, AlphaDigits, Fazier, Microlaunch, PitchWall, PeerPush, OpenHunts, What Launched Today, Tiny Launch) hasn't been attempted yet — worth a pass next.

Disavow and the Startup Fame badge deploy are both done — nothing outstanding on either.
