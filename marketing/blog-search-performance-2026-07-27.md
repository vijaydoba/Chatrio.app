# Blog search-performance baseline — 2026-07-27

Source: Google Search Console property `https://chatrio.app/`.

This is the baseline taken before the hydration, content-freshness, and internal-link changes made on 2026-07-27. Search Console data lags behind production, so the report dates below end on July 24 or July 25.

## Search performance

| Window | Clicks | Impressions | CTR | Average position |
|---|---:|---:|---:|---:|
| 7 days | 41 | 142 | 28.9% | 10.9 |
| 28 days | 160 | 617 | 25.9% | 19.1 |
| 3 months | 236 | 2,322 | 10.2% | 17.0 |

The 7-day results are dominated by branded searches. The strongest non-brand opportunities with enough signal to watch are:

- Omegle alternatives and “what happened to Omegle” queries.
- Random/anonymous chat apps for India.
- “Make friends online, not dating.”
- Anonymous chat without a phone number.

Do not interpret the current legacy `/blog/post/...` rows as separate content. The URL migration happened during these reporting windows, and those URLs now redirect to `/blog/{slug}`. Allow Google time to consolidate the signals before changing slugs or creating overlapping posts.

## Indexing and enhancements

- `/sitemap.xml`: **Success**, submitted and last read July 26, 2026.
- Discovered sitemap pages: **189**.
- Breadcrumbs: **14 valid**, **0 invalid**.
- The six “Google chose different canonical” examples are retired `/web-stories/` URLs last crawled June 27. They are already covered by the retired-story cleanup and removal process; they are not current blog canonical conflicts.
- The broad Page Indexing report was last updated July 10, before the current sitemap, redirects, 410 responses, and manual indexing work. Do not use that stale total to judge the July 26 deployment.

## Core Web Vitals

- Device: mobile.
- Affected group: **22 URLs**.
- Issue: **CLS greater than 0.1**.
- Group CLS: **0.17**.
- Example URL: `https://chatrio.app/`.
- Validation state at baseline: **Not Started**.

The 2026-07-27 code change addresses two concrete causes:

1. Content routes no longer sit inside a Suspense boundary that can replace prerendered HTML during hydration.
2. Blog articles seed their first client render from the already-prerendered article body instead of temporarily replacing it with “Loading article…”.

The stable prerender script now performs representative post-build hydration checks and fails on React hydration errors, incomplete content, or lab CLS above 0.05.

## Content changes made from the data

- Strengthened bidirectional links between secure, anxious, and avoidant attachment articles.
- Updated stale 2025 interface copy to 2026 on active articles whose metadata already targets 2026.
- Removed unsupported audience-size, survey, usage-share, and scoring claims from the India, Latin America, and random-chat comparison pages.
- Replaced internal links to retired aliases with direct canonical article links.
- Added an audit failure for future internal links that unnecessarily pass through a redirect.

## Next review

Review between **2026-08-03 and 2026-08-10**:

1. Confirm Google is reporting canonical `/blog/{slug}` URLs instead of legacy `/blog/post/{slug}` URLs.
2. Compare CTR and position for India chat-app and Omegle-alternative queries.
3. Check whether new attachment-cluster pages have begun receiving impressions.
4. Recheck the mobile CLS group. Field data uses a rolling window, so it will not clear immediately after deployment.
5. Only start “Validate fix” in Search Console after the corrected frontend is deployed and live checks show no hydration error.

