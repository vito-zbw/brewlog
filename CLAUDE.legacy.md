# BrewLog — Specialty Coffee Discovery & Review Platform

## Project Overview

BrewLog is a private specialty coffee discovery and review platform for a small group of coffee enthusiasts. It serves as a **bean database with café reviews attached**. Users log café visits, rate their experiences, and build a structured catalog of specialty coffee beans they've tried.

This is the **MVP phase** — built for 3 private users, no public access, no authentication. Data is seeded with mock entries and then manually edited/added by the team.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: SQLite via `better-sqlite3` — single file at `./data/brewlog.db`
- **Map**: Leaflet + React-Leaflet (OpenStreetMap tiles, no API key needed)
- **Styling**: Tailwind CSS — no custom CSS files, no CSS modules
- **Package manager**: npm

## Project Structure

```
brewlog/
├── CLAUDE.md
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── data/
│   ├── schema.sql          # Source of truth for DB schema
│   ├── seed.sql             # Mock data for development
│   └── brewlog.db           # SQLite database (gitignored)
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout with nav
│   │   ├── page.tsx         # Home / dashboard
│   │   ├── beans/
│   │   │   ├── page.tsx     # Bean library (list + search/filter)
│   │   │   └── [id]/
│   │   │       └── page.tsx # Bean detail page
│   │   ├── map/
│   │   │   └── page.tsx     # Café map view
│   │   ├── visits/
│   │   │   ├── page.tsx     # Visit history feed
│   │   │   └── new/
│   │   │       └── page.tsx # Log a new visit form
│   │   └── api/
│   │       ├── beans/
│   │       │   └── route.ts
│   │       ├── cafes/
│   │       │   └── route.ts
│   │       └── visits/
│   │           └── route.ts
│   ├── lib/
│   │   └── db.ts            # Database connection + query helpers
│   ├── components/
│   │   ├── ui/              # Reusable UI primitives (buttons, cards, inputs)
│   │   ├── BeanCard.tsx
│   │   ├── CafeMapPin.tsx
│   │   ├── VisitCard.tsx
│   │   ├── RatingStars.tsx
│   │   └── FlavorTagPicker.tsx
│   └── types/
│       └── index.ts         # Shared TypeScript interfaces
└── public/
    └── ...
```

## Database

### Schema

The canonical schema is in `data/schema.sql`. Always reference that file — do not invent columns or tables.

There are 4 core tables:

- **beans** — the coffee bean catalog (origin, processing, roaster, tasting notes)
- **cafes** — café locations with coordinates for the map
- **visits** — a logged café experience with ratings and notes
- **visit_beans** — join table linking visits to the beans tried during that visit

### Key relationships

- A visit belongs to one café (`visits.cafe_id → cafes.id`)
- A visit can include multiple beans (via `visit_beans`)
- A bean can appear in many visits across different cafés
- `created_by` fields store a simple username string (no auth system)

### Database initialization

On first run, the app should:
1. Check if `./data/brewlog.db` exists
2. If not, create it and run `data/schema.sql` to create tables
3. Optionally run `data/seed.sql` to populate mock data

The `src/lib/db.ts` module should handle this initialization.

## Pages & Features

### 1. Bean Library (`/beans`)
- Displays all beans as cards in a grid
- Search by name, origin, or roaster
- Filter by processing method, roast level, or tasting note tags
- Click a bean card → bean detail page showing full info + list of visits where this bean was tried

### 2. Café Map (`/map`)
- Full-screen Leaflet map with pins for every café in the database
- Pin color indicates average overall rating: green (≥4), amber (3–3.9), red (<3)
- Clicking a pin opens a popup with: café name, city, average rating, number of visits, link to visit history filtered by that café
- Map should default-center on Singapore (lat: 1.3521, lng: 103.8198) since that's where we're based

### 3. Log a Visit (`/visits/new`)
- Form with fields:
  - Select existing café OR add a new one (name, city, country, lat/lng)
  - Visit date (default: today)
  - Brew method (dropdown: Espresso, V60, Chemex, Aeropress, Siphon, French Press, Cold Brew, Other)
  - Select beans tried (multi-select from existing beans, or add new bean inline)
  - Ratings (1–5 scale): overall, bean quality, barista skill, ambiance
  - Free-text notes
  - Your name (dropdown of the 3 team members)
- On submit: insert into `visits` and `visit_beans`, plus any new beans/cafes created

### 4. Visit History (`/visits`)
- Reverse-chronological feed of all visits
- Each visit card shows: café name, date, beans tried, overall rating, truncated notes
- Filterable by person, café, or bean

### 5. Home/Dashboard (`/`)
- Simple landing page with:
  - Total beans cataloged, total cafés visited, total visits logged
  - Latest 3 visits
  - Quick-action buttons: "Log a Visit", "Browse Beans", "View Map"

## Coding Conventions

### General
- Use TypeScript strict mode everywhere — no `any` types
- Use `async/await`, never raw promises with `.then()`
- Prefer named exports over default exports (except for page components which Next.js requires as default)
- Use descriptive variable names — `cafeVisits` not `cv`

### Components
- All components are functional components with hooks
- Use Tailwind utility classes only — no inline `style={}` props
- Keep components under 150 lines; extract sub-components if longer
- Props must have explicit TypeScript interfaces

### API Routes
- All API routes return JSON with consistent shape: `{ data: T }` on success, `{ error: string }` on failure
- Use proper HTTP methods: GET for reads, POST for creates, PUT for updates, DELETE for deletes
- Validate inputs before database operations

### Database Queries
- Write raw SQL (no ORM) via `better-sqlite3` — it's synchronous, so no async needed for DB calls
- Use parameterized queries always — never string-interpolate user input into SQL
- Keep queries in the API route files, not in components

## Design Direction

The aesthetic should feel like a **specialty coffee shop menu board** — warm, earthy, and refined but not pretentious. Think:

- Warm color palette: deep espresso browns, cream, muted terracotta, sage green accents
- Clean typography: a distinctive serif or slab-serif for headings, a readable sans-serif for body text — load from Google Fonts
- Cards with subtle warm shadows, slightly rounded corners
- The map page should feel immersive — full viewport height with a floating panel for details
- Rating displays should use filled/empty coffee bean icons instead of generic stars if feasible
- Overall vibe: the app should feel like something a specialty coffee enthusiast would be proud to use, not a generic CRUD app

## Things to Avoid

- Do NOT add authentication or user login — this is private MVP
- Do NOT use an ORM (Prisma, Drizzle, etc.) — raw SQL with better-sqlite3
- Do NOT use any paid APIs or services
- Do NOT add image upload — text-only for MVP
- Do NOT over-engineer: no state management libraries (Redux, Zustand), no testing framework yet, no CI/CD
- Do NOT use `localStorage` for data — everything goes through SQLite
