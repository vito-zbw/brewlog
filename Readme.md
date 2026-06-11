# BrewLog ☕

精品咖啡探索与记录平台 — A specialty coffee discovery and review platform.

Document niche coffee beans, log café visits, and track tasting experiences.

## What It Does

- **咖啡豆库 Bean Library** — searchable catalog of specialty coffee beans with origin, processing method, roaster, and tasting notes
- **咖啡馆地图 Café Map** — interactive map of visited cafés, color-coded by rating (default view: Guangzhou)
- **记录探店 Log a Visit** — structured form to rate café experiences across overall, bean quality, barista skill, and ambiance
- **探店记录 Visit History** — timeline feed of all visits

## Tech Stack

| Layer       | Technology              | Notes                          |
| ----------- | ----------------------- | ------------------------------ |
| Framework   | Next.js (App Router)    | TypeScript                     |
| Database    | Turso (via @libsql/client) | Cloud SQLite; local dev uses a file database — no account needed |
| Map         | Leaflet + OpenStreetMap | No API key needed              |
| Styling     | Tailwind CSS            |                                |
| Testing     | Playwright              | e2e suite against a prod build |
| Hosting     | Vercel                  | Free tier                      |

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
self-contained guides in [`docs/setup/`](docs/setup/README.md) — paste one into a new
Claude Code session and say "help me complete this process".

1. [`docs/setup/turso-setup.md`](docs/setup/turso-setup.md) — create the cloud database
2. [`docs/setup/vercel-deploy.md`](docs/setup/vercel-deploy.md) — deploy to Vercel

All env vars are documented in `.env.example`.

## Project Structure

```
brewlog/
├── CLAUDE.md          # Instructions for Claude Code
├── Readme.md          # This file
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
- **Phase 2** — Photos and polish: image uploads (Cloudflare R2), dashboard with stats, improved filters
- **Phase 3** — Multi-user: authentication (Auth.js), user profiles, custom domain
- **Phase 4** — Social and discovery: follow system, activity feed, public pages, shareable links

## Current Status

**Phase 1 (MVP) complete** — private use for 3 users (name dropdown, no authentication, no public access).
