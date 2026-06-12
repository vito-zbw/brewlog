# BrewLog Setup Docs — Index 设置文档索引

> **If you are a Claude Code session reading this:** the user pasted this file to get oriented. Your job is to (1) figure out which setup they actually need right now, (2) tell them which single doc file from the table below to open, and (3) have them paste **that entire file** into a fresh Claude Code session and say "help me complete this process". Do not try to perform cloud setups from this index alone — each doc is self-contained and this index is only a map.

These docs cover the **interactive browser/account setups that cannot be automated** — creating cloud accounts, clicking through dashboards, copying tokens. Everything that *can* be scripted already lives in npm scripts (`db:init`, `db:seed`, `db:reset`, `test:e2e`, `verify`).

**How to use 使用方法:** pick one doc, paste its entire contents into a new Claude Code session, and say **"help me complete this process"**. One doc per session.

**Local development needs NONE of these 本地开发不需要任何云账号.** The app runs fully offline with `TURSO_DATABASE_URL=file:./data/brewlog.db` in `.env.local` (and a one-click dev login via `AUTH_DEV_LOGIN`, since Phase 3). Only set up cloud services when you are ready to deploy.

## The Docs 文档列表

| File | What it sets up | Needed when | Required for local-only dev? |
| --- | --- | --- | --- |
| [`turso-setup.md`](./turso-setup.md) | Turso cloud database (production SQLite) | Before your first Vercel deploy | No |
| [`vercel-deploy.md`](./vercel-deploy.md) | Vercel hosting + env vars | End of Phase 1; redeploy at the end of each phase | No |
| [`r2-setup.md`](./r2-setup.md) | Cloudflare R2 photo storage | Phase 2 deploy | No |
| [`oauth-setup.md`](./oauth-setup.md) | Google + GitHub login (Auth.js) | Phase 3 | No (dev login covers local) |
| [`custom-domain.md`](./custom-domain.md) | Custom domain + HTTPS on Vercel | Phase 3, optional | No |

**Phase 4 第四阶段:** no new cloud services are needed. But when redeploying Phase 4 over an existing cloud database, run the `migrate:phase4` migration first — see the "Phase upgrades 数据库升级" note in [`vercel-deploy.md`](./vercel-deploy.md). Since Phase 4 the deployed site is **public-read**: anyone can browse without an account; login is only needed for posting and personal stats.

## Recommended Order 推荐顺序

1. `turso-setup.md` — cloud database first (Vercel needs its credentials)
2. `vercel-deploy.md` — first deploy
3. *(Phase 2)* `r2-setup.md` — photo storage
4. *(Phase 3)* `oauth-setup.md` — real login
5. *(Phase 3, optional)* `custom-domain.md` — custom domain

## Master Environment Variable Table 环境变量总表

All of these are documented with placeholders in the committed `.env.example`. Local values go in `.env.local` (never committed); production values go in the Vercel dashboard.

| Variable | Owning doc | Set locally (`.env.local`)? | Set on Vercel? |
| --- | --- | --- | --- |
| `TURSO_DATABASE_URL` | `turso-setup.md` | Yes — `file:./data/brewlog.db` for offline dev | Yes — `libsql://...` cloud URL |
| `TURSO_AUTH_TOKEN` | `turso-setup.md` | No (not needed for `file:` URLs) | Yes |
| `R2_ACCOUNT_ID` | `r2-setup.md` (Phase 2) | Optional (only to test uploads locally) | Yes (Phase 2+) |
| `R2_ACCESS_KEY_ID` | `r2-setup.md` (Phase 2) | Optional | Yes (Phase 2+) |
| `R2_SECRET_ACCESS_KEY` | `r2-setup.md` (Phase 2) | Optional | Yes (Phase 2+) |
| `R2_BUCKET_NAME` | `r2-setup.md` (Phase 2) | Optional | Yes (Phase 2+) |
| `R2_PUBLIC_URL` | `r2-setup.md` (Phase 2) | Optional | Yes (Phase 2+) |
| `AUTH_SECRET` | `oauth-setup.md` (Phase 3) | Yes (Phase 3+) | Yes (Phase 3+) |
| `AUTH_GOOGLE_ID` | `oauth-setup.md` (Phase 3) | Optional (dev login covers local) | Yes (Phase 3+) |
| `AUTH_GOOGLE_SECRET` | `oauth-setup.md` (Phase 3) | Optional | Yes (Phase 3+) |
| `AUTH_GITHUB_ID` | `oauth-setup.md` (Phase 3) | Optional | Yes (Phase 3+) |
| `AUTH_GITHUB_SECRET` | `oauth-setup.md` (Phase 3) | Optional | Yes (Phase 3+) |
| `AUTH_DEV_LOGIN` | `oauth-setup.md` (Phase 3) | Yes — local only, enables one-click dev login | **NEVER. ⚠️ Setting `AUTH_DEV_LOGIN` on Vercel would let anyone log in without a password. Do not set it in any Vercel environment.** |
| `AUTH_TRUST_HOST` | `oauth-setup.md` (Phase 3) | Yes — required for `next start` on localhost | No — Vercel is auto-trusted |
| `AUTH_URL` | `custom-domain.md` (Phase 3, optional) | No | Only if login redirects misbehave on a custom domain |
