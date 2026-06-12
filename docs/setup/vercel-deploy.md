# Deploy BrewLog to Vercel (free tier) — Vercel 部署指南

> **To the Claude assistant reading this:** the user has pasted this entire file into a fresh session and wants you to walk them through it. You have no other context about this project — everything you need is in this file. Go step by step, run the CLI commands for them where possible, and for browser steps give them the exact click-path and wait for them to confirm before moving on. All commands run from the repo root (the `brewlog/` directory containing `package.json`).

## Goal 目标

Get BrewLog (Next.js 16 + @libsql/client + Tailwind) live at `https://<project>.vercel.app`, connected to a Turso cloud database, with auto-deploy on every `git push`. Free tier only — no paid services.

## 何时需要 When you need this

- First public/online deployment of BrewLog.
- You changed environment variables on Vercel and need to know how to apply them (see Step 5 + Troubleshooting).
- You're adding Phase 2/3 features and need to know which env vars to add (see the env var table).

Local development does **not** need this — `npm run dev` works fully offline with `TURSO_DATABASE_URL=file:./data/brewlog.db`.

## Prerequisites 前提条件

1. **`docs/setup/turso-setup.md` completed.** This is mandatory: Vercel's serverless functions have no persistent disk, so the local `file:./data/brewlog.db` database does **not** exist there. You need the Turso cloud URL (`libsql://...`) and auth token from that guide, and the cloud database must already be seeded.
2. A GitHub account (also used to sign in to Vercel).
3. `git` installed; `gh` (GitHub CLI) is convenient but optional.
4. The app builds locally — verify before deploying:

```bash
npm install
npm run build
```

## Steps 步骤

### 1. Create a Vercel account (browser)

1. Open <https://vercel.com/signup>.
2. Click **Continue with GitHub** (recommended — it makes repo import one click).
3. Authorize Vercel on GitHub when prompted. Choose the free **Hobby** plan.

### 2. Push the repo to GitHub (if not already)

Check first:

```bash
git remote -v
```

If there is no remote, create one. With `gh` CLI:

```bash
gh auth login          # if not already logged in
gh repo create brewlog --private --source=. --push
```

Or via browser: <https://github.com/new> → name it `brewlog` → **Private** → **Create repository** → then:

```bash
git remote add origin https://github.com/<your-username>/brewlog.git
git push -u origin main
```

Make sure local work is committed and pushed (`git status` should be clean, then `git push`). **Never commit `.env.local`** — it should already be in `.gitignore`.

### 3a. Deploy via Git integration (recommended 推荐)

This is the primary path: every future `git push` to `main` auto-deploys.

1. Go to <https://vercel.com/dashboard> → **Add New…** → **Project**.
2. Under **Import Git Repository**, find `brewlog` → click **Import**. (If it's not listed: **Adjust GitHub App Permissions** → grant Vercel access to the repo.)
3. Framework Preset should auto-detect **Next.js**; leave Build/Output settings at defaults.
4. Expand **Environment Variables** on this import screen and add (both for **Production**):
   - `TURSO_DATABASE_URL` = your `libsql://...` URL from turso-setup
   - `TURSO_AUTH_TOKEN` = your Turso token
5. Click **Deploy** and wait for the build (~1–2 min). You'll get a URL like `https://brewlog-xxxx.vercel.app`.

If you skipped adding env vars at import time, add them now via Step 5 and redeploy.

### 3b. Alternative: deploy via Vercel CLI

Only if you prefer the terminal (or the dashboard flow fails):

```bash
npm i -g vercel
vercel login          # opens browser / email confirmation
vercel link           # run in repo root; create a new project named "brewlog"
vercel deploy --prod
```

You still need to set env vars (Step 5) — with the CLI:

```bash
vercel env add TURSO_DATABASE_URL production
# paste the libsql://... URL when prompted
vercel env add TURSO_AUTH_TOKEN production
# paste the token when prompted
vercel deploy --prod   # redeploy so the vars take effect
```

### 4. Note your production URL

Find it on the project's dashboard page (**Visit** button) or in the CLI output. Write it down — it's used in Verify below.

### 5. Managing environment variables (now and in later phases)

Dashboard path: project → **Settings** → **Environment Variables** → enter Name + Value → check **Production** (and Preview if you want PR previews to use the cloud DB) → **Save**.

CLI equivalent: `vercel env add <NAME> production`.

**⚠️ Env var changes do NOT apply to the existing deployment.** After any change, redeploy: dashboard → **Deployments** → latest → **⋯** → **Redeploy**, or run `vercel deploy --prod`, or push any commit.

**Phase upgrades 数据库升级:** when redeploying a NEW phase over an existing cloud database, run the additive migration first. For Phase 4 (creates the `follows` / `crawls` / `crawl_visits` tables):

```bash
TURSO_AUTH_TOKEN="$(turso db tokens create brewlog)" npm run migrate:phase4 -- "$(turso db show brewlog --url)"
```

It is idempotent — safe to re-run. Without it, `/crawls`, `/feed`, profile pages and follows will 500 on a Phase 3 database.

All env vars BrewLog will ever need (also documented in the committed `.env.example`):

| Variable | Phase | Set on Vercel? |
|---|---|---|
| `TURSO_DATABASE_URL` | Phase 1 (now) | **Yes** — the `libsql://...` cloud URL, never `file:` |
| `TURSO_AUTH_TOKEN` | Phase 1 (now) | **Yes** |
| `R2_ACCOUNT_ID` | Phase 2 (photos) | Yes, when building Phase 2 (see `docs/setup/r2-setup.md`) |
| `R2_ACCESS_KEY_ID` | Phase 2 | Yes, when building Phase 2 |
| `R2_SECRET_ACCESS_KEY` | Phase 2 | Yes, when building Phase 2 |
| `R2_BUCKET_NAME` | Phase 2 | Yes, when building Phase 2 |
| `R2_PUBLIC_URL` | Phase 2 | Yes, when building Phase 2 |
| `AUTH_SECRET` | **Phase 3+ — required at deploy time** | **Yes** — the app 500s without it (every route checks the session). Generate: `openssl rand -base64 33` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Phase 3 | Yes, if using Google login |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | Phase 3 | Yes, if using GitHub login |
| `AUTH_DEV_LOGIN` | Phase 3, dev only | **NO — NEVER.** This enables a one-click login bypass for local development. Setting it on Vercel would let anyone log in as anyone. |
| `AUTH_TRUST_HOST` | Phase 3, local only | No — Vercel is auto-trusted. Only needed in `.env.local` for `next start` on localhost |
| `AUTH_URL` | Phase 3, optional | Usually no — auto-detected on Vercel. Set to `https://yourdomain.com` only if login redirects misbehave after adding a custom domain (see `docs/setup/custom-domain.md`) |

## Values to collect 需要收集的值

| Value | Where it comes from | Where it goes |
|---|---|---|
| Turso database URL (`libsql://brewlog-....turso.io`) | turso-setup guide (`turso db show brewlog --url`) | Vercel env var `TURSO_DATABASE_URL` (Production) |
| Turso auth token | turso-setup guide (`turso db tokens create brewlog`) | Vercel env var `TURSO_AUTH_TOKEN` (Production) |
| GitHub repo URL | Step 2 (`gh repo create` / github.com/new) | Vercel project import (Step 3a) |
| Production URL (`https://<project>.vercel.app`) | Vercel dashboard / CLI output after deploy | Verify step; share with the other 2 users |

## Verify 验证

Since Phase 4, the site is **public-read**: anonymous visitors can browse every page and GET endpoint; login is only required for posting (logging visits, crawls, follows, photos) and personal data.

1. Open `https://<project>.vercel.app/beans` in a browser **without logging in** — the bean library (咖啡豆库) loads with the **8 seed beans** and a Chinese UI. That means the app booted and the database is reachable. Also spot-check `/cafes` (7 cafés on a Guangzhou-centered map) and `/visits` (9 visits) — all public.
2. From the terminal (replace with your URL):

```bash
curl -s https://<project>.vercel.app/api/beans
```

Expected: a JSON body starting with `{"data":` — public GET endpoints serve anonymous callers. A `500`, HTML error page, or connection failure means something is wrong → Troubleshooting.
3. **Protection check:** open `https://<project>.vercel.app/log` — you should be **redirected to the login page** (登录 BrewLog). Write actions stay behind login. (The login page shows Google/GitHub buttons only after `docs/setup/oauth-setup.md`; before that it may say 暂无可用的登录方式 — still a successful deploy.)
4. Personal data stays protected:

```bash
curl -s -w " [%{http_code}]" https://<project>.vercel.app/api/stats
```

Expected output:

```
{"error":"未登录"} [401]
```

5. Full write-path check (logging a visit, following, crawls) requires real login — complete `docs/setup/oauth-setup.md`, sign in on the deployed site, then log a test visit via `/log`.

## Troubleshooting 排错

**1. Build succeeds but pages show empty lists / API returns `{"error": ...}` or 500.**
The deployed function can't reach Turso. Check logs: dashboard → project → **Logs** (or `vercel logs <deployment-url>`). Common causes:
- `TURSO_AUTH_TOKEN` was created for a *different* database than the one in `TURSO_DATABASE_URL` — regenerate with `turso db tokens create brewlog` and update the env var.
- Token pasted with trailing whitespace/newline.
- The cloud DB was never seeded — re-run the seeding step from turso-setup against the cloud URL (8 beans / 7 cafés / 9 visits expected).
Then **redeploy** (env changes never apply to existing deployments).

**2. "Missing env var" worry — note the build will NOT fail on this.**
The app falls back to `file:./data/brewlog.db` when `TURSO_DATABASE_URL` is unset, so the build passes and you instead get an empty/broken database at runtime on Vercel. If data is missing in production, the real cause is usually a **typo in the variable name** (must be exactly `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`), the var saved only for Preview but not **Production**, or a forgotten redeploy. Verify with `vercel env ls` or Settings → Environment Variables.

**3. Build actually fails.**
Read the build log on the deployment page. Most common: code that doesn't build locally either — reproduce with `npm run build` locally and fix; or a Node version mismatch (set Node 20+ under Settings → General → Node.js Version). Don't debug on Vercel what you can debug locally.

**4. Changed an env var but production behaves the same.**
Deployments are immutable snapshots; env vars are read at build/deploy time. Redeploy: Deployments → latest → ⋯ → **Redeploy** (or `vercel deploy --prod`, or push a commit).

**5. Free-tier limits.**
Hobby plan gives ~100GB bandwidth/month and generous serverless invocations — far beyond what 3 users need. Turso free tier (9GB) is likewise ample. If you ever see usage warnings, the likely cause is an accidental loop hitting an API route, not real traffic — check the Logs tab. No payment method should ever be required for this project.
