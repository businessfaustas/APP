# FlagBid launch plan: what to connect, in what order

The app is finished and runs end to end today. **Everything below is connecting accounts and
filling in your details; none of it needs code changes.** Each step says how long it takes, what it
unlocks, what the app does until you do it, and exactly which variable to set (in Vercel →
Project → Settings → Environment Variables, then redeploy).

> Check your progress at any time: sign in as an admin → **Admin → Setup & API keys**. Each service
> shows *Connected* or *Using fallback*, with a **Test** button that checks the key works.
> **Admin → Monitoring** shows errors, AI spend, page speed and analytics once you are live.

---

## 0. Right now (15 minutes): rotate anything that was exposed

Anything pasted into a chat, a screenshot or a document should be treated as leaked.

| Do this | Why |
| --- | --- |
| **Rotate your ScrapingBee API key** (ScrapingBee dashboard → regenerate), then set the new one only in Vercel as `SCRAPINGBEE_API_KEY` | The old key was pasted into an AI chat during development |
| Rotate any other key you ever pasted into an AI tool, an email or a ticket (Stripe, Supabase `service_role`, Anthropic, database password) | A transcript is outside your control |
| Never put keys in the repository. `node scripts/secret-scan.mjs --history` checks every file and every past commit (last run: clean) | CI runs it on every push |

---

## 1. Real accounts: Supabase (45 minutes) — *required for launch*

**Unlocks:** sign-up and sign-in for your customers (email link + Google), a real database, durable photo storage.
**Until then:** only the shared demo account can sign in.

1. supabase.com → New project (pick the EU region closest to your customers). Save the database password in a password manager.
2. **Project Settings → API:** copy the *Project URL*, the *anon* key and the *service_role* key.
3. **Project Settings → Database → Connection string:** copy the *pooled* string (port 6543, add `?pgbouncer=true`) and the *direct* string (port 5432).
4. In Vercel set:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only, never `NEXT_PUBLIC_`),
   `DATABASE_URL` (pooled), `DIRECT_URL` (direct), `ADMIN_EMAILS` (your email, so you become admin),
   `DEMO_MODE=false` (a real site should not share one demo account).
5. **Authentication → URL Configuration:** *Site URL* = your final address (step 3 below); add `https://<your-domain>/auth/callback` to *Redirect URLs*.
6. **Authentication → Providers → Google (optional):** create OAuth credentials in Google Cloud Console, paste the client id and secret into Supabase, then set `AUTH_GOOGLE=true` in Vercel and redeploy to show the "Continue with Google" button. Until then the button is hidden and customers sign in with the emailed link.
7. **Authentication → Providers → Email:** keep *Confirm email* on, set *OTP expiry* to 3600 seconds or less.
8. Redeploy. The build applies every database migration automatically, including **row-level security on every table** (so the public Supabase API can't read your data even though the anon key is public).
9. Verify: `DATABASE_URL=<direct string> pnpm db:check-rls` prints `ok`. Then, in the Supabase dashboard → Table Editor, every table shows *RLS enabled* and no policies.

**Test it (2 minutes):** sign up with a second email in a private window. You should land on the 18+/terms page, then the dashboard. Open user A's report URL as user B: you must get *Page not found*.

---

## 2. Who you are: company details (10 minutes) — *required for launch*

**Unlocks:** the Terms, Privacy Policy, copyright page and the footer of every email name a real operator and postal address (CAN-SPAM, GDPR and ePrivacy require this).
**Until then:** those pages show a placeholder and **Admin → Setup** marks this red.

Set `LEGAL_ENTITY` (registered name), `LEGAL_ADDRESS` (a postal address, not a P.O. box if you can avoid it), `SUPPORT_EMAIL`.

**Copyright (DMCA) agent:** register at <https://www.copyright.gov/dmca-directory/> (about US$6, renew every 3 years), then set `DMCA_AGENT_NAME`, `DMCA_AGENT_EMAIL`, `DMCA_AGENT_ADDRESS` and `DMCA_REGISTRATION_NUMBER`. Only you can register; the page and takedown process are already built.

**Have a lawyer read** `/terms` and `/privacy` once (about an hour of their time). They are solid templates, not legal advice, and they depend on your country and company type. Bump `TERMS_VERSION` in `lib/config/legal.ts` after any material change and everyone is asked to accept again.

---

## 3. Your domain and SSL (30 minutes + DNS wait) — *required for launch*

**Unlocks:** your own address with a free automatic certificate, email that doesn't look suspicious.
**Until then:** the app is on `*.vercel.app`, which search engines are told not to index once a real domain exists.

1. Buy a domain (check the **FlagBid** name first: EUIPO TMview and your national trademark office).
2. Vercel → Project → Settings → Domains → add `yourdomain.com` and `www.yourdomain.com`; follow the DNS records it shows (an `A` record and a `CNAME`). Make `www` redirect to the bare domain (or the reverse) in the same screen.
3. SSL is automatic. HSTS is already sent by the app.
4. Set `NEXT_PUBLIC_APP_URL=https://yourdomain.com` and redeploy. Then update the same address in: Supabase *Site URL / Redirect URLs*, Google OAuth *authorised redirect URI*, the Stripe webhook URL (step 5).
5. Test: `curl -I https://yourdomain.com` shows `strict-transport-security`; <https://www.ssllabs.com/ssltest/> should grade A.

---

## 4. Email that reaches the inbox: Resend + SPF/DKIM/DMARC (30 minutes)

**Unlocks:** sale reminders, payment-failed notices, sign-in emails from your own domain.
**Until then:** no email is sent (the app still works; reminders just show in the app).

1. resend.com → Domains → add `yourdomain.com` (or `mail.yourdomain.com`). Resend shows 3 to 4 DNS records: **SPF** (TXT), **DKIM** (TXT/CNAME) and MX for bounces. Add them at your DNS host.
2. Add a **DMARC** record: TXT on `_dmarc.yourdomain.com` = `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`. After 2 to 4 weeks of clean reports change `p=none` to `p=quarantine`.
3. Check it: `pnpm email:check-dns yourdomain.com` (prints PASS or FAIL for SPF, DKIM, DMARC).
4. Set `RESEND_API_KEY` and `EMAIL_FROM="FlagBid <alerts@yourdomain.com>"`.
5. **Sign-in emails:** Supabase → Authentication → SMTP Settings → use Resend's SMTP (host `smtp.resend.com`, user `resend`, password = your API key) so the magic link comes from your domain instead of Supabase's shared sender.
6. Send a test to a Gmail and an Outlook address; both should land in the inbox with a working *Unsubscribe* link and your postal address in the footer.

---

## 5. Getting paid: Stripe (45 minutes) — *required to take money*

**Unlocks:** car packs (10/30/100) and monthly plans in euros, invoices, the customer portal.
**Until then:** pricing is shown, checkout is off. You can still give credits by hand (Admin → Users).

Do all of it in **test mode** first, then repeat with live keys.

1. Stripe → Product catalogue → create 5 prices **in EUR**: Pack 10 (€29, one-time), Pack 30 (€75, one-time), Pack 100 (€199, one-time), Pro (€59/month), Business (€149/month). The amounts must match `lib/billing/plans.ts`.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PACK_10`, `STRIPE_PRICE_PACK_30`, `STRIPE_PRICE_PACK_100`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`.
3. Developers → Webhooks → add endpoint `https://yourdomain.com/api/stripe/webhook` with these events, then copy its signing secret into `STRIPE_WEBHOOK_SECRET`:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`, `charge.dispute.created`.
4. Settings → Billing → Customer portal → enable cancel subscription, update payment method, invoice history.
5. **Tax:** Stripe → Settings → Tax (it asks for a product category). Choose **Software as a service (SaaS), business use**: FlagBid runs in the browser and is not downloaded, so the pre-filled "Downloadable software" is wrong. (Pick the personal-use SaaS category only if most buyers are private consumers; the difference matters for US sales only.) Stripe calculates and collects tax; it does not register you or file returns, so ask your accountant which countries apply to you. Then:
   - Enter your head-office address.
   - On each of the five prices set **Tax behaviour = Inclusive**, so a €29 pack stays €29 for the customer and Stripe works out the VAT inside it.
   - Add a tax registration for every country where you must collect (for the EU usually your home country, or the EU One-Stop Shop). Stripe watches your thresholds for free.
   - Set `STRIPE_AUTOMATIC_TAX=true` in Vercel and redeploy. Checkout then asks for a billing address and an optional VAT number (EU business buyers are not charged VAT), and invoices show the tax. Leave it off until the steps above are done, because Stripe refuses tax calculation before then.
6. **Prove the money paths work (15 minutes, test mode):**
   - Buy a pack with card `4242 4242 4242 4242` → credits arrive.
   - In the Stripe dashboard **refund** that payment → the credits are taken back.
   - Subscribe, then cancel in the portal → plan drops to Free.
   - Use card `4000 0000 0000 0341` (attaches, then fails on charge) → you get a *payment failed* email and an alert.
   - Use `4000 0000 0000 0259` to create a **dispute** → you get a critical alert and the credits are taken back.
   - With `STRIPE_AUTOMATIC_TAX=true`: checkout asks for a billing address and the invoice shows a tax line.
   Every one of these is covered by an automated test; this is the real-world check.
7. Stripe → Settings → Business → set your *statement descriptor*, and turn on email alerts for disputes and failed payouts.

---

## 6. The AI: Anthropic (20 minutes) — *makes the product worth paying for*

**Unlocks:** reading photos for damage, listing text extraction, live market valuation with web search, VIN lookup of the lot, the written narrative.
**Until then:** reports use heuristic parsing, reference prices and a template narrative, clearly labelled "photo not analysed".

1. console.anthropic.com → create a **workspace just for production**, create a key in it.
2. **Set a spend limit** on that workspace (Settings → Limits) at roughly twice what you expect to spend.
3. Settings → Privacy → turn on **web search** for the organisation (needed for live market prices).
4. Set `ANTHROPIC_API_KEY`. Leave `AI_PROVIDER=anthropic`.
5. Keep the in-app caps: `AI_DAILY_BUDGET_USD` (default 25) and `AI_MONTHLY_BUDGET_USD` (default 250). At the cap the app quietly falls back to the no-AI path and alerts you; at 80% it warns first.
6. Rough cost: about US$0.25 to $0.45 per report with photos (see the pricing section of `DECISIONS.md`). Your lowest pack is €2.90 per car.

---

## 7. Real data sources (each is optional; add as customers ask)

| Service | Variable(s) | Unlocks | Until then |
| --- | --- | --- | --- |
| **ScrapingBee** (already have a key; rotate it, step 0) | `SCRAPINGBEE_API_KEY`, `SCRAPE_DAILY_CAP` (default 400/day) | Reading auction pages for people who paste a link | Users paste the listing text or use the browser extension |
| **eBay developer keyset** | `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` | Real new and used part prices with evidence | Reference price table + AI estimate |
| **VinAudit** | `VINAUDIT_API_KEY` | NMVTIS title/odometer history, market value | History section shows "not checked" |
| **Marketcheck** | `MARKETCHECK_API_KEY` | Comparable listings | AI web research or auction ACV |
| **Inngest** | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | Queued analyses with retries | Analyses run inside the request (fine at low volume) |
| **Cron secret** | `CRON_SECRET` | Hourly reminder emails and clean-up | Daily clean-up from `vercel.json`; reminders need Inngest or an external scheduler |

---

## 8. Seeing problems: alerts, errors, uptime (30 minutes) — *strongly recommended before launch*

1. **Alerts:** create a Slack or Discord *incoming webhook* → `ALERT_WEBHOOK_URL`. (Also set `ALERT_EMAIL` if you want email.) You will be told about: new errors, failed payments, chargebacks, spend caps, failed deploys.
2. **Error tracking (optional):** create a free Sentry project → `SENTRY_DSN`. Session replay is never switched on.
3. **Uptime:** GitHub repo → Settings → Secrets and variables → Actions → add variable `PRODUCTION_URL=https://yourdomain.com` (a check runs every 10 minutes and opens an issue if the site is down). Also add a free external monitor (UptimeRobot or Better Stack) on `https://yourdomain.com/api/health`, keyword `"ok":true`, alert by SMS or push.
   The same `PRODUCTION_URL` variable makes the **post-deploy smoke test** check your real domain after every production deploy. Without it the test would look at Vercel's per-deployment address, which Vercel Deployment Protection puts behind a login wall; the workflow detects that (a 401, or Vercel's "Login – Vercel" page, from `/api/health`), prints a "Smoke test skipped" warning and stands down rather than raising a false alarm. Only a failed *production* deploy opens an issue; a failed preview just shows red in the Actions tab. To test previews too, create a *Protection Bypass for Automation* secret in Vercel (Settings → Deployment Protection) and save it as the repository secret `VERCEL_AUTOMATION_BYPASS_SECRET`.
4. **Test the alerts end to end:** set `MAINTENANCE_MODE=true`, redeploy, see the uptime alert fire, then set it back. (Do this before launch, not after.)

---

## 9. Backups you have actually restored (30 minutes)

1. **Provider backups:** Supabase Pro has daily backups; turn on **Point-in-time recovery** if you can. (The free plan has none.)
2. **Your own copy:** GitHub repo → Settings → Secrets → add `BACKUP_DATABASE_URL` (direct string, ideally a read-only role) and `BACKUP_PASSPHRASE` (random; keep a second copy in your password manager). A workflow then makes an **encrypted** dump every night (kept 30 days).
3. **Restore drill:** Actions → *Database backup* → Run workflow. The weekly job restores the dump into a scratch database and compares every table. Locally: `pnpm db:restore-test` (it passed here: 23 tables, 1,924 rows restored identically, row-level security preserved).
4. Write down in the runbook who can restore and where the passphrase is. A backup nobody can decrypt is not a backup.

---

## 10. A staging copy (30 minutes)

So you can try things without touching customers:

1. Create a second Supabase project (`flagbid-staging`) and a second Stripe account mode (use **test** keys).
2. Vercel → Settings → Environment Variables: add the staging values with scope **Preview** only (separate database, Stripe test keys, `APP_ENV=staging`).
3. Push to a branch called `staging` → Vercel builds a preview URL (or give it `staging.yourdomain.com` under Domains).
4. Previews are automatically `noindex` and `robots.txt` blocks everything; the preview banner is Vercel's. Never copy production data into staging.

---

## 11. Spend caps and billing alerts (20 minutes, all in provider dashboards)

The app caps itself, but each provider can also cut you off. Set every one:

| Provider | Where | What to set |
| --- | --- | --- |
| Anthropic | Console → Settings → Limits | Monthly spend limit on the production workspace; email alerts at 50% and 80% |
| Vercel | Settings → Billing → **Spend Management** | A monthly cap that pauses the project, plus email alert at 80% |
| Supabase | Organization → Billing | Keep **Spend Cap on** (it is on by default for Pro) |
| ScrapingBee | Dashboard → Plan | Stay on a fixed plan; `SCRAPE_DAILY_CAP` stops runaway use |
| Resend | Settings → Usage | A monthly sending limit |
| Stripe | Settings → Billing → Alerts | Alerts for failed payouts and disputes |
| Your bank/card | | A low limit on the virtual card used for SaaS bills |

---

## 12. Before you announce (run through this once)

- [ ] **Admin → Setup**: every *required* row is green.
- [ ] The 8 self-tests in `docs/SECURITY-AUDIT.md` (other users' data, second-user URL, refund, offline, secrets, old phone, duplicate workflows, `/admin`) all pass on **production**.
- [ ] `pnpm test:smoke` against production: `E2E_BASE_URL=https://yourdomain.com pnpm test:smoke`.
- [ ] A real card payment of the smallest pack, then refunded; credits arrive and are taken back.
- [ ] Rollback rehearsed once (`docs/RUNBOOK.md`): promote the previous deployment, then promote the new one again.
- [ ] A lawyer has read the Terms and Privacy Policy; DMCA agent registered.
- [ ] The car pictures in `public/cars/` are ones you may use commercially (your own, licensed, or open licence). Replace any you cannot show a licence for. The wrecked white sedan in the landing-page picture (`public/cars/sedan-wrecked.webp`) still has a Vecteezy watermark: buy the clean download and save it under the same name.
- [ ] Email test lands in Gmail and Outlook inboxes; SPF, DKIM and DMARC pass.
- [ ] You can restore a backup and know where the passphrase is.
- [ ] Alerts fire to your phone.

## What each tool does for you, at a glance

| Without it | The app still… |
| --- | --- |
| Supabase | works for the demo account only |
| Stripe | shows pricing; you grant credits by hand |
| Anthropic key | produces reports from heuristics and reference prices, labelled as unverified |
| ScrapingBee | accepts pasted listing text or the browser extension |
| eBay / VinAudit / Marketcheck | falls back to reference tables, AI estimates and auction values |
| Resend | skips emails |
| Inngest / cron | runs analyses in the request; clean-up runs daily |
| Sentry / alert webhook | still logs every error and lists them under Admin → Monitoring |
| Custom domain | runs on `*.vercel.app` |

## Typical monthly costs (check current prices; these are ballparks)

Vercel Pro about US$20 (the free Hobby plan is for non-commercial use only, so use Pro for a paid product) · Supabase Pro about US$25 · domain about €1 · Resend free tier to start · Sentry free tier · Anthropic usage-based, about US$0.25 to $0.45 per report · Stripe about 1.5% + €0.25 (EU cards) per payment.
