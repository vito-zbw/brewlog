# CLAUDE.md — Project Instructions for Claude Code

## Project Overview

**BrewLog** is a specialty coffee discovery and review platform — a bean database with café reviews attached. It documents niche coffee beans, logs café visits, and tracks tasting experiences.

The project is built in four phases, each delivering usable functionality. The entire stack uses free tiers only — no paid services.

## Roadmap

### Phase 1 — Private Coffee Journal (MVP)

A private web app for 3 users. No authentication — users identify themselves by selecting their name from a dropdown. Core functionality:

- **Bean Library**: searchable, filterable catalog of specialty coffee beans (origin, roaster, processing method, roast level, tasting notes)
- **Café Map**: interactive map with pins for every visited café, color-coded by rating, clickable for visit summaries
- **Log a Visit**: structured form to record a café experience — select/add café, select/add beans, rate across 4 dimensions, choose brew method, write notes
- **Visit History**: timeline feed of all visits, newest first

No authentication, no image uploads, no public access. `created_by` / `visited_by` is a plain text name selected from a fixed list: "Baiwei", "Friend1", "Friend2".

### Phase 2 — Polish and Photos

- Image uploads for beans (packaging photos), cafés (storefront/interior), and visits (latte art, brew setup)
- Store images in Cloudflare R2
- Dashboard home page with personal stats: total beans tried, total cafés visited, top-rated origins, brew method breakdown
- Improved search and filtering on map: by city, rating range, brew method
- UI refinements based on real usage feedback

### Phase 3 — Multi-User and Authentication

- Add Auth.js (NextAuth.js) for real user accounts with email or social login (Google/WeChat)
- Replace the text-based `created_by` field with a proper `user_id` foreign key
- User profile pages showing their visit history, favorite beans, and stats
- Deploy with a custom domain
- Database migration script to preserve existing data

### Phase 4 — Social and Public Discovery

- Follow system: follow other users to see their activity
- Activity feed: a social timeline of visits from people you follow
- Public café and bean pages with community ratings and reviews
- Shareable links for visit logs and bean profiles
- Café discovery: location-based search ("best pour-over near me")
- "Coffee crawl" feature: multi-café trip reports
- Community leaderboards (optional): most origins explored, most cafés visited

## Tech Stack

All services use free tiers. No paid resources required through Phase 4 at small-to-moderate scale.

| Layer            | Technology               | Free Tier Limits                     | Used From |
| ---------------- | ------------------------ | ------------------------------------ | --------- |
| Framework        | Next.js (App Router, TS) | —                                    | Phase 1   |
| Hosting          | Vercel                   | 100GB bandwidth/mo, serverless       | Phase 1   |
| Database         | Turso (cloud SQLite)     | 9GB storage, 500 databases, 25M rows | Phase 1   |
| DB Client        | @libsql/client           | —                                    | Phase 1   |
| Map              | Leaflet + OpenStreetMap  | Unlimited (open source)              | Phase 1   |
| Styling          | Tailwind CSS             | —                                    | Phase 1   |
| Image Storage    | Cloudflare R2            | 10GB storage, 10M reads/mo           | Phase 2   |
| Authentication   | Auth.js (NextAuth.js)    | Free (self-hosted)                   | Phase 3   |
| Package Manager  | npm                      | —                                    | Phase 1   |

### Why Turso instead of plain SQLite

Plain SQLite stores data in a file on disk, which doesn't work on Vercel (serverless functions run on temporary machines that don't keep files between requests). Turso is cloud-hosted SQLite — the SQL syntax and schema are identical, but the data lives on Turso's servers and is accessed over HTTP. The only code difference is using `@libsql/client` instead of `better-sqlite3`.

## Project Structure

```
brewlog/
├── CLAUDE.md
├── README.md
├── schema.sql                  # Database schema — single source of truth
├── seed.sql                    # Mock data for development
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Home / dashboard
│   │   ├── layout.tsx          # Root layout
│   │   ├── beans/
│   │   │   ├── page.tsx        # Bean library (list with search/filter)
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Bean detail page
│   │   ├── cafes/
│   │   │   └── page.tsx        # Café map view
│   │   ├── visits/
│   │   │   └── page.tsx        # Visit history feed
│   │   ├── log/
│   │   │   └── page.tsx        # Log a new visit form
│   │   └── api/
│   │       ├── beans/
│   │       │   └── route.ts    # GET (list/search), POST (create)
│   │       ├── beans/[id]/
│   │       │   └── route.ts    # GET (detail)
│   │       ├── cafes/
│   │       │   └── route.ts    # GET (list), POST (create)
│   │       └── visits/
│   │           └── route.ts    # GET (list), POST (create)
│   ├── components/             # Reusable UI components
│   ├── lib/
│   │   ├── db.ts               # Turso client connection
│   │   ├── terms.ts            # Bilingual value lists + display helpers
│   │   └── queries/            # All SQL queries as named functions (split by table, re-exported via index.ts)
│   └── types/
│       └── index.ts            # TypeScript type definitions
├── public/
├── .env.local                  # TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
└── package.json
```

## Database

### Connection

The Turso client is initialized in `src/lib/db.ts` using environment variables:

```typescript
import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
```

For local development, Turso supports an embedded replica mode or you can point to a remote database. Either way, set the env vars in `.env.local`.

### Schema

The schema is defined in `schema.sql` at the project root. This is the **single source of truth** for all table and column definitions. Always reference this file when writing database-related code.

There are 4 core tables:

- **beans** — the coffee bean catalog (origin, roaster, processing method, tasting notes)
- **cafes** — café locations (name, city, country, coordinates)
- **visits** — logged café experiences (ratings, brew method, notes), linked to a café
- **visit_beans** — join table linking visits to beans (many-to-many)

Key relationships:
- A visit belongs to one café (`visits.cafe_id → cafes.id`)
- A visit can involve multiple beans (via `visit_beans`)
- A bean can appear in multiple visits across different cafés

### Queries

- All SQL queries must be centralized in `src/lib/queries/` as named, exported async functions (one module per domain — beans/cafes/visits/… — re-exported through `src/lib/queries/index.ts`, so callers import from `@/lib/queries`). The directory split keeps each file under the ~200-line guideline.
- Use parameterized queries for all database operations (never interpolate values into SQL strings).
- The `@libsql/client` uses `db.execute()` for single queries and `db.batch()` for transactions.

```typescript
// Example: parameterized query with @libsql/client
const result = await db.execute({
  sql: 'SELECT * FROM beans WHERE origin_country = ?',
  args: [country],
});
```

### Seeding

The database should be seeded by running `seed.sql` through the Turso CLI or a setup script. Do NOT auto-seed on app startup — this avoids accidental data overwrites.

## Environment Variables

```
# Database (local dev uses file:./data/brewlog.db — no cloud account needed)
TURSO_DATABASE_URL=libsql://your-db-name-your-org.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# Photos (Phase 2+; all five required to activate R2, otherwise local-disk fallback)
R2_ACCOUNT_ID= / R2_ACCESS_KEY_ID= / R2_SECRET_ACCESS_KEY= / R2_BUCKET_NAME= / R2_PUBLIC_URL=

# Auth (Phase 3+; AUTH_SECRET is required everywhere)
AUTH_SECRET= / AUTH_GOOGLE_ID= / AUTH_GOOGLE_SECRET= / AUTH_GITHUB_ID= / AUTH_GITHUB_SECRET=
AUTH_DEV_LOGIN=true   # local one-click login — NEVER set on Vercel
AUTH_TRUST_HOST=true  # local `next start` only — not needed on Vercel
```

The full reference with placeholders lives in the committed `.env.example`; setup walkthroughs are in `docs/setup/`. Never commit `.env.local` to git.

## Coding Conventions

### General

- Use TypeScript everywhere. No `any` types — define proper interfaces in `src/types/index.ts`.
- Use named exports, not default exports (except for Next.js page components which require default export).
- Keep files focused and small. If a file exceeds ~200 lines, consider splitting.
- Use `async/await` over `.then()` chains.
- Handle errors gracefully. API routes should return proper HTTP status codes and `{ error: "message" }` bodies.

### Frontend

- Use Tailwind CSS exclusively for styling. Do NOT write custom CSS files.
- Design aesthetic: clean and minimal. Warm earth tones — browns, creams, soft greens — to match the coffee theme. No neon or loud colors.
- **Language: Simplified Chinese UI, bilingual coffee terminology.** All navigation, labels, buttons, headings, descriptions, and placeholder text must be in Simplified Chinese. Coffee-specific terminology (processing methods, roast levels, brew methods, tasting note tags) should display both Chinese and English, with Chinese first — e.g. "水洗 Washed", "花香 Floral", "V60". Bean names and roaster names stay in their original language (usually English).
- Responsive and usable on mobile (users will log visits from their phones).
- For interactive components (forms, dropdowns, modals), keep them simple. No heavy UI libraries — build with basic HTML elements + Tailwind.

### Map (Leaflet)

- Use `react-leaflet` for the café map.
- Pin color-coding by highest overall visit rating at that café:
  - Green: rating >= 4 (out of 5)
  - Yellow: rating 3
  - Red: rating <= 2
- Clicking a pin shows a popup with: café name, city, last visit date, overall rating, and a link to the full visit details.
- Default map center: Guangzhou, China.

### Forms

- The "Log a Visit" form should allow:
  - Selecting an existing café OR adding a new one inline
  - Selecting existing beans OR adding a new bean inline
  - Multiple beans per visit
  - Ratings on 1–5 scale for: overall, bean quality, barista skill, ambiance
  - Brew method selection from a predefined list
  - Free-text notes
- Form validation should happen client-side. Show inline error messages, not alerts.

### API Routes

- Use Next.js Route Handlers (`app/api/...`).
- Keep endpoints RESTful:
  - `GET /api/beans` — list all beans (with optional search/filter query params)
  - `GET /api/beans/[id]` — single bean detail with associated visits
  - `POST /api/beans` — create a bean
  - `GET /api/cafes` — list all cafés (with coordinates for map)
  - `POST /api/cafes` — create a café
  - `GET /api/visits` — list visits, newest first (with optional filters)
  - `POST /api/visits` — create a visit (including visit_beans entries)
- Return JSON responses with consistent shape: `{ data: ... }` on success, `{ error: "message" }` on failure.

## Predefined Value Lists

### Processing Methods
水洗 Washed, 日晒 Natural, 蜜处理 Honey, 厌氧发酵 Anaerobic, 湿刨 Wet-hulled, 其他 Other

### Roast Levels
浅烘 Light, 中浅烘 Medium-Light, 中烘 Medium, 中深烘 Medium-Dark, 深烘 Dark

### Brew Methods
意式浓缩 Espresso, V60, Chemex, 爱乐压 Aeropress, 法压壶 French Press, 虹吸壶 Siphon, 冷萃 Cold Brew, 摩卡壶 Moka Pot, 滴滤机 Auto Drip, 其他 Other

### Common Tasting Note Tags
Store as comma-separated strings. Display format is "中文 English". Common tags include but are not limited to:
果香 Fruity, 莓果 Berry, 柑橘 Citrus, 热带水果 Tropical, 核果 Stone Fruit, 巧克力 Chocolate, 坚果 Nutty, 焦糖 Caramel, 蜂蜜 Honey, 花香 Floral, 香料 Spicy, 泥土 Earthy, 木质 Woody, 草本 Herbal, 甜感 Sweet, 酒香 Winey, 烟熏 Smoky, 香草 Vanilla, 太妃 Toffee, 黄油 Butter

### Users (Phase 1–2 only, before auth)
Baiwei, Friend1, Friend2

## Things to Avoid

- Do NOT add authentication until Phase 3. In Phase 1–2, `created_by` / `visited_by` is a plain text string from a fixed list.
- Do NOT use an ORM (like Prisma or Drizzle). Use raw SQL via `@libsql/client` for simplicity and transparency.
- Do NOT add image upload until Phase 2.
- Do NOT use Google Maps. Use Leaflet + OpenStreetMap.
- Do NOT use `better-sqlite3`. Use `@libsql/client` (Turso's client) so the app works on Vercel's serverless environment.
- Do NOT over-engineer. If something can be a simple function, don't make it a class. If it can be a single file, don't split it into three.
- Do NOT commit `.env.local` or any secret tokens.

## Phase-Specific Build Notes

### When building Phase 1
Focus only on: bean library, café map, visit logging form, visit history. No auth, no images, no social features. Use the mock data from `seed.sql` to populate the database initially.

### When building Phase 2
Add a `photos` table to the schema. Integrate Cloudflare R2 using the S3-compatible API (the `@aws-sdk/client-s3` package works with R2). Add a dashboard page at the root route. Extend bean, café, and visit detail pages with photo galleries.

### When building Phase 3
Install `next-auth` and configure providers (Google and/or GitHub). Add a `users` table. Migrate `created_by` / `visited_by` text fields to `user_id` foreign keys with a migration script that maps existing text names to user records. Add user profile pages.

### When building Phase 4
Add `follows` table (follower_id, following_id). Add activity feed query that pulls visits from followed users. Make bean and café pages publicly accessible (no auth required to view, auth required to post). Add location-based café search using Leaflet's built-in geolocation. Add shareable URLs for visits and bean profiles.

## Changelog

### 2026-06-11 — v2: roadmap expansion + Turso + Chinese localization

This file replaced the original MVP-only instructions, archived at `CLAUDE.legacy.md` for reference. What changed:

- **Scope**: single MVP spec → four-phase roadmap (Phase 2: photos via Cloudflare R2 + dashboard stats; Phase 3: Auth.js with `user_id` migration; Phase 4: social/public discovery)
- **Database**: `better-sqlite3` with a local file at `data/brewlog.db` → Turso cloud SQLite via `@libsql/client`, so the app can deploy to Vercel serverless. Queries become async and must be centralized in `src/lib/queries.ts` (legacy kept them in API route files)
- **DB initialization**: legacy auto-created and auto-seeded the database on first run → now auto-seeding is forbidden; seed manually via the Turso CLI
- **Schema/seed location**: `data/schema.sql`, `data/seed.sql` → `schema.sql`, `seed.sql` at project root
- **UI language**: English → Simplified Chinese with bilingual coffee terminology ("水洗 Washed", Chinese first); predefined value lists are now bilingual and add 湿刨 Wet-hulled, 摩卡壶 Moka Pot, 滴滤机 Auto Drip
- **Map**: default center Singapore → Guangzhou; pin colors by *average* rating (green ≥4 / amber 3–3.9 / red <3) → by *highest* overall visit rating (green ≥4 / yellow 3 / red ≤2)
- **Routes**: map page `/map` → `/cafes`; log-a-visit form `/visits/new` → `/log`; new endpoint `GET /api/beans/[id]`

**Resolved as of Phases 1–4 (2026-06).** The legacy-spec drift this note originally described (better-sqlite3 with auto-seed, English UI, Singapore map center, `/map` and `/visits/new` routes) was fully migrated in Phase 1 (`git tag phase-1`); Phases 2–4 then added photos/dashboard/map filters, Auth.js multi-user with `user_id` foreign keys, and the social layer (follows/feed/crawls/leaderboard). The codebase now matches this spec through Phase 4 — treat the code as correct. Access model (owner decision, 2026-06-13): the site is public-read — every viewing page and GET API works without login; login gates only user-specific surfaces (`/log`, `/feed`, crawl authoring, photo upload/delete, personal stats) and all mutations.
