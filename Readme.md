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

Install Node.js (v18 or above) from **https://nodejs.org** — click the green **"LTS"** button and run the installer.

> **How to open a terminal:**
> - **Mac:** Press `Cmd + Space`, type "Terminal", and press Enter
> - **Windows:** Press `Win + R`, type `cmd`, and press Enter

### First-time setup

Open a terminal and run these commands one at a time:

```bash
# Download the project
git clone https://github.com/vito-zbw/brewlog.git
cd brewlog

# Install dependencies (takes a minute or two)
npm install

# Start the app
npm run dev
```

> If you don't have `git`, click the green **"Code"** button on the GitHub page, choose **"Download ZIP"**, unzip it, then open a terminal inside that folder.

The database auto-initializes with sample data on first run.

### Open the app

Once `npm run dev` is running, open your browser and go to:

**http://localhost:3000**

Leave the terminal open — closing it stops the app. To stop it manually, press `Ctrl + C`.

### Next time you want to open the app

You don't need to install anything again. Just open a terminal and run:

```bash
cd brewlog
npm run dev
```

Then open **http://localhost:3000** in your browser.

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
