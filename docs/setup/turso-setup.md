# Turso Cloud Database Setup — Turso 云数据库配置

> **To the Claude assistant reading this:** the user has pasted this entire file into a fresh session and wants you to walk them through it. Your job: run the CLI commands for them (ask before anything that creates cloud resources), explain each browser step before they do it, collect the values in the table below, and finish only when the Verify step passes. The user is a beginner — go step by step, one step at a time.

## Goal — 目标

Create a Turso cloud database (free tier) so the **deployed** BrewLog app on Vercel has persistent storage, apply the schema and seed data to it, and collect the two credentials (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) that Vercel needs.

**Local development does NOT need this.** The committed default `.env.local` setting `TURSO_DATABASE_URL=file:./data/brewlog.db` runs the app and tests fully offline with zero cloud accounts. Only do this setup right before your first Vercel deploy.

## 何时需要 When you need this

- ✅ Before the first deploy to Vercel (see `docs/setup/vercel-deploy.md`) — Vercel's serverless functions cannot use a `file:` database.
- ✅ If you deliberately want local dev to read/write the shared cloud database.
- ❌ NOT needed for everyday local dev, `npm run dev`, or `npm run verify`.

## Prerequisites — 前置条件

- macOS with Homebrew installed (or any shell with `curl` for the alternative installer).
- A browser, and a GitHub or Google account to sign up for Turso (free, no credit card).
- You are in the repo root (the `brewlog/` directory) for all commands below.

## Steps — 步骤

### 1. Install the Turso CLI — 安装 CLI

```bash
brew install tursodatabase/tap/turso
```

Alternative (no Homebrew):

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

Confirm it works:

```bash
turso --version
```

### 2. Sign up / log in — 注册登录

```bash
turso auth signup
```

This opens a browser. Click-path: choose **Continue with GitHub** (or Google) → authorize the Turso app → the page says you're authenticated → return to the terminal, which should print "Already signed in" or a success message. If you already have an account, use `turso auth login` instead.

### 3. Create the database — 创建数据库

```bash
turso db create brewlog
```

Free tier is fine: BrewLog's Phase 1 data (8 beans, 7 cafés, 9 visits) is far under the 9 GB / 25M-row limits.

### 4. Collect the database URL

```bash
turso db show brewlog --url
```

Output looks like `libsql://brewlog-<your-org>.turso.io`. Save it — this is `TURSO_DATABASE_URL`.

### 5. Create an auth token

```bash
turso db tokens create brewlog
```

Prints a long string starting with `ey...`. Save it — this is `TURSO_AUTH_TOKEN`. Treat it like a password; never commit it.

### 6. Apply schema and seed data — 建表并填充数据

From the repo root:

```bash
turso db shell brewlog < schema.sql
turso db shell brewlog < seed.sql
```

Run each **exactly once**. `schema.sql` is safe to re-run (`CREATE TABLE IF NOT EXISTS`), but re-running `seed.sql` duplicates rows — see Troubleshooting.

### 7. Put the values where they belong

**For Vercel (the main reason you're here):** add both values as environment variables in the Vercel project — follow `docs/setup/vercel-deploy.md`. Do not set `AUTH_DEV_LOGIN` on Vercel, ever.

**For local dev (optional):** you can point your machine at the cloud DB by editing `.env.local`:

```
TURSO_DATABASE_URL=libsql://brewlog-<your-org>.turso.io
TURSO_AUTH_TOKEN=ey...
```

Tradeoff — 取舍: cloud-backed local dev means you see the same data as production, but you need internet, it's slower, and local experiments (or `npm run db:seed`) pollute real data. `npm run db:reset` **refuses to run** against non-`file:` URLs by design. Recommended: keep local dev on the offline file DB. To switch back, restore:

```
TURSO_DATABASE_URL=file:./data/brewlog.db
```

(and remove/comment `TURSO_AUTH_TOKEN`). All variable names are documented in the committed `.env.example`.

## Values to collect — 需要收集的值

| Value | Where it comes from | Where it goes |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | `turso db show brewlog --url` | Vercel env vars (see `docs/setup/vercel-deploy.md`); optionally `.env.local` |
| `TURSO_AUTH_TOKEN` | `turso db tokens create brewlog` | Vercel env vars; optionally `.env.local`. Never commit. |

## Verify — 验证

```bash
turso db shell brewlog "SELECT COUNT(*) FROM beans;"
```

Expected output: a single count of **8** (the seeded beans). Optionally also check `cafes` → 7 and `visits` → 9.

## Troubleshooting — 排错

1. **`turso: command not found` after install.** The curl installer puts the binary in `~/.turso`; restart the terminal or run `export PATH="$HOME/.turso:$PATH"`. For Homebrew, run `brew info turso` and check `brew doctor`.
2. **`401 Unauthorized` / token invalid or expired from the deployed app.** Tokens can be revoked or rotated. Generate a fresh one with `turso db tokens create brewlog`, update the Vercel env var, and redeploy. CLI auth itself expired? Re-run `turso auth login`.
3. **Ran `seed.sql` twice — duplicate rows.** Schema re-runs are harmless, but seeds insert again. Fix by wiping and redoing: open `turso db shell brewlog`, run `DROP TABLE visit_beans; DROP TABLE visits; DROP TABLE cafes; DROP TABLE beans;` (drop `visit_beans` and `visits` first — they reference the others), exit, then redo Step 6. Or nuke everything: `turso db destroy brewlog` (asks for confirmation) and restart from Step 3.
4. **`turso db create` fails with a plan/limit error.** Free tier allows up to 500 databases, but an old experiment may conflict on the name. `turso db list` to see existing DBs; reuse or `turso db destroy <name>` the stale one.
5. **`< schema.sql: no such file or directory`.** You're not in the repo root. `cd` to the `brewlog/` directory (it contains `schema.sql` and `seed.sql`) and retry.
