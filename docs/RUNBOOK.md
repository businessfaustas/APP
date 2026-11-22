# Runbook: operating FlagBid

When something is wrong, start here. Every procedure is short on purpose.

## The three levers, fastest first

| Lever | Time | What it does | How |
| --- | --- | --- | --- |
| **Roll back the deploy** | 1 minute | Serves the previous version of the code again, instantly, without a rebuild | Vercel → Project → Deployments → pick the last good one → ⋯ → **Promote to Production** |
| **Maintenance mode** | 2 minutes | Every page returns a friendly *We'll be right back* (503) and every API call returns 503. `/api/health` stays up so monitors see it is intentional | Vercel → Environment Variables → `MAINTENANCE_MODE=true` → Redeploy. Turn it off the same way |
| **Disable one feature** | 2 minutes | Removes a paid or risky integration without a code change | Delete its key in Vercel (for example `ANTHROPIC_API_KEY`) and redeploy: the app falls back to its no-key path (see *What each tool does for you* in `docs/LAUNCH-PLAN.md`) |

Rehearse the first lever once before launch. It is the one you will need at 2 a.m.

## Rolling back a bad deploy

1. **Promote the previous deployment** (above). This reverts code only.
2. **Check the database**: did this release include a migration (`prisma/migrations/<date>_...`)?
   - **No migration:** you are done.
   - **Additive migration** (new table or column, which is how we write them): old code ignores it, so rolling back is safe. Leave it.
   - **Destructive migration** (drop or rename): do not roll the database back by hand. Restore from backup into a *new* database (below), compare, and switch `DATABASE_URL` once verified.
3. Open an issue titled with the commit, paste the error from **Admin → Monitoring**, and write the cause. Fix forward on a branch; the next deploy goes through CI again.

**Rule for migrations (expand, then contract):** ship the new column or table first, deploy code that uses it, and only in a later release remove what is unused. Then every rollback is safe.

## The site is down

1. Open `https://<domain>/api/health`.
   - `databaseReachable: false`: the database is the problem. Check the provider status page and your plan (a paused free-tier project, a full disk, an expired password). Nothing in the app can fix this.
   - `ok: true` but pages fail: it is a bad deploy; **roll back**.
   - No answer at all: Vercel status page <https://www.vercel-status.com>; if Vercel is healthy, check Domains (expired domain, DNS change).
2. Turn on **maintenance mode** if you need time and users are hitting errors.
3. The uptime workflow opens an issue named *Site down* and closes it on recovery.

## Alerts you will receive, and what to do

| Alert | Meaning | Action |
| --- | --- | --- |
| New server / client / job / webhook error | An error with a cause we have not seen before | Admin → Monitoring → read the message and path; fix or roll back |
| A customer opened a payment dispute | A chargeback. Credits were already taken back | Stripe → Disputes → submit evidence **before the deadline** (usually 7 to 21 days) |
| A subscription payment failed | Card declined; the customer was emailed; Stripe retries | Nothing, unless it repeats |
| AI spend cap reached / 80% | Spend hit `AI_DAILY_BUDGET_USD` or `AI_MONTHLY_BUDGET_USD`; reports now use the no-AI path | Check Admin → Monitoring for a loop or abuse; raise the cap deliberately or wait for the reset |
| Paid page-reader cap reached / 80% | `SCRAPE_DAILY_CAP` | Same; users are asked to paste the listing text meanwhile |
| Account deleted but its Supabase identity remains | Auth deletion failed after the data was erased | Supabase → Authentication → Users → delete that user id |
| Deploy failed smoke test | The post-deploy check failed on the live site | Roll back, then investigate |

## Restoring the database from backup

You have two copies: the provider's (Supabase daily backups or point-in-time recovery) and ours (the nightly encrypted artifact from `.github/workflows/backup.yml`).

**Provider restore:** Supabase → Database → Backups → Restore (this replaces the live database; take a manual backup first).

**Our copy, into a new database (safest; nothing is overwritten):**

```bash
# 1. Download the artifact (GitHub → Actions → Database backup → run → Artifacts) and decrypt it
gpg --batch --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" -d -o restore.dump flagbid-YYYY-MM-DD.dump.gpg

# 2. Restore into an empty database you created (any Postgres 16)
pg_restore --no-owner --no-privileges --dbname "postgresql://…/new_db" restore.dump

# 3. Check it matches expectations, then point DATABASE_URL and DIRECT_URL at it and redeploy
node scripts/check-rls.mjs
```

**Prove it works (monthly):** `pnpm db:restore-test` dumps the live database, restores it into a throwaway one, compares every table's row count and row-level-security flag, and deletes the scratch database. Last run here: *23 tables, 1,924 rows, identical, RLS preserved*.

## Rotating keys

Rotate immediately if a key was pasted anywhere, committed, or an employee with access leaves.

1. Create the **new** key at the provider (Stripe, Anthropic, Supabase, Resend, ScrapingBee, eBay).
2. Put it in Vercel (replace the old value) and redeploy.
3. Verify in **Admin → Setup** (the *Test* button).
4. **Delete the old key** at the provider.
5. Supabase `service_role` and `anon` keys: Project Settings → API → *Roll* the JWT secret (this signs everyone out; do it off-peak). The database password: Project Settings → Database → Reset, then update `DATABASE_URL`/`DIRECT_URL`.
6. Run `node scripts/secret-scan.mjs --history` to confirm nothing is in git.

## Taking a customer request

| Request | How |
| --- | --- |
| "Delete my data" | They do it themselves: Settings → *Delete my account* (cancels billing, erases data, files and the sign-in identity). If they cannot sign in, delete the user in Supabase (Authentication → Users), cancel their Stripe subscription and delete the Stripe customer, then run `DELETE FROM "User" WHERE email = '…'` in the SQL editor (it cascades to everything they own). There is no admin "delete user" button yet. Invoices stay with Stripe by law |
| "Give me a copy of my data" | Settings → *Export my data (JSON)* |
| "Stop emailing me" | The *Unsubscribe* link in any email, or Settings |
| Copyright takedown | `/dmca` explains the process. Disable the shared link: `UPDATE "Analysis" SET "shareToken" = NULL WHERE "shareToken" = '<token from the URL>'` in the SQL editor (the owner can also revoke it in the report). Answer within 1 to 2 business days |
| Refund | Stripe → Payments → Refund. The webhook takes the credits back automatically (proportionally for a partial refund) |
| Security report | `/.well-known/security.txt` lists `SUPPORT_EMAIL`. Acknowledge within 2 days, fix, then thank them |

## Routine checks

| When | What |
| --- | --- |
| Daily (2 minutes) | Admin → Monitoring: errors, spend, speed |
| Weekly | Merge Dependabot's grouped pull request after CI is green; read the DMARC reports |
| Monthly | `pnpm db:restore-test`; check spend dashboards at every provider; skim Stripe disputes |
| Quarterly | Rotate the API tokens you use most; rehearse the rollback; re-read this page |
| By 2027-01-31 | Re-check the two accepted audit findings in `scripts/audit-allowlist.json` (the audit job fails after that date until you do) |

## Where things live

| Thing | Location |
| --- | --- |
| Logs | Vercel → Project → Logs (structured JSON; filter by `event` or request id) |
| Errors | Admin → Monitoring (and Sentry if configured) |
| Database | Supabase → Table Editor / SQL Editor (row-level security is on everywhere) |
| Payments | Stripe dashboard |
| Deploys, rollback | Vercel → Deployments |
| CI, backups, uptime | GitHub → Actions |
