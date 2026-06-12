# Custom Domain for BrewLog — 自定义域名配置

> **To the Claude assistant reading this:** the user has pasted this entire file into a fresh session and wants you to walk them through it. You have no other context about this project — everything you need is in this file. Most of this setup happens in browser dashboards: explain each click-path before they do it, run the terminal verification commands for them, and wait for confirmation before moving on. Ask before anything that costs money (Step 1 is the only such step). The user is a beginner — go step by step, one step at a time.

## Goal — 目标

Put the deployed BrewLog app on your own domain (e.g. `https://brewlog.example.com` or `https://yourdomain.com`) instead of the default `https://<project>.vercel.app`, with automatic HTTPS, and keep Google/GitHub login working on the new address.

**⚠️ This is the ONLY step in the entire BrewLog project that can cost money.** Domain registration is roughly **US$10/year** (varies by ending: `.com` ≈ $10, some endings cheaper or pricier). Everything else — Vercel, Turso, R2, Auth.js — stays on free tiers. This whole doc is **entirely optional**: the app works perfectly on the free `*.vercel.app` URL forever. Skip it if you don't want a custom domain.

## 何时需要 When you need this

- ✅ You want a memorable address to share with friends instead of `brewlog-xxxx.vercel.app`.
- ✅ Phase 3 is deployed and you're polishing for "real" use.
- ❌ NOT needed for local dev, for the app to function, or for login to work — the `.vercel.app` URL does all of that for free.
- ❌ NOT needed if you already own a domain — then skip Step 1 and start at Step 2.

## Prerequisites — 前置条件

1. **`docs/setup/vercel-deploy.md` completed** — BrewLog is live at `https://<project>.vercel.app` and you can open the Vercel dashboard for the project.
2. **`docs/setup/oauth-setup.md` completed** (or at least started) — you have a Google OAuth client and/or a GitHub OAuth app for production. Step 6 updates them for the new domain.
3. An account at a domain registrar. Recommended: **Cloudflare Registrar** (at-cost pricing, no markup) or **Namecheap** (beginner-friendly). Any registrar works — you only need to edit DNS records there.
4. A browser, and a terminal with `dig` and `curl` (preinstalled on macOS).

## Steps — 步骤

### 1. Register a domain — 注册域名（唯一花钱的一步）

Skip if you already own one. Otherwise:

1. Go to your registrar — Cloudflare: <https://domains.cloudflare.com> · Namecheap: <https://www.namecheap.com>.
2. Search for a name you like (e.g. `yourname-coffee.com`). Check the **yearly renewal price**, not just the first-year promo — ~$10/yr for `.com` is normal.
3. Buy it. **Decline all upsells** (email hosting, "premium DNS", SSL certificates — Vercel provides HTTPS for free).

Throughout the rest of this doc, replace `yourdomain.com` with the domain you actually bought.

### 2. Add the domain to the Vercel project — 在 Vercel 添加域名

1. Open <https://vercel.com/dashboard> → click your **brewlog** project → **Settings** → **Domains**.
2. Type your domain into the **Add** box and click **Add**.
   - **Apex domain** (`yourdomain.com`): add this first. Vercel will offer to also add `www.yourdomain.com` with a redirect — accept the recommended option (usually: `www` redirects to the apex, or vice versa; either is fine, just pick one and keep it).
   - **Subdomain** (e.g. `brewlog.yourdomain.com`): also fine if you want to keep the apex for something else — add just the subdomain instead.
3. Vercel now shows the domain with an **"Invalid Configuration"** warning and displays the **exact DNS records** it needs. **Keep this page open** — Step 3 copies from it.

### 3. Create the DNS records at the registrar — 在注册商处添加 DNS 记录

In another tab, open your registrar's DNS management page (Cloudflare: domain → **DNS** → **Records**; Namecheap: Domain List → **Manage** → **Advanced DNS**). Create the records **exactly as the Vercel Domains page displays them**. Typical values:

| Type | Name / Host | Value |
| --- | --- | --- |
| `A` | `@` (the apex) | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

**⚠️ These typical values can vary — the Vercel dashboard is authoritative.** Vercel sometimes issues different targets (e.g. a `*.vercel-dns-016.com` CNAME). Always copy what *your* Domains page shows, not this table. Notes:

- Delete any pre-existing `A`/`CNAME`/`URL-redirect` records the registrar created on `@` or `www` (parking pages) — they conflict.
- On Cloudflare, set the records to **DNS only** (grey cloud), not **Proxied** (orange cloud) — proxying interferes with Vercel's certificate issuance.
- For a subdomain-only setup, you'll just have one `CNAME` record for that subdomain.

### 4. Wait for DNS and the HTTPS certificate — 等待 DNS 生效和证书签发

1. Back on the Vercel **Domains** page, click **Refresh**. When DNS has propagated, the warning flips to **"Valid Configuration"** and Vercel automatically issues a free HTTPS certificate (Let's Encrypt) — no action needed from you.
2. This usually takes **a few minutes**, occasionally up to a few hours, worst case 24–48h for some registrars.
3. Check propagation from the terminal:

```bash
dig +short yourdomain.com
dig +short www.yourdomain.com
```

Expected: the apex returns the `A` value Vercel asked for (typically `76.76.21.21`); `www` returns a `vercel-dns` hostname. Empty output or old values = still propagating; wait and retry.

### 5. Update Google login for the new domain — 更新 Google 登录

(Skip any provider you didn't set up in `oauth-setup.md`.)

1. Open <https://console.cloud.google.com/apis/credentials> → click your BrewLog OAuth client.
2. Under **Authorized redirect URIs**, click **Add URI** and add:

```
https://yourdomain.com/api/auth/callback/google
```

3. Keep the existing `https://<project>.vercel.app/api/auth/callback/google` entry too — Google allows multiple URIs, and keeping both means login works on both addresses.
4. Under **Authorized JavaScript origins** (if you set them), also add `https://yourdomain.com`.
5. **Save**. Google changes can take a few minutes to apply.

### 6. Update GitHub login for the new domain — 更新 GitHub 登录

GitHub OAuth apps only allow **one** callback URL per app, so you have two options:

- **Option A (simple):** repoint the existing production app. <https://github.com/settings/developers> → **OAuth Apps** → **brewlog-prod** → change **Authorization callback URL** to `https://yourdomain.com/api/auth/callback/github` and update **Homepage URL** to match → **Update application**. ⚠️ GitHub login on the old `.vercel.app` URL stops working — fine once everyone uses the new domain.
- **Option B (both URLs keep working):** create a third OAuth app (e.g. `brewlog-domain`) with the callback above, then on Vercel replace `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` with the new app's values... which again means only one app is active. In practice, **Option A is recommended** — one production GitHub app, pointed at the canonical domain.

### 7. (Only if needed) Pin AUTH_URL on Vercel — 按需固定 AUTH_URL

Normally **skip this** — on Vercel, Auth.js auto-detects the request host, so no `AUTH_URL` is needed. But if sign-in misbehaves across the two addresses (e.g. you start login on `yourdomain.com` and land back on `…vercel.app`, or callback errors mention the wrong host), pin the canonical URL:

1. Vercel dashboard → project → **Settings** → **Environment Variables** → add `AUTH_URL` = `https://yourdomain.com` (Production).
2. **Redeploy** (env changes never apply to existing deployments — see `docs/setup/vercel-deploy.md` Step 5).
3. Note: with `AUTH_URL` pinned, login only works on `yourdomain.com` — treat the `.vercel.app` URL as retired.

## Values to collect — 需要收集的值

| Value | Where it comes from | Where it goes |
| --- | --- | --- |
| Your domain (`yourdomain.com`) | Registrar purchase (Step 1) | Vercel → Settings → Domains (Step 2); OAuth consoles (Steps 5–6) |
| Exact DNS record(s) (typically `A 76.76.21.21`, `CNAME cname.vercel-dns.com`) | Vercel Domains page (Step 2) — authoritative | Registrar DNS records (Step 3) |
| Google redirect URI `https://yourdomain.com/api/auth/callback/google` | This doc (Step 5) | Google Cloud Console → OAuth client |
| GitHub callback URL `https://yourdomain.com/api/auth/callback/github` | This doc (Step 6) | GitHub OAuth app `brewlog-prod` |
| `AUTH_URL` = `https://yourdomain.com` | Only if Step 7 applies | Vercel env vars (Production) + redeploy |

## Verify — 验证

1. Open `https://yourdomain.com` in a browser. The BrewLog **dashboard** loads — since Phase 4 the site is public-read, so anonymous visitors see the public dashboard with a 登录 login prompt section in place of personal stats (that is correct, not an error). Check the **padlock icon** (valid HTTPS) in the address bar with no certificate warning. If you are already signed in, your personal stats show instead.
2. `https://www.yourdomain.com` redirects to the apex (or vice versa, whichever you picked in Step 2).
3. **Full login round-trip on the domain:** click 登录 (sign in) → choose Google (and/or GitHub) → complete the provider's consent screen → you land back on `https://yourdomain.com` **logged in as your BrewLog user** (your name shows, your visits are yours). If you bounce to `.vercel.app` mid-flow or get an OAuth error, see Troubleshooting.
4. Terminal spot-check:

```bash
curl -sI https://yourdomain.com | head -n 1
```

Expected: `HTTP/2 200` — the public dashboard is served to anonymous requests (no longer a `307` to `/login`). A `307`/`308` only appears on the www-redirect variant (whichever of `www`/apex you chose to redirect in Step 2). A `500` or certificate error means something is wrong.

## Troubleshooting — 排错

1. **Vercel stuck on "Invalid Configuration" / `dig` returns nothing or old values.** DNS propagation can genuinely take hours (rarely 24–48h). Confirm the records at the registrar **exactly match** the Vercel Domains page (re-check Type, Host, Value — `@` vs blank vs full domain naming differs by registrar). Delete leftover parking/redirect records on the same names. On Cloudflare, make sure records are **DNS only** (grey cloud). Then wait and click **Refresh** on the Vercel page.

2. **DNS is valid but the certificate never issues (browser shows a cert error).** A `CAA` DNS record at your domain may be blocking issuance. Check: `dig +short CAA yourdomain.com`. If it returns entries that don't include `letsencrypt.org`, either delete the CAA records or add one allowing Let's Encrypt: `0 issue "letsencrypt.org"`. No CAA records at all = no problem.

3. **Login starts on `yourdomain.com` but loops/lands back on `…vercel.app` (or vice versa).** This is the cross-domain redirect problem — fix by pinning `AUTH_URL=https://yourdomain.com` on Vercel and redeploying (Step 7). Pick one canonical domain and use only that from now on.

4. **`redirect_uri_mismatch` (Google) or "redirect_uri is not associated with this application" (GitHub) after switching domains.** The provider doesn't know the new callback URL. Google: the OAuth client must list `https://yourdomain.com/api/auth/callback/google` **exactly** (https, no trailing slash, no `www` mismatch — if users hit the `www` variant, add that URI too). GitHub: the single callback URL on `brewlog-prod` must be `https://yourdomain.com/api/auth/callback/github` (Step 6). Recent Google edits can take a few minutes to propagate.

5. **Logged in successfully but landed in a brand-new empty account.** Not a domain problem — Auth.js links sign-ins to BrewLog users **by email**, and the seeded users have placeholder emails. Fix per `docs/setup/oauth-setup.md`: put the real email on the right user, e.g. `turso db shell brewlog "UPDATE users SET email = 'real@gmail.com' WHERE name = 'Baiwei';"`, then delete the accidentally created user row if needed.

6. **Worried about renewal costs.** The domain is the only recurring cost (~$10/yr at renewal). If you let it lapse, nothing breaks except the address — the app keeps running on `https://<project>.vercel.app` (remove `AUTH_URL` and restore the `.vercel.app` OAuth callbacks if you set them to the domain).
