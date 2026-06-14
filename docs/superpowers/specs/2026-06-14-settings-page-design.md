# Settings Page — Design Spec

**Date:** 2026-06-14
**Status:** Approved (design); pending implementation plan.

## Context

A user asked how their display name is decided and why they cannot change it.
In BrewLog (Auth.js JWT sessions, no DB adapter), the `users` table has only a
`name` column (no separate `username`). On first OAuth sign-in the `jwt`
callback (`src/auth.ts`) calls `upsertUserByEmail(...)`, setting `name` from the
OAuth profile (or email fallback) **once on INSERT** — it is never overwritten,
and the pre-seeded rows in `seed.sql` (e.g. `Baiwei`) keep their seeded names.
There is no settings page and no update endpoint, so names are effectively
permanent.

This spec adds a dedicated **account settings page** so a logged-in user can
manage their identity. Scope was brainstormed and confirmed with the user.

## Goals & scope

**In scope** (user-selected):
1. **Display name** — editable, **case-insensitively unique** across users.
2. **Avatar** — upload/replace the profile picture (reusing the existing photo
   pipeline); plus a "remove" action that reverts to the initial-letter avatar.
3. **Account info** — a read-only card: email, sign-in method, join date.

**Out of scope:** bio/about field, brew-method preferences, account deletion,
email change (email is the OAuth identity key), and the unrelated, untracked
Phase 5 email/password auth (`/register`, `password_hash`) which is not
implemented in `src/` and is left untouched.

## Key decisions

- **Unique name, case-insensitive** (`COLLATE NOCASE`): "Baiwei"/"baiwei"
  collide; CJK names compare exactly (NOCASE only folds ASCII). Enforced by a DB
  unique index (authoritative) **and** an app-level pre-check (friendly error).
- **Dedicated `/settings` page**, linked from a new logged-in-only nav item.
- **Avatar lives where photos already live**: Cloudflare R2 when the five `R2_*`
  env vars are set, else local disk (`data/uploads/`) served by
  `GET /api/uploads/[...key]`. Production requires R2 (Vercel's filesystem is
  ephemeral) — identical to the existing photo feature. Avatars are downscaled
  client-side to ~400px JPEGs, well within R2's free tier.
- **`users.image` stores the computed public URL** (not the storage key), so
  uploaded avatars and absolute OAuth URLs render through the same raw
  `<img src>` paths already used in nav/profile/leaderboard. (Caveat, already
  true for photos: a stored URL is backend-specific and 404s if the backend is
  switched.)
- **Sign-in method is read from the JWT, not the DB.** No `provider` column and
  no adapter exist. The `jwt` callback will persist `account.provider` into the
  token at sign-in; the `session` callback exposes `session.user.provider`.
  Pre-existing sessions (issued before this change) show a "未知 Unknown"
  fallback until next login. No migration needed for this.
- **Nav + dashboard name/avatar become DB-sourced.** Today `layout.tsx` and
  `page.tsx` read `session.user.name`/`.image` from the JWT, which never
  refreshes. They will switch to a new `getCurrentUser()` helper (DB row), so a
  saved name or avatar appears everywhere immediately after `router.refresh()` —
  consistent with profile/leaderboard, which already JOIN the live `users` row.

## Architecture / data flow

```
/settings (server component, login-gated)
   ├─ getCurrentUser()  → name, email, image, created_at  (DB)
   ├─ auth()            → session.user.provider            (JWT)
   ├─ <UsernameForm>    → PATCH  /api/users/[id]   (JSON  {name})
   ├─ <AvatarUpload>    → POST   /api/users/[id]/avatar (multipart)
   │                      DELETE /api/users/[id]/avatar
   └─ Account-info card (read-only)
```

All write endpoints: `requireUserId()` → ownership check (`[id] === userId`,
else 403) → validate → mutate → `{ data }` / `{ error }` with proper status.

## Components & changes (file-by-file)

### Data layer
- **`schema.sql`** — add to the index section:
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_nocase ON users(name COLLATE NOCASE);`
  (Fresh installs and the test DB get this automatically via
  `scripts/init-db.mjs`, which applies `schema.sql`.)
- **`scripts/migrate-username.mjs`** (new) — modeled on `migrate-phase4.mjs`
  (url from `argv[2]` or env; abort if remote URL without `TURSO_AUTH_TOKEN`).
  Idempotent + atomic:
  1. Detect existing case-insensitive duplicate names
     (`GROUP BY lower(name) HAVING COUNT(*) > 1`); if any, print them and exit
     non-zero **before** any write (creating the index on dup data would fail).
  2. `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_nocase …`.
  - `package.json`: add `"migrate:username": "node --env-file-if-exists=.env.local scripts/migrate-username.mjs"`.
- **`src/lib/queries/users.ts`** — add:
  - `updateUserName(userId, name): Promise<void>` → `UPDATE users SET name=? WHERE id=?`.
  - `isNameTaken(name, excludeUserId): Promise<boolean>` →
    `SELECT 1 FROM users WHERE name=? COLLATE NOCASE AND id<>? LIMIT 1`.
  - `updateUserImage(userId, image: string | null): Promise<void>` →
    `UPDATE users SET image=? WHERE id=?`.
- **`src/lib/storage.ts`** — generalize `savePhoto`'s third parameter from
  `entityType: PhotoEntityType` to `keyPrefix: string` (it is only used as the
  key folder). The sole caller (`/api/photos`) keeps passing `entity_type`
  (a string subtype); avatars pass `"avatar"`. No `photos`-table change —
  avatars never create a `photos` row.

### Validation
- **`src/lib/username-validation.ts`** (new, mirrors `crawl-validation.ts`):
  `validateUsername(name: unknown): string | null` returning a **Chinese**
  message or `null`. Rules: must be a string; trimmed length 2–24;
  no control characters. Pure module — reused by client form and API route.

### Auth / session
- **`src/auth.ts`** — in the `jwt` callback, on sign-in set
  `token.provider = account.provider`; in the `session` callback expose
  `session.user.provider`.
- **`src/types/next-auth.d.ts`** — add `provider?: string` to the session user.
- **`src/lib/auth-helpers.ts`** — add
  `getCurrentUser(): Promise<User | null>` = `auth()` → if numeric id,
  `getUserById(id)`, else `null`. (No import cycle: query modules don't import
  auth-helpers.)

### API routes
- **`src/app/api/users/[id]/route.ts`** (new) — `PATCH` (JSON):
  `requireUserId()`; 403 if `[id] !== userId`; parse body (400 on bad JSON);
  `validateUsername` (400); `isNameTaken` (409 `该用户名已被使用`); trim;
  `updateUserName`; catch SQLite `UNIQUE` error → 409 (race); success
  `{ data: { id, name } }`. `UnauthorizedError`→401; else 500.
- **`src/app/api/users/[id]/avatar/route.ts`** (new):
  - `POST` (multipart): `requireUserId()` + ownership; read `file`;
    `isSupportedImageType` (400); `savePhoto(buf, type, "avatar")` →
    `photoPublicUrl(key)` → `updateUserImage(userId, url)`; `{ data: { image } }`.
  - `DELETE`: `updateUserImage(userId, null)`; `{ data: { image: null } }`.

### UI
- **`src/lib/image-client.ts`** (new) — extract `loadImage`,
  `canvasToJpegBlob`, `downscaleToJpeg(file, maxDimension)` from
  `PhotoUpload.tsx`; parameterize max dimension. `PhotoUpload` imports it
  (max 1600); avatar uses ~400.
- **`src/components/PhotoUpload.tsx`** — use the shared util (no behavior change).
- **`src/components/UsernameForm.tsx`** (new, `"use client"`, mirrors
  `CrawlForm`): state for name/error/saving/success; client `validateUsername`;
  `PATCH /api/users/${userId}`; inline error/success; `router.refresh()` on save;
  submit disabled while saving or when unchanged/empty. testids: `settings-name`,
  `settings-submit`, `settings-error`, `settings-success`.
- **`src/components/AvatarUpload.tsx`** (new, `"use client"`): downscale via
  shared util (~400px); `POST` multipart to `/api/users/${userId}/avatar`;
  "remove" button → `DELETE`; preview current avatar (or initial fallback);
  inline error; `router.refresh()`. testids: `avatar-input`, `avatar-remove`,
  `avatar-error`.
- **`src/app/settings/page.tsx`** (new, server component,
  `dynamic = "force-dynamic"`): `getCurrentUser()` → if null
  `redirect("/login?callbackUrl=/settings")`; `auth()` for provider; heading
  "账号设置"; three cards (name / avatar / account-info). Provider label map:
  google→Google, github→GitHub, dev-login→开发登录, else 未知.
- **`src/app/layout.tsx`** — replace `session` read with `getCurrentUser()` for
  nav avatar/name/profile-href; add logged-in-only `NavLink href="/settings"`
  (`testId="nav-settings"`, label "设置").
- **`src/app/page.tsx`** — source the dashboard greeting name from
  `getCurrentUser()` instead of `session.user.name`.

### Types
- No change to the `User` interface (`name`/`image` already present). Only the
  session type gains `provider?`.

## Testing

`tests/e2e/phase3/account-settings.spec.ts` (Phase 3 = auth/profile; runs as
Baiwei/user1). The shared test DB resets once per run and specs run serially, so
destructive cases must restore state.
- `/settings` renders prefilled name + account-info; nav shows current name.
- Rename to a unique temp value → success → `nav-profile`/dashboard reflect it →
  **restore to "Baiwei"** (so later specs that assert "Baiwei" pass; renaming
  doesn't break the saved session — `requireUserId` validates by id, and nav
  name is now DB-sourced).
- Rename to an existing other user's name (e.g. "Friend1") → inline 409 error,
  name unchanged.
- Empty / too-short name → inline validation error, no request sent.
- Avatar upload (local-disk backend in tests) → nav + profile image update;
  then remove → initial-letter fallback. **Restore** to leave Baiwei as found.
- Logged-out visit to `/settings` (empty storageState) → redirect to `/login`.

**Verification gate:** `npm run typecheck && npm run lint`, rebuild test DB
(`npm run db:init:test`), then Playwright over `phase1–phase4` **excluding** the
untracked, unimplemented `tests/e2e/phase5/` (which already fails on `main`).

## Rollout

Per `CLAUDE.md` deploy rules: run the migration against production **before**
pushing code:
```
TURSO_AUTH_TOKEN="$(turso db tokens create brewlog)" \
  npm run migrate:username -- "$(turso db show brewlog --url)"
```
Then `git push origin main` (auto-deploys via Vercel). Avatar uploads in
production require the five `R2_*` env vars to be configured on Vercel.
