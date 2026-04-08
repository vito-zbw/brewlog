# BrewLog

A specialty coffee discovery and review platform for documenting beans, logging café visits, and mapping your coffee adventures.

## What is this?

BrewLog is a private tool for a small group of specialty coffee enthusiasts. It lets you:

- **Catalog beans** — track origin, processing method, roaster, and tasting notes for every specialty coffee bean you try
- **Log café visits** — rate your experience across bean quality, barista skill, and ambiance
- **Map your discoveries** — see every café you've visited on an interactive map, color-coded by rating

## Tech Stack

- **Next.js 14+** (App Router) with TypeScript
- **SQLite** via better-sqlite3 (no external database needed)
- **Leaflet** with OpenStreetMap for the café map
- **Tailwind CSS** for styling

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# The database auto-initializes on first run.
# To seed it with mock data, run:
npm run seed

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
data/           → SQLite database, schema, and seed data
src/app/        → Next.js pages and API routes
src/components/ → Reusable UI components
src/lib/        → Database connection and helpers
src/types/      → Shared TypeScript interfaces
```

## Database

The schema is defined in `data/schema.sql`. The SQLite database file (`data/brewlog.db`) is gitignored and created automatically on first run.

To reset the database, delete `data/brewlog.db` and restart the server.

## Current Status

**MVP** — private use for 3 users, no authentication, no public sharing.