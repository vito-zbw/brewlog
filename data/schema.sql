-- BrewLog Database Schema
-- This is the single source of truth for the data model.
-- Run this file to initialize a fresh database.

CREATE TABLE IF NOT EXISTS beans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                          -- e.g. "Yirgacheffe Kochere Lot #7"
    origin_country TEXT NOT NULL,                -- e.g. "Ethiopia"
    origin_region TEXT,                          -- e.g. "Yirgacheffe"
    farm TEXT,                                   -- e.g. "Kochere washing station"
    roaster TEXT,                                -- e.g. "Nylon Coffee Roasters"
    processing_method TEXT NOT NULL DEFAULT 'unknown',  -- washed | natural | honey | anaerobic | unknown
    roast_level TEXT NOT NULL DEFAULT 'medium',         -- light | medium-light | medium | medium-dark | dark
    tasting_notes_tags TEXT,                     -- comma-separated tags, e.g. "blueberry,dark chocolate,citrus"
    tasting_notes_freetext TEXT,                 -- free-form description
    created_by TEXT NOT NULL,                    -- username string
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cafes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                          -- e.g. "Nylon Coffee Roasters"
    city TEXT NOT NULL,                          -- e.g. "Singapore"
    country TEXT NOT NULL,                       -- e.g. "Singapore"
    latitude REAL NOT NULL,                      -- for map pin placement
    longitude REAL NOT NULL,
    website TEXT,                                -- optional URL
    created_by TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cafe_id INTEGER NOT NULL REFERENCES cafes(id),
    visited_by TEXT NOT NULL,                    -- username string
    visit_date DATE NOT NULL,                    -- e.g. "2025-04-01"
    brew_method TEXT NOT NULL,                   -- Espresso | V60 | Chemex | Aeropress | Siphon | French Press | Cold Brew | Other
    rating_overall INTEGER NOT NULL CHECK(rating_overall BETWEEN 1 AND 5),
    rating_bean_quality INTEGER NOT NULL CHECK(rating_bean_quality BETWEEN 1 AND 5),
    rating_barista_skill INTEGER NOT NULL CHECK(rating_barista_skill BETWEEN 1 AND 5),
    rating_ambiance INTEGER NOT NULL CHECK(rating_ambiance BETWEEN 1 AND 5),
    notes TEXT,                                  -- free-form experience notes
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visit_beans (
    visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    bean_id INTEGER NOT NULL REFERENCES beans(id),
    PRIMARY KEY (visit_id, bean_id)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_beans_origin ON beans(origin_country);
CREATE INDEX IF NOT EXISTS idx_beans_roaster ON beans(roaster);
CREATE INDEX IF NOT EXISTS idx_cafes_city ON cafes(city);
CREATE INDEX IF NOT EXISTS idx_visits_cafe ON visits(cafe_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_visitor ON visits(visited_by);
