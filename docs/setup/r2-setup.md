# Cloudflare R2 Photo Storage Setup — Cloudflare R2 图片存储配置

> **To the Claude assistant reading this:** the user has pasted this entire file into a fresh session and wants you to walk them through it. Your job: explain each browser step before they do it (this setup is almost entirely click-path, not CLI), collect the five values in the table below as they appear, run the verification commands for them at the end, and finish only when the Verify step passes. The user is a beginner — go step by step, one step at a time.

## Goal — 目标

Set up a Cloudflare R2 bucket (free tier, 10 GB storage) so the **deployed** BrewLog app on Vercel can store uploaded photos (bean packaging, café storefronts, latte art), and collect the five `R2_*` environment variables that Vercel needs.

**Local development does NOT need this.** When the R2 env vars are absent, the app automatically stores photos on local disk under `data/uploads/` and serves them via `/api/uploads/...` — uploads work offline with zero cloud accounts. This doc is only needed so the **deployed** app can store photos (Vercel's filesystem is ephemeral, so local-disk storage does not survive there).

**⚠️ Heads-up before you start:** Cloudflare requires adding a **payment method** (credit card or PayPal) to enable R2, even on the $0 plan. You will not be charged at BrewLog's scale — the free tier covers 10 GB storage and 10M reads/month — but the card prompt is unavoidable. If you're not comfortable with that, stay on local-disk storage and skip deploying photo features.

## 何时需要 When you need this

- ✅ Before deploying Phase 2 (photo uploads) to Vercel — without R2, every photo upload on the deployed app fails with a 500 error (Vercel's filesystem is read-only, so the local-disk fallback cannot write). Enable R2 **before** uploading any production photos: photo URLs are computed from the active backend, so photos uploaded under one backend become broken images after switching to the other.
- ✅ If you deliberately want local dev to upload to the real R2 bucket (optional, for testing).
- ❌ NOT needed for everyday local dev, `npm run dev`, or `npm run verify` — local uploads go to `data/uploads/` automatically.

## Prerequisites — 前置条件

- A browser and an email address to sign up for Cloudflare (free).
- A payment method (credit card or PayPal) — required by Cloudflare to enable R2, see the heads-up above.
- The Vercel project from `docs/setup/vercel-deploy.md` already exists (that's where these values go).

## Steps — 步骤

### 1. Create a Cloudflare account — 注册账号

Go to <https://dash.cloudflare.com/sign-up> in a browser. Click-path: enter email + password → verify your email from the confirmation message → land on the Cloudflare dashboard. If you already have an account, just log in at <https://dash.cloudflare.com>.

### 2. Enable R2 and add a payment method — 启用 R2

In the dashboard's left sidebar, click **R2 Object Storage**. The first time, Cloudflare shows a purchase/activation screen for the **R2 $0/month plan**: click through it and add a payment method when prompted. This is the unavoidable card step — the plan itself costs $0 and BrewLog stays far inside the free tier.

### 3. Create the bucket — 创建存储桶

Click-path: **R2 Object Storage** → **Create bucket** →

- **Bucket name:** `brewlog-photos` (use exactly this — it becomes `R2_BUCKET_NAME`)
- **Location:** choose **Asia-Pacific (APAC)** under the location hint/region option (closest to Guangzhou users)
- Leave everything else at defaults → **Create bucket**.

### 4. Enable the public development URL — 启用公开访问

Photos are displayed by linking directly to the bucket, so it needs a public URL. Click-path: open the `brewlog-photos` bucket → **Settings** tab → find **Public access** / **R2.dev subdomain** → click **Allow Access** → type the confirmation word Cloudflare asks for → it shows a URL like:

```
https://pub-1a2b3c4d5e6f.r2.dev
```

Save it — this is `R2_PUBLIC_URL` (**no trailing slash**).

The r2.dev development URL is recommended over a custom domain: zero configuration and free. It is rate-limited by Cloudflare, but that's fine at hobby scale (3 users). If BrewLog ever goes public in Phase 4, you can connect a custom domain in the same Settings tab and just change `R2_PUBLIC_URL` — no code or data changes needed.

### 5. Create an API token — 创建 API 令牌

Click-path: back at the **R2 Object Storage** overview → **Manage R2 API Tokens** (sometimes under the `{ } API` button at top right) → **Create API token** →

- **Token name:** anything, e.g. `brewlog-vercel`
- **Permissions:** **Object Read & Write**
- **Specify bucket(s):** scope it to **only** the `brewlog-photos` bucket (least privilege)
- Leave TTL/expiry as "forever" unless you enjoy rotating tokens → **Create API Token**.

The next screen shows the credentials **once**. Copy both now:

- **Access Key ID** → this is `R2_ACCESS_KEY_ID`
- **Secret Access Key** → this is `R2_SECRET_ACCESS_KEY` (treat like a password; never commit)

(The same screen also shows an S3 endpoint URL like `https://<account-id>.r2.cloudflarestorage.com` — you do NOT need to save it. The app derives the endpoint in code from the account ID; it is not an env var.)

### 6. Find your Account ID — 查找账户 ID

Click-path: Cloudflare dashboard home → right sidebar shows **Account ID** with a copy button. It's also the hex string in your dashboard URL: `dash.cloudflare.com/<account-id>/...`. Save it — this is `R2_ACCOUNT_ID`.

### 7. Skip CORS — 跳过 CORS 配置

**You do NOT need to configure CORS, even though most R2 guides tell you to.** BrewLog's uploads go through the app's own server (a Next.js route handler calls S3 `PutObject` server-side — the browser never talks to R2 directly), and browsers only fetch images via `<img>` tags, which are not subject to CORS. If a tutorial or a future assistant suggests adding a CORS policy to the bucket, decline — it's unnecessary for this app.

### 8. Put the values where they belong — 配置环境变量

**For Vercel (the main reason you're here):** in the Vercel dashboard → your BrewLog project → **Settings → Environment Variables**, add all five for the **Production** environment:

```
R2_ACCOUNT_ID=<from Step 6>
R2_ACCESS_KEY_ID=<from Step 5>
R2_SECRET_ACCESS_KEY=<from Step 5>
R2_BUCKET_NAME=brewlog-photos
R2_PUBLIC_URL=https://pub-<hash>.r2.dev
```

**All five must be set.** The app only activates R2 when every one of them is present — if any is missing, it silently falls back to local-disk storage (which doesn't work on Vercel; see Troubleshooting #5). Then **redeploy** — env var changes do not apply to already-running deployments.

**For local dev (optional):** to test real R2 uploads from your machine, add the same five lines to `.env.local` and restart `npm run dev`. Recommended: don't — keep local dev on the zero-config `data/uploads/` fallback, so local photo experiments never pollute the production bucket. All variable names are documented in the committed `.env.example`.

## Values to collect — 需要收集的值

| Value | Where it comes from | Where it goes |
| --- | --- | --- |
| `R2_ACCOUNT_ID` | Dashboard home → right sidebar "Account ID" (also in the dashboard URL) | Vercel env vars (Production); optionally `.env.local` |
| `R2_ACCESS_KEY_ID` | Step 5 token-creation screen (shown once) | Vercel env vars; optionally `.env.local` |
| `R2_SECRET_ACCESS_KEY` | Step 5 token-creation screen (shown once) | Vercel env vars; optionally `.env.local`. Never commit. |
| `R2_BUCKET_NAME` | Always `brewlog-photos` (the name from Step 3) | Vercel env vars; optionally `.env.local` |
| `R2_PUBLIC_URL` | Step 4 — `https://pub-<hash>.r2.dev`, **no trailing slash** | Vercel env vars; optionally `.env.local` |

## Verify — 验证

1. Redeploy on Vercel (env changes need a fresh deployment).
2. Open the live site, go to any bean / café / visit detail page, and upload a photo. The image should render on the page, and its URL should start with your `https://pub-….r2.dev` domain (right-click → "Copy Image Address" to check). If it starts with `/api/uploads/`, R2 did not activate — see Troubleshooting #5.
3. Confirm the object landed in the bucket: Cloudflare dashboard → **R2** → **brewlog-photos** → **Objects** tab — you should see a key like `bean/<uuid>.jpg`.
4. From the terminal (replace with your real values):

```bash
curl -sI https://pub-<hash>.r2.dev/<key-from-step-3>
```

Expected: `HTTP/2 200` with a `content-type: image/...` header.

## Troubleshooting — 排错

1. **R2 pages show an error / won't activate until billing is set up.** Cloudflare requires a payment method on file to enable R2, even for the $0 plan. Dashboard → **Billing** → add a credit card or PayPal, then retry Step 2. You will not be charged within free-tier limits.
2. **Uploads fail with `403 Forbidden` / `Access Denied`.** The API token is usually the culprit: it was scoped to the wrong bucket (or created before the bucket existed), or has read-only permission. Create a new token (Step 5) with **Object Read & Write** scoped to `brewlog-photos`, update `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` on Vercel, and redeploy.
3. **Uploads succeed (objects appear in the dashboard) but images 404 in the browser.** The bucket's public r2.dev URL is not enabled, or `R2_PUBLIC_URL` is wrong. Redo Step 4, confirm **Public access** says "Allowed", and check the env var matches the shown URL exactly — `https://pub-<hash>.r2.dev` with no trailing slash.
4. **Changed env vars but behavior didn't change.** Vercel env vars only apply to new deployments. Trigger a redeploy (Vercel dashboard → Deployments → ⋯ → Redeploy, or push a commit) after any env var change.
5. **Every photo upload fails with 500「上传照片失败」on Vercel only.** One or more of the five `R2_*` vars is missing or typo'd, so the app fell back to local-disk storage — and Vercel's filesystem is read-only, so the write throws. How to spot it: the Vercel function logs show a `storage: R2 config incomplete — missing …` warning naming the missing variables (plus an `EROFS` error), photo URLs of any older photos start with `/api/uploads/` instead of `https://pub-….r2.dev/`, and no objects appear in the Cloudflare dashboard. Fix: check all **five** variables exist in Vercel's Production environment, then redeploy.
6. **Photos uploaded before R2 was enabled show as broken images after enabling it.** Photo URLs are computed from the currently-active backend, so rows created under local-disk storage point at R2 objects that don't exist (and vice versa). Delete those photos via the ✕ button on their gallery entries and re-upload.
