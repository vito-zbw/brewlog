# Email + Password Login — 邮箱密码登录 (Phase 5)

A third sign-in method alongside Google / GitHub OAuth: users register with an
email and password and sign in at `/login`. **Open registration** — anyone can
create an account at `/register`. No external services, no new env vars, free.

## What it needs

- `AUTH_SECRET` — already required for all auth (it signs the session cookie).
- The `users.password_hash` column — added by `scripts/migrate-phase5.mjs`.

That's it. Passwords are hashed with Node's built-in `scrypt` (no dependency),
stored as `scrypt$<salt>$<hash>` in `users.password_hash`. OAuth/dev-login
users keep `password_hash = NULL` and can never be logged into with a password.

## Deploy (order matters)

Migrate production **before** pushing the code (new code reads the column;
old code tolerates it). The migration is idempotent — safe to re-run.

```bash
# 1. Migrate prod FIRST
TURSO_AUTH_TOKEN="$(turso db tokens create brewlog)" \
  npm run migrate:phase5 -- "$(turso db show brewlog --url)"

# 2. Then push (auto-deploys on Vercel)
git push origin main
```

## Resetting a forgotten password (the $0 "forgot password")

There is no self-service password-reset email (by design — see below). To reset
or set a password for someone, run the script (locally or against prod):

```bash
# Local DB
npm run reset-password -- someone@example.com their-new-password

# Production DB
TURSO_AUTH_TOKEN="$(turso db tokens create brewlog)" \
  npm run reset-password -- someone@example.com their-new-password "$(turso db show brewlog --url)"
```

This is also how you give an existing OAuth-only account a password.

## Recommended: rate limiting (free)

Password login invites brute-force guessing, and nothing throttles it by
default. Enable a **Vercel WAF rate-limit rule** (free on all plans, no code) in
the dashboard: Project → Firewall → Rate Limiting → a rule on `POST /login` and
`POST /register` (e.g. 10 requests / 60s per IP). Dashboard-only; not in code.

## Known limitations (deliberate, to stay $0)

- **No email verification.** Registration refuses an email that already exists,
  so an existing account (OAuth or password) can never be taken over. But a
  brand-new, unowned email *can* be registered. If the real owner of that email
  later signs in with Google, the accounts merge by email and the original
  registrant would retain password access. Closing this fully requires email
  verification (an email service + a domain). Acceptable for a small trusted
  group; revisit if abuse appears.
- **No password-reset email.** Use `npm run reset-password` (above).
- **Sessions can't be force-revoked** (JWT, no DB session store): a password
  reset does not end other already-open sessions until they expire.

To add the email features later: integrate a free email provider (e.g. Resend)
with your own domain, then add verification + reset token flows. The current
schema and code leave room for this with no rework to what exists.
