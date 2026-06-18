# BrewLog ☕

精品咖啡探索与记录平台 — A specialty coffee discovery and review platform.

Document niche coffee beans, log café visits, and track tasting experiences.

## What It Does

- **咖啡豆库 Bean Library** — searchable catalog of specialty coffee beans (origin, processing method, roaster, tasting notes), with discrete origin/roaster filters and a "相似咖啡豆 Similar Beans" suggestion on each bean
- **咖啡馆地图 Café Map** — interactive map of visited cafés, color-coded by rating, with marker clustering and city/rating/brew filters (default view: Guangzhou)
- **记录探店 Log a Visit** — structured form to rate café experiences across overall, bean quality, barista skill, and ambiance
- **探店记录 Visit History** — keyset-paginated timeline of all visits
- **个人主页 + 关注动态 Profiles & Feed** — user profiles with stats, a follow system, and an activity feed (`/feed`) of people you follow
- **咖啡之旅 Coffee Crawls** — multi-café trip reports (`/crawls`)
- **评论与点赞 Comments & Reactions** — flat comments and a 👍 like on visits, beans, and crawls
- **通知 Notifications** — in-app nav bell for new followers, follow-backs, and comments/reactions on your content (`/notifications`)
- **数据导出 Data Export** — download your own visits + beans as JSON or CSV from `/settings`
- **排行榜 Leaderboards** — most origins explored, most cafés visited (`/leaderboard`)

## Tech Stack

| Layer       | Technology              | Notes                          |
| ----------- | ----------------------- | ------------------------------ |
| Framework   | Next.js (App Router)    | TypeScript                     |
| Database    | Turso (via @libsql/client) | Cloud SQLite; local dev uses a file database — no account needed |
| Auth        | Auth.js (NextAuth)      | Google + GitHub + email/password; one-click dev login locally |
| Map         | Leaflet + react-leaflet-cluster | OpenStreetMap tiles, no API key |
| Image storage | Cloudflare R2         | Local-disk fallback in dev; free tier |
| Styling     | Tailwind CSS            |                                |
| Testing     | Playwright              | e2e suite against a prod build |
| Hosting     | Vercel                  | Free tier; push to `main` auto-deploys |

## Quick Start (local, zero cloud accounts)

```bash
npm install
npm run db:reset    # creates data/brewlog.db from schema.sql + seed.sql
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The committed `.env.local` default
(`TURSO_DATABASE_URL=file:./data/brewlog.db`) keeps everything on local disk.

### Database scripts

| Script             | What it does                                                |
| ------------------ | ----------------------------------------------------------- |
| `npm run db:init`  | Apply `schema.sql` (safe to re-run — `CREATE TABLE IF NOT EXISTS`) |
| `npm run db:seed`  | Apply schema + `seed.sql` mock data                          |
| `npm run db:reset` | Delete the local db file, then schema + seed (file: URLs only) |

### Verification

```bash
npm run verify      # typecheck → lint → build → Playwright e2e (isolated data/test.db)
```

## Going to Production

Cloud setup steps that need a browser (Turso account, Vercel, etc.) are documented as
self-contained guides in [`docs/setup/`](docs/setup/README.md).

1. [`docs/setup/turso-setup.md`](docs/setup/turso-setup.md) — create the cloud database
2. [`docs/setup/vercel-deploy.md`](docs/setup/vercel-deploy.md) — deploy to Vercel
3. [`docs/setup/r2-setup.md`](docs/setup/r2-setup.md) — photo storage (required before uploading photos on the deployed site)
4. [`docs/setup/oauth-setup.md`](docs/setup/oauth-setup.md) — real Google/GitHub login (required for posting on the deployed site)
5. [`docs/setup/password-auth.md`](docs/setup/password-auth.md) — optional email/password login (Phase 5; run `migrate:phase5` before deploy, plus the `reset-password` helper). Needs no new cloud service or env var beyond the already-required `AUTH_SECRET`
6. [`docs/setup/custom-domain.md`](docs/setup/custom-domain.md) — optional custom domain

Schema changes ship as additive, idempotent `npm run migrate:phaseN` scripts run against
prod **before** the dependent code deploys (e.g. Phase 6's `migrate:phase6` adds the
`comments` / `reactions` / `notifications` tables). See the full migration order in
[`docs/setup/vercel-deploy.md`](docs/setup/vercel-deploy.md). All env vars are documented in `.env.example`.

## Project Structure

```
brewlog/
├── CLAUDE.md          # Instructions for Claude Code
├── README.md          # This file
├── schema.sql         # Database schema (source of truth)
├── seed.sql           # Mock data (Guangzhou-centered)
├── docs/setup/        # Paste-into-Claude setup guides for cloud services
├── scripts/           # init-db.mjs and friends
├── tests/             # Playwright e2e suite
├── src/
│   ├── app/           # Pages and API routes
│   ├── components/    # Reusable UI components
│   ├── lib/           # db client, queries/, bilingual terms
│   └── types/         # TypeScript type definitions
└── .env.local         # Database credentials (gitignored)
```

## Language

UI is in Simplified Chinese (简体中文). Coffee terminology is bilingual (中文 English),
e.g. "水洗 Washed", "花香 Floral" — Chinese first. Bean and roaster names stay in their
original language. The database stores canonical English values for closed lists
(processing method, roast level, brew method); display labels live in `src/lib/terms.ts`.

## Roadmap

- **Phase 1** ✅ — Private coffee journal (MVP): bean library, café map, visit logging, visit history
- **Phase 2** ✅ — Photos and polish: image uploads (Cloudflare R2 with local-disk dev fallback), dashboard with personal stats, map filters (city / rating / brew method), café + visit detail pages
- **Phase 3** ✅ — Multi-user: Auth.js login (Google + GitHub, one-click dev login locally), `user_id` data model with migration script, user profile pages, custom-domain guide
- **Phase 4** ✅ — Social and discovery: public-read site, follow system + activity feed (`/feed`), coffee crawls (`/crawls`), leaderboards (`/leaderboard`), shareable links, nearby-café search
- **Phase 5** ✅ — Account management and CRUD: full bean create/edit/delete, email/password login with open registration (`/register`), account settings + unique display names (`/settings`), visit edit/delete
- **Phase 6** ✅ — Engagement and reach: in-app notifications (nav bell → `/notifications`, with dismiss + clear-all), flat comments + 👍 reactions on visits/beans/crawls, richer discovery (origin/roaster filters, "similar beans", map clustering), self-service JSON/CSV data export, and keyset pagination for `/feed` + `/visits`. Account hardening (rate-limiting, OAuth email verification) and PWA/offline logging remain deferred. See `CLAUDE.md` for details.

## Current Status

**Phase 6 complete — the site is public and social.** Anyone can browse beans, cafés, visits, profiles, crawls, and the leaderboard without an account; logging in unlocks the personal dashboard, visit logging + editing, bean create/edit/delete, photo uploads, follows + the activity feed, crawl authoring, comments + 👍 reactions, in-app notifications, and self-service data export. Three sign-in methods: Google, GitHub, and email/password (open self-registration at `/register`); locally a one-click dev login covers all three users. Databases created before a given phase upgrade with the matching `npm run migrate:phaseN` script (additive, idempotent — see the migration order in [`docs/setup/vercel-deploy.md`](docs/setup/vercel-deploy.md)).
