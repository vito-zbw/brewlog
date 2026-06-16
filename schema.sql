-- BrewLog Database Schema
-- Single source of truth for the data model.
-- Apply with `npm run db:init` (local) or `turso db shell brewlog < schema.sql` (cloud).
-- Fresh installs get this final shape directly; databases created before
-- Phase 3 are upgraded by running the migration scripts in dependency order:
--   migrate-phase3 -> migrate-phase4 (follows/crawls/crawl_visits)
--   -> migrate-phase5 (users.password_hash) -> migrate-username
--   (unique case-insensitive users.name index) -> migrate-drop-cafe-website
--   -> migrate-orphan-cafes.
-- The last two run AFTER the code deploy (destructive column drop / one-time
-- cleanup) — see "Full migration order" in docs/setup/vercel-deploy.md.
--
-- Enum-like columns (processing_method, roast_level, brew_method) store canonical
-- English values; the bilingual "中文 English" display labels live in src/lib/terms.ts.
-- tasting_notes_tags stores the full bilingual display strings, comma-separated.

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,                  -- OAuth identity key (same email = same user across providers)
    name TEXT NOT NULL,                          -- display name; kept stable across OAuth sign-ins
    image TEXT,                                  -- avatar URL from the OAuth provider
    password_hash TEXT,                          -- scrypt hash for email/password login; NULL for OAuth/dev-login users
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS beans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                          -- e.g. "Yirgacheffe Kochere Lot #7"
    origin_country TEXT NOT NULL,                -- e.g. "Ethiopia"
    origin_region TEXT,                          -- e.g. "Yirgacheffe"
    farm TEXT,                                   -- e.g. "Kochere washing station"
    roaster TEXT,                                -- e.g. "Torch Coffee Lab"
    processing_method TEXT NOT NULL DEFAULT 'Other',  -- Washed | Natural | Honey | Anaerobic | Wet-hulled | Other
    roast_level TEXT NOT NULL DEFAULT 'Medium',       -- Light | Medium-Light | Medium | Medium-Dark | Dark
    tasting_notes_tags TEXT,                     -- comma-separated bilingual tags, e.g. "果香 Fruity,花香 Floral"
    tasting_notes_freetext TEXT,                 -- free-form description
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cafes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                          -- e.g. ".jpg coffee"
    city TEXT NOT NULL,                          -- e.g. "广州"
    country TEXT NOT NULL,                       -- e.g. "中国"
    latitude REAL NOT NULL,                      -- for map pin placement
    longitude REAL NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cafe_id INTEGER NOT NULL REFERENCES cafes(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    visit_date DATE NOT NULL,                    -- e.g. "2026-04-01"
    brew_method TEXT NOT NULL,                   -- Espresso | V60 | Chemex | Aeropress | French Press | Siphon | Cold Brew | Moka Pot | Auto Drip | Other
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

CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('bean','visit')),  -- cafés have no photos of their own; café photos live on visits
    entity_id INTEGER NOT NULL,                  -- id within the entity_type table (no FK across three tables)
    storage_key TEXT NOT NULL,                   -- key in R2 / data/uploads; public URL computed at read time
    content_type TEXT NOT NULL,                  -- e.g. image/jpeg
    caption TEXT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL REFERENCES users(id),
    following_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id <> following_id)
);

CREATE TABLE IF NOT EXISTS crawls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,                         -- e.g. "东山口咖啡半日游"
    description TEXT,
    crawl_date DATE NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crawl_visits (
    crawl_id INTEGER NOT NULL REFERENCES crawls(id) ON DELETE CASCADE,
    visit_id INTEGER NOT NULL REFERENCES visits(id),
    stop_order INTEGER NOT NULL,                 -- 1-based position within the crawl
    PRIMARY KEY (crawl_id, visit_id)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_beans_origin ON beans(origin_country);
CREATE INDEX IF NOT EXISTS idx_beans_roaster ON beans(roaster);
CREATE INDEX IF NOT EXISTS idx_cafes_city ON cafes(city);
CREATE INDEX IF NOT EXISTS idx_visits_cafe ON visits(cafe_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_user ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_entity ON photos(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_crawls_user ON crawls(user_id);
-- Display names are unique across users (case-insensitive: NOCASE folds ASCII
-- only, so CJK names compare exactly). Enforced from the settings feature on.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_nocase ON users(name COLLATE NOCASE);
