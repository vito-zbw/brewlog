# Google + GitHub Login Setup (Auth.js) — OAuth 登录配置

> **To the Claude assistant reading this:** the user has pasted this entire file into a fresh session and wants you to walk them through it. You have no other context about this project — everything you need is in this file. Run the CLI commands for them (ask before anything that changes the cloud database), and for browser steps give the exact click-path, then **wait for them to confirm** before moving on — the Google and GitHub dashboards cannot be automated. Collect the values in the table below, and finish only when the Verify step passes. The user is a beginner — go step by step, one step at a time. All commands run from the repo root (the `brewlog/` directory containing `package.json`).

## Goal — 目标

Enable real Google and GitHub login on the **deployed** BrewLog app at `https://<project>.vercel.app`, and link the sign-ins to the 3 existing users (Baiwei, Friend1, Friend2) so nobody loses their visit history. This means: generating `AUTH_SECRET`, creating one Google OAuth client and one GitHub OAuth app (optionally a second for local dev — usually unnecessary since dev login covers local) in their dashboards, putting each user's **real email** into the `users` table, and setting all credentials as Vercel environment variables.

**Local development does NOT need any of this.** With `AUTH_DEV_LOGIN=true` in `.env.local`, the login page shows one-click buttons to sign in as any seeded user — no Google, no GitHub, no internet. Auth.js reads all the variables below automatically by naming convention; **zero code changes** are involved in this entire guide. Providers self-activate when their env vars are present, and the login page simply hides the button for any provider that isn't configured.

## 何时需要 When you need this

- ✅ Phase 3 is deployed (or about to be) and you want real people to log in on the live site.
- ✅ Before your 2 friends sign in for the **first** time — Step 4 (email linking) must happen first, or they'll get fresh empty accounts.
- ✅ Later, after adding a custom domain (`docs/setup/custom-domain.md`) — you'll come back to add one redirect URI per provider.
- ❌ NOT needed for local dev: `AUTH_DEV_LOGIN=true` in `.env.local` covers everything (`npm run dev`, tests, demos).

## Prerequisites — 前置条件

- `docs/setup/turso-setup.md` and `docs/setup/vercel-deploy.md` completed: the app is live at `https://<project>.vercel.app` and the Turso CLI is logged in. Have your exact production URL on hand — the redirect URIs below must match it character-for-character.
- A Google account (for Google Cloud Console) and a GitHub account.
- The real email address each of the 3 users will sign in with. **Important:** for Google login that's their Google account email; for GitHub login it's the primary email on their GitHub account. If someone will use both providers, both must resolve to the same address (or you pick one provider per person).
- You are in the repo root for all commands below.

## Steps — 步骤

### 1. Generate and set `AUTH_SECRET` — 生成签名密钥

`AUTH_SECRET` signs the session cookies (JWTs). It's required **everywhere** auth runs. Your `.env.local` should already contain one for local dev — leave it alone. Production gets its **own, different** value:

```bash
openssl rand -base64 33
```

(Equivalent alternative: `npx auth secret` — but that writes into `.env.local`, which you don't want here, so prefer `openssl` for the production value.)

Copy the output and add it on Vercel: project → **Settings** → **Environment Variables** → Name `AUTH_SECRET`, paste the value, check **Production** → **Save**. (Same flow as `docs/setup/vercel-deploy.md` Step 5.) Don't redeploy yet — we'll batch all the variables in Step 5.

Notes you don't need to act on (Auth.js handles them): on Vercel, `AUTH_URL` is auto-detected — do not set it. `AUTH_TRUST_HOST` is only needed when hosting somewhere *other* than Vercel.

### 2. Create the Google OAuth client — 创建 Google OAuth 客户端

All in the browser at <https://console.cloud.google.com> (sign in with your Google account; the console UI shifts occasionally, so treat these as landmarks):

1. **Create a project:** top bar project picker → **New Project** → name it `brewlog` → **Create**, then make sure it's the selected project.
2. **Consent screen:** left menu → **APIs & Services** → **OAuth consent screen**. Choose **External** (the only option without a Google Workspace org). Fill the minimum: App name `BrewLog`, User support email = your email, Developer contact = your email → save through the remaining screens (scopes etc. can stay at defaults — Auth.js only requests basic profile + email).
3. **Test users:** while the app's Publishing status is "Testing", **only listed test users can log in**. In the consent screen section, find **Test users** (in newer consoles: **Audience**) → **Add users** → add all 3 users' real Google emails. *Alternative:* click **Publish app** to move to "In production" — then anyone can log in, with no Google review needed for basic email/profile scopes (users just see an "unverified app" notice).
4. **Create the client:** **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID** → Application type **Web application** → name `brewlog`.
5. **Authorized redirect URIs** — add **both**, as exact strings (replace `<project>` with your real Vercel subdomain; no trailing slash):

   ```
   http://localhost:3000/api/auth/callback/google
   https://<project>.vercel.app/api/auth/callback/google
   ```

   One Google client happily holds multiple redirect URIs, so the same client covers local and production. When you later add a custom domain, return here and add `https://<your-domain>/api/auth/callback/google` (see `docs/setup/custom-domain.md`).
6. Click **Create**. A dialog shows the **Client ID** (ends in `.apps.googleusercontent.com`) and **Client secret**. Save both — they become `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. The secret is a password; never commit it.

### 3. Create the GitHub OAuth apps — 创建 GitHub OAuth 应用

> **⚠️ Key difference from Google: a GitHub OAuth app accepts only ONE callback URL.** You cannot list both localhost and production in one app. The standard fix is **two apps**: `brewlog-prod` (required) and `brewlog-dev` (optional — only if you ever want to test real GitHub login locally; `AUTH_DEV_LOGIN` makes this unnecessary for everyday dev).

In the browser: github.com → your avatar (top right) → **Settings** → **Developer settings** (bottom of left sidebar) → **OAuth Apps** → **New OAuth App**.

**App 1 — `brewlog-prod` (required):**

| Field | Value |
| --- | --- |
| Application name | `brewlog-prod` |
| Homepage URL | `https://<project>.vercel.app` |
| Authorization callback URL | `https://<project>.vercel.app/api/auth/callback/github` |

Click **Register application**, then on the app page click **Generate a new client secret**. Save the **Client ID** and the secret — these go to **Vercel** as `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` (Step 5). The secret is shown only once.

**App 2 — `brewlog-dev` (optional):** repeat with name `brewlog-dev`, homepage `http://localhost:3000`, callback `http://localhost:3000/api/auth/callback/github`. Its credentials go in **`.env.local`** as `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`. Skip this entirely if dev login is enough (it usually is).

If you later add a custom domain, GitHub's one-callback limit bites again: either edit `brewlog-prod`'s callback URL to the new domain, or create a third app (see `docs/setup/custom-domain.md`).

### 4. Link the 3 existing accounts by real email — 用真实邮箱关联现有账号

**Do this BEFORE anyone signs in for the first time.** Auth.js links a sign-in to a BrewLog user **by email**: if the incoming email matches a row in `users`, that person gets their existing account and history; if it matches nothing, a **brand-new empty user is created**. The seeded users currently have placeholder emails (`baiwei@example.com`, `friend1@example.com`, `friend2@example.com`), which will never match a real sign-in.

There are two paths depending on your database's state:

**Path A — recommended for an already-migrated (Phase 3 schema) database: direct SQL UPDATE.** If the cloud database already has the `users` table (fresh Phase 3 installs and already-migrated databases do), just overwrite the placeholders. Check first, then update each user:

```bash
turso db shell brewlog "SELECT id, name, email FROM users;"
turso db shell brewlog "UPDATE users SET email = 'real-baiwei@gmail.com' WHERE name = 'Baiwei';"
turso db shell brewlog "UPDATE users SET email = 'real-friend1@gmail.com' WHERE name = 'Friend1';"
turso db shell brewlog "UPDATE users SET email = 'real-friend2@gmail.com' WHERE name = 'Friend2';"
```

(Replace with each person's real provider email — see Prerequisites. Re-run the `SELECT` to confirm.)

**Path B — for a pre-Phase-3 database (still has text `created_by`/`visited_by` columns, no `users` table):** the migration script creates the `users` table and converts text names to `user_id` foreign keys, reading emails from a mapping file. Edit `scripts/user-mapping.json` and replace the three `@example.com` placeholders with real emails, **back up first** (`turso db shell brewlog .dump > backup.sql`), then run the migration against the cloud database:

```bash
TURSO_AUTH_TOKEN="$(turso db tokens create brewlog)" \
  npm run migrate:phase3 -- "$(turso db show brewlog --url)"
```

(The token prefix is required — the script refuses remote URLs without `TURSO_AUTH_TOKEN`; alternatively uncomment the token line in `.env.local`. The script is idempotent-guarded and preserves all rows and ids; without the URL argument it targets the database from `.env.local`, i.e. usually the local file DB.)

### 5. Set all variables on Vercel and redeploy — 配置 Vercel 环境变量并重新部署

On Vercel: project → **Settings** → **Environment Variables**, add each of these for **Production** (CLI alternative: `vercel env add <NAME> production`):

| Name | Value |
| --- | --- |
| `AUTH_SECRET` | from Step 1 (already added) |
| `AUTH_GOOGLE_ID` | Google Client ID (Step 2) |
| `AUTH_GOOGLE_SECRET` | Google Client secret (Step 2) |
| `AUTH_GITHUB_ID` | `brewlog-prod` Client ID (Step 3) |
| `AUTH_GITHUB_SECRET` | `brewlog-prod` client secret (Step 3) |

**⚠️ NEVER set `AUTH_DEV_LOGIN` on Vercel — in any environment.** It is the local one-click login bypass; on a live site it would let anyone log in as anyone. Also do not set `AUTH_URL` (auto-detected on Vercel).

Watch for trailing whitespace/newlines when pasting, and exact names — Auth.js finds these purely by name, so `AUTH_GOOGLE_ID` works and `GOOGLE_CLIENT_ID` silently does nothing.

Then **redeploy** (env changes never apply to existing deployments): dashboard → **Deployments** → latest → **⋯** → **Redeploy**, or `vercel deploy --prod`, or push any commit.

## Values to collect — 需要收集的值

| Value | Where it comes from | Where it goes |
| --- | --- | --- |
| `AUTH_SECRET` | `openssl rand -base64 33` | Vercel env var (Production); `.env.local` already has its own |
| `AUTH_GOOGLE_ID` | Google Cloud Console → Credentials → OAuth client | Vercel env var (Production) |
| `AUTH_GOOGLE_SECRET` | same dialog as above | Vercel env var (Production). Never commit. |
| `AUTH_GITHUB_ID` | GitHub OAuth app `brewlog-prod` | Vercel env var (Production) |
| `AUTH_GITHUB_SECRET` | `brewlog-prod` → Generate a new client secret | Vercel env var (Production). Never commit. |
| `brewlog-dev` ID/secret (optional) | GitHub OAuth app `brewlog-dev` | `.env.local` only |
| 3 real user emails | each user's Google/GitHub account | `users.email` in Turso (Step 4) |

## Verify — 验证

1. Open `https://<project>.vercel.app/login` in a browser — **both** a Google and a GitHub sign-in button appear (a missing button = that provider's env vars aren't set; see Troubleshooting 4).
2. Sign in with your own Google (or GitHub) account. You should land back in the app, and the nav shows your avatar/name instead of a login link.
3. Confirm the sign-in linked to the existing user instead of creating a new one:

```bash
turso db shell brewlog "SELECT id, name, email FROM users;"
```

Expected: still exactly **3 rows** (Baiwei, Friend1, Friend2) with the real emails from Step 4, and your row may now have an `image` avatar URL. A **4th row** means the email didn't match — see Troubleshooting 3.

4. Optionally repeat with the other provider, and have one friend sign in while you watch the `users` table stay at 3 rows.

## Troubleshooting — 排错

1. **Google `Error 400: redirect_uri_mismatch` / GitHub "The redirect_uri MUST match the registered callback URL".** The redirect URI is compared as an **exact string** — scheme, host, path, no trailing slash. The error page usually shows the URI the app sent; copy it verbatim into Google's Authorized redirect URIs (Credentials → your client → edit) or the GitHub app's callback field. Classic causes: `http` vs `https`, a preview-deployment URL (`brewlog-git-main-...`) instead of the production URL, the custom domain not yet added, or editing the wrong GitHub app (dev vs prod). Google changes can take a few minutes to propagate.
2. **Google shows "Access blocked: brewlog has not completed the Google verification process" (or an "unverified app" warning).** Your consent screen is in **Testing** and the email signing in isn't a listed test user — add it under Test users (Step 2.3), or click **Publish app**. The yellow "Google hasn't verified this app" interstitial after publishing is normal for a 3-user hobby app — click **Continue** / Advanced → proceed.
3. **A sign-in created a duplicate brand-new user (4th row in `users`).** The provider email didn't match any `users.email` — typo, or the person's GitHub primary email differs from the Gmail you stored. Fix: find both ids with `SELECT id, name, email FROM users;`, move anything the new account already created, delete the duplicate, and correct the original's email:

   ```bash
   turso db shell brewlog "UPDATE visits SET user_id = 2 WHERE user_id = 4;"   # repeat for beans/cafes/photos if they created any
   turso db shell brewlog "DELETE FROM users WHERE id = 4;"
   turso db shell brewlog "UPDATE users SET email = 'the-actual-email@gmail.com' WHERE id = 2;"
   ```

   (Here `4` = duplicate, `2` = the intended user — substitute your real ids/email. The person should sign out and back in.)
4. **A provider's button is missing on `/login`.** That's the app working as designed: providers self-activate only when their env vars exist. So the var is missing, typo'd (must be exactly `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`), saved for Preview but not **Production**, or you forgot to redeploy after adding it. Check Settings → Environment Variables (or `vercel env ls`), fix, **redeploy**.
5. **Sign-in fails with a server error; Vercel logs show JWT/JWE/`MissingSecret` errors.** `AUTH_SECRET` is missing in Production (or was added without a redeploy). Set it (Step 1) and redeploy. Note: if you ever rotate `AUTH_SECRET`, all existing sessions are invalidated — everyone just logs in again, no data is lost.
6. **Login works on the Vercel URL but not on the custom domain.** Each provider needs the custom-domain callback URI too — Google: add it alongside the existing ones; GitHub: one callback per app, so edit `brewlog-prod` or make a third app. See `docs/setup/custom-domain.md`.
