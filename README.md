# FlagBid

**Live demo:** <https://auctionpulse-ai.vercel.app>. It runs in demo mode: click **Analyze a lot → Continue as demo user**.

**Know your max bid before you bid.** Paste a Copart, IAAI or Bid.cars link, a VIN or the listing text. FlagBid decodes the VIN and reads the title and every photo. It builds an itemized repair estimate and values the car from market comparables. Then it adds auction fees, transport, holding and selling costs and returns:

- a **GO / BE CAUTIOUS / WALK AWAY** verdict
- your **maximum bid** for your profit target, a **comfort bid** that still breaks even in the worst case, and the **break-even bid**
- best / expected / worst profit, a deal score, risk flags and an inspection checklist

What-if sliders recalculate everything in the browser. Batch compare, watchlist reminders, a deal journal, PDF and share links, EU export landed cost, a Chrome extension and a PWA share target are included.

> Estimates only — not an appraisal, an insurance estimate or a guarantee. Fee tables ship as **placeholders** until you verify them (see [Fee tables](#fee-tables)).

The product spec, the build prompt and the playbook are in [`docs/`](./docs). Where the code differs from those docs, and why, is in [`DECISIONS.md`](./DECISIONS.md).

---

## Quick start (demo mode, no API keys)

Prerequisites: Node.js ≥ 20.9, pnpm 10 (`corepack enable`) and PostgreSQL 16.

```bash
# 1. Postgres (skip if you already run one)
docker run -d --name auctionpulse-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=auctionpulse postgres:16

# 2. App
pnpm install
cp .env.example .env          # DEMO_MODE=true, local DATABASE_URL
pnpm db:migrate               # create tables
pnpm db:seed                  # fee tables, part/labor references, export profiles, demo user
pnpm dev                      # http://localhost:3000
```

Open <http://localhost:3000>, click **Analyze a lot**, then **Continue as demo user**, and pick a demo lot:

| Demo lot                                            | Expected result                                                                    |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 2019 Audi A3, front end (`copart.com/lot/90000001`) | **GO**, max bid **$3,100**, comfort $2,375, break-even $5,500 (the reference case) |
| 2021 Toyota Camry, flood (IAAI)                     | BE CAUTIOUS                                                                        |
| 2020 Ford F-150, rear end (Bid.cars)                | GO                                                                                 |
| 2022 Tesla Model 3, side impact                     | BE CAUTIOUS (EV battery, frame, airbags)                                           |
| 2017 Honda Civic, certificate of destruction        | WALK AWAY (hard stop)                                                              |

You can also paste any real listing text. Without keys, the heuristic extractor reads it and the fallbacks below fill in the rest.

### What runs without keys

Every provider has a fallback, so a missing key never breaks an analysis.

| Step               | With keys                                  | Without                                                                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listing fetch      | ScrapingBee or Apify read the page         | A direct read is tried first; when the site blocks it, a short form prefilled from the link (year, make, model, title, yard, VIN from Bid.cars links) asks for damage, odometer, current bid and the auction's retail value. Pasting the page text or the extension works too |
| Listing extraction | AI structured extraction                   | Heuristic parser (Copart JSON, JSON-LD, label/value pairs)                                                                                                                                                                                                                    |
| VIN decode         | NHTSA vPIC (free, no key)                  | Listing data                                                                                                                                                                                                                                                                  |
| Title history      | VinAudit (NMVTIS)                          | Listing title only, flagged as unverified                                                                                                                                                                                                                                     |
| Damage from photos | Vision model (Claude or OpenAI)            | Damage text heuristics, flagged as low confidence                                                                                                                                                                                                                             |
| Market value       | Marketcheck comps → VinAudit → AI estimate | ACV × 0.85, or you enter a value                                                                                                                                                                                                                                              |
| Narrative          | AI, checked by a numbers guard             | Template                                                                                                                                                                                                                                                                      |
| Background jobs    | Inngest                                    | In-process after the response (`after()`)                                                                                                                                                                                                                                     |
| Auth               | Supabase (magic link + Google)             | Demo user (`DEMO_MODE=true`)                                                                                                                                                                                                                                                  |
| Photos             | Supabase Storage                           | Postgres on Vercel, `.data/photos` on local disk                                                                                                                                                                                                                              |
| Billing / email    | Stripe / Resend                            | Plans shown read-only / reminder emails skipped                                                                                                                                                                                                                               |

---

## Environment variables

Copy `.env.example` to `.env`. Only `DATABASE_URL` is required. On Vercel, the names its Postgres integrations set (`DATABASE_URL_UNPOOLED`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`) are accepted as well.

| Variable                                                                                     | Purpose                                                                                                                                                               | Where to get it                             |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                                                                        | Absolute URL used in emails, share links, the extension and Stripe redirects                                                                                          | Your domain                                 |
| `DEMO_MODE`                                                                                  | Demo lots and the shared **Continue as demo user** login. When unset, it is on until Supabase login is configured. Set `false` to turn it off                         | —                                           |
| `DATABASE_URL`                                                                               | Runtime Postgres connection (Supabase: pooled, port 6543, `?pgbouncer=true`)                                                                                          | Supabase → Project settings → Database      |
| `DIRECT_URL`                                                                                 | Direct connection for migrations (Supabase: port 5432)                                                                                                                | Same page                                   |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                  | Auth (magic link, Google)                                                                                                                                             | Supabase → Project settings → API           |
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PHOTOS_BUCKET`                                        | Photo storage (create a **private** bucket, default `listing-photos`)                                                                                                 | Same page / Storage                         |
| `ADMIN_EMAILS`                                                                               | Comma-separated emails that get the admin role on sign-in                                                                                                             | —                                           |
| `AI_PROVIDER`                                                                                | `anthropic` (default) or `openai`                                                                                                                                     | —                                           |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`                                                       | Vision damage audit, extraction, narrative                                                                                                                            | console.anthropic.com / platform.openai.com |
| `AI_MODEL_VISION`, `AI_MODEL_TEXT`                                                           | Model IDs (defaults: `claude-sonnet-5-5`, `claude-haiku-4-5-20251001`)                                                                                                | —                                           |
| `AI_MAX_PHOTOS`                                                                              | Photos sent to the vision model (1–60, default 24)                                                                                                                    | —                                           |
| `SCRAPER_MAX_PAID_PHOTOS`                                                                    | Photos per lot that may cost 1 ScrapingBee credit each when the photo host blocks direct downloads (0–60, default 10; direct downloads are free)                      | —                                           |
| `AI_PRICE_VISION`, `AI_PRICE_TEXT`                                                           | USD per million tokens `input,output`, for the admin cost dashboard                                                                                                   | Provider pricing page                       |
| `SCRAPINGBEE_API_KEY` or `APIFY_TOKEN` + `APIFY_ACTOR_ID`                                    | Fetch auction pages server-side                                                                                                                                       | scrapingbee.com / apify.com                 |
| `LISTING_DIRECT_FETCH`                                                                       | `false` skips the free direct read of auction pages (CI sets this)                                                                                                    | —                                           |
| `VINAUDIT_API_KEY`                                                                           | Title history (NMVTIS) and market value                                                                                                                               | vinaudit.com (ask for API access)           |
| `MARKETCHECK_API_KEY`                                                                        | Retail comparables                                                                                                                                                    | marketcheck.com                             |
| `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_MARKETPLACE`                                   | Real new and used part prices from live eBay listings (see "Part prices"); marketplace defaults to `EBAY_US`                                                          | developer.ebay.com → Application keys       |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`                                                   | Durable background workflow and crons                                                                                                                                 | Inngest Cloud, or the Vercel integration    |
| `INNGEST_DEV`                                                                                | `1` = use the local dev server (`pnpm inngest:dev`)                                                                                                                   | —                                           |
| `CRON_SECRET`                                                                                | Protects `/api/cron/*` when you schedule jobs without Inngest                                                                                                         | Any long random string                      |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                                                 | Subscriptions and credit packs                                                                                                                                        | Stripe dashboard → Developers               |
| `STRIPE_PRICE_PACK_10`, `_PACK_30`, `_PACK_100`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS` | Price IDs, all in EUR: one-time packs of 10 / 30 / 100 cars (€29 / €75 / €199), Pro €59/mo, Business €149/mo. `STRIPE_PRICE_CREDITS_10` is still read as the 10-pack. | Stripe → Products                           |
| `STRIPE_AUTOMATIC_TAX`                                                                       | `true` makes checkout collect VAT / sales tax through Stripe Tax (billing address, optional VAT number). Leave off until Stripe Tax is set up.                        | Stripe → Settings → Tax                     |
| `RESEND_API_KEY`, `EMAIL_FROM`                                                               | Watchlist reminder emails                                                                                                                                             | resend.com (verify your domain)             |

### Connect your APIs

**Admin → Setup & API keys** (`/admin/setup`) is the checklist for going live: every integration grouped as required / recommended / optional, what it unlocks, what the app does without it, which of its variables are set (click a name to copy it), a link to where the key is created, and a **Test** button that makes one small read-only request with the saved key (database, Supabase Auth, Anthropic/OpenAI, ScrapingBee, Stripe, Resend). Add the variables in Vercel → Settings → Environment Variables and redeploy; no code changes are needed. Secrets are never displayed. **Settings → Integrations** shows the same status to every user.

---

## Scripts

| Command                                                  | What it does                                                                                                                                                                     |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                               | Dev server on :3000                                                                                                                                                              |
| `pnpm build` / `pnpm start`                              | Production build (runs `prisma generate` first) and server                                                                                                                       |
| `pnpm typecheck`                                         | `tsc` for the app and the extension                                                                                                                                              |
| `pnpm lint` / `pnpm format`                              | ESLint (Next + TypeScript rules) / Prettier                                                                                                                                      |
| `pnpm test`                                              | Vitest unit and integration tests: calculator reference case, fees, solver, parsers, API auth on every route, ownership, Stripe, AI gateway, prompt injection, SEO, legal guards |
| `pnpm e2e`                                               | Playwright in demo mode (smoke, regression, 6 device emulations, slow network, offline, accessibility). Reuses a running `pnpm dev`, or starts one                               |
| `pnpm test:smoke`                                        | Read-only checks that are safe to run against production: `E2E_BASE_URL=https://your-domain pnpm test:smoke`                                                                     |
| `pnpm test:visual` / `test:visual:update`                | Screenshot comparison of the stable pages (baselines are per platform)                                                                                                           |
| `pnpm eval` / `pnpm eval:live`                           | Listing-reader accuracy and prompt-injection evaluations (offline; `:live` also calls the real model)                                                                            |
| `pnpm db:check-rls`                                      | Fails if any table lacks row-level security                                                                                                                                      |
| `pnpm db:backup` / `pnpm db:restore-test`                | Encrypted `pg_dump` / restore into a scratch database and compare every table                                                                                                    |
| `pnpm secrets:scan` / `pnpm audit:deps`                  | Secrets in files and git history / dependency vulnerabilities (with an expiring allowlist)                                                                                       |
| `pnpm email:check-dns <domain>`                          | Checks SPF, DKIM and DMARC                                                                                                                                                       |
| `node scripts/make-launch-plan-pdf.mjs`                  | Rebuilds `docs/FlagBid-Launch-Plan.pdf` (the printable launch plan) from `docs/LAUNCH-PLAN.md`                                                                                   |
| `pnpm db:migrate` / `db:deploy` / `db:seed` / `db:reset` | Prisma migrate (dev) / apply migrations (prod) / seed / reset                                                                                                                    |
| `pnpm inngest:dev`                                       | Local Inngest dev server                                                                                                                                                         |
| `pnpm extension:build`                                   | Build the Chrome extension into `extension/dist`                                                                                                                                 |

---

## How the numbers work

All money is whole US dollars. All percentages are integer basis points (`applyBps`), so the browser and the server always agree to the dollar.

1. **Repair**: line items (parts by source, body/paint/mechanical hours, sublets) × your labor rate, plus paint materials. See "Part prices" below for where each part's price comes from. Hidden damage is a probability-weighted line: it counts in the expected case at ≥ 50% probability and in the worst case at ≥ 20%. A severity-based contingency is added: 10% / 15% / 25% / 35%, lowered for the best case and raised for the worst.
2. **Resale**: best / expected / worst values from comparables, adjusted for mileage and title brand. The market value of the clean car comes from the first of these that answers: Marketcheck comps, VinAudit's market value, then an **AI market research** step (needs the Anthropic key): the model searches the web for current listings of that exact year, model, trim and mileage, and the 25th / 50th / 75th percentile is read off the listings it found, which are shown as comps with links. If web search isn't enabled for the key (Anthropic console → Settings → Privacy) or fewer than three listings are found, the model's own estimate is used and labelled "AI estimate — verify". Last come the auction's own retail value × 0.85 and, failing all of those, asking you to type the value. A web search costs about $0.01 and is included in the AI cost shown in Admin; the result is cached for a day per car.
3. **Costs**:
   - Auction fees by buyer type, a broker fee where applicable, and sales tax.
   - Transport by distance (with a minimum), yard storage, title / registration / inspection.
   - Holding cost per day (sell time scales 0.67× / 1× / 1.5× across the scenarios), selling fees.
   - In export mode: freight, insurance, duty and VAT on the CIF value.
4. **Bids**: total cost never decreases as the bid rises, so a binary search finds:
   - the **max bid**: the expected-case profit meets your target (by default the larger of $2,500 and 15% of expected resale);
   - the **comfort bid**: the worst case breaks even;
   - the **break-even bid**: the expected case makes $0.
5. **Verdict and deal score**: rules and weights are in `lib/config/verdictWeights.ts`. Hard stops (a non-repairable or parts-only title) always mean WALK AWAY. Flood, frame, airbag and EV-battery risks lower the verdict and the score.

**Part prices.** Each replaced part has three prices: OEM new, aftermarket and used. For every part, in this order:

1. **Live market** (needs the eBay keys). The car's make and model plus the part name are searched on eBay (`lib/providers/parts`). Only fixed-price listings count: new ones (a title saying OEM / genuine / factory is OEM, the rest aftermarket) and used ones. A listing has to name the same make and model and a model-year range that includes the car's year. A price range needs at least 3 listings after dropping prices far from the median, and it is the middle half (25th–75th percentile) of them. The report shows the range with the number of listings and a few links as proof, and caches the listings for 3 days.
2. **Reference table** for any column the market couldn't fill.
3. **AI estimate** (only when an AI key is set) for parts the table doesn't know, labelled as an estimate.
4. A **placeholder** by vehicle class, with low confidence, as the last resort.

Without eBay keys nothing is read live: the report says so and labels the prices as reference or AI estimates. eBay's production keyset needs the account-deletion notification step (or an exemption request) in their developer portal before it is issued; sandbox keys won't return real listings.

The engine is pure TypeScript in `lib/calc`. It is shared by the server and the What-if panel and covered by `lib/calc/__tests__`.

---

## Fee tables

Auction fees change often and differ by buyer type and payment method, so treat every number here as unverified until checked.

- The seed loads **placeholder** schedules for Copart and IAAI × licensed dealer / public via broker (`lib/calc/placeholderFees.ts`), marked `isPlaceholder`. While a placeholder is in use, every report shows a _"Approximate fee table"_ flag.
- To update: sign in as an admin, open **Admin → Fee tables**, and edit:
  - the buyer-fee and virtual/online-bid-fee tiers (bid range → flat fee, or % of bid with a minimum);
  - the fixed fees (gate, environmental, title/doc, …).

  The editor validates that tiers are contiguous and previews fees at sample bids. Set the **Verified** date and the official fee page URL, switch off **Placeholder**, and save. Reports flag tables last verified more than 90 days ago.

- Users set their buyer type, broker fee and sales tax in **Settings**. The buyer type can also be switched per report in the What-if panel.
- **Admin → Parts & labor** calibrates the price and labor-hour references the estimator uses (CSV import supported). **Admin → Export profiles** holds the per-destination landed-cost settings.

---

## Preview on Vercel (about 5 minutes)

The repo deploys to Vercel as-is. `vercel.json` runs `scripts/vercel-build.mjs`, which applies migrations and seeds reference data when a database is connected, then builds.

1. In Vercel, choose **Add New → Project** and import this repository. Click **Deploy**. No environment variables are needed: demo sign-in is on by default until you configure Supabase login. The first build succeeds even without a database. The home page works, and signing in explains that a database is needed.
2. In the project, open **Storage → Create Database → Neon** (free) and connect it to the project. Vercel adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED`, which the app picks up automatically. The Supabase integration's `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING` work too.
3. Open **Deployments**, choose **Redeploy** on the latest deployment, then open your `….vercel.app` link and click **Continue as demo user**. If something is missing, `/api/health` on your deployment says what, without showing any secrets.

`NEXT_PUBLIC_APP_URL` defaults to the project's production domain on Vercel, so share links and emails point at the right place. Without Supabase Storage, uploaded photos live in the function's temporary directory and don't persist. The demo lots aren't affected.

## Deploying for real users (Vercel + Supabase + Inngest)

1. **Supabase**
   - Create a project. Copy the pooled and direct connection strings into `DATABASE_URL` / `DIRECT_URL`.
   - Under **Authentication**, enable Email (magic link) and Google. Add `https://YOUR_DOMAIN/auth/callback` to the redirect URLs.
   - Create a private storage bucket named `listing-photos`.
2. **Database**: on Vercel, the build applies migrations and seeds automatically (`scripts/vercel-build.mjs`). Elsewhere, run `pnpm db:deploy && pnpm db:seed` against the production database.
3. **Vercel**: import the repo, set the env vars above with `DEMO_MODE=false`, and deploy. Proxy and route handlers run on the Node.js runtime.
4. **Inngest**: install the Vercel integration, or set `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` and sync `https://YOUR_DOMAIN/api/inngest`. This gives durable analysis runs, watchlist reminders every 15 minutes, and daily maintenance (expired runs refunded, photos older than 90 days deleted, caches pruned).
   - Without Inngest, analyses run in-process. `vercel.json` already runs the daily maintenance job through Vercel Cron (set `CRON_SECRET`; Vercel sends it as the bearer token). For reminders every 15 minutes add `{ "path": "/api/cron/reminders", "schedule": "*/15 * * * *" }` to its `crons` (needs a Vercel plan that allows it). When Inngest is connected the cron endpoint stands down so nothing runs twice.
5. **Stripe**:
   - Create the prices **in EUR** with the amounts in `lib/billing/plans.ts`: three one-time prices (10, 30 and 100 cars) and the Pro and Business monthly prices. Set their IDs in the `STRIPE_PRICE_*` variables. Checkout charges the Stripe price, so a different amount there wins over the page.
   - A pack checkout also asks Stripe to create an invoice, which business buyers usually need. Turn on Stripe Tax if VAT should be added.
   - Add a webhook to `https://YOUR_DOMAIN/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded|failed`, `customer.subscription.created|updated|deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded` and `charge.dispute.created`, and set `STRIPE_WEBHOOK_SECRET`. Refunds and chargebacks take the credits back automatically; each event is applied once.
   - Enable the customer portal.
6. **Resend**: verify your sending domain and set `RESEND_API_KEY` and `EMAIL_FROM`.
7. **Admins**: put your email in `ADMIN_EMAILS` and sign in.
8. **Company details, domain, email DNS, alerts, backups, spend caps, staging**: follow **`docs/LAUNCH-PLAN.md`** step by step (a printable copy is `docs/FlagBid-Launch-Plan.pdf`). It lists every account to connect, in order, with the exact variables and what the app does until you do.

If you run a public demo with `DEMO_MODE=true`, every visitor shares one demo account. In production builds that account is never an admin.

---

## Production readiness (what is built in)

| Area                   | What you get                                                                                                                                 | Where                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Data privacy           | Row-level security on every table (deny by default); per-user ownership checks on every route, tested                                        | `prisma/migrations/*row_level_security*`, `tests/ownership.test.ts`, `tests/api-security.test.ts` |
| Auth on every endpoint | Each route is registered with its protection; a test calls all of them signed out and as a normal user                                       | `tests/api-security.test.ts`                                                                      |
| Abuse and cost         | Rate limits, CSRF origin check, AI and page-reader spend caps with alerts, model-outage circuit breaker                                      | `lib/security/*`, `lib/ai/*`, `proxy.ts`                                                          |
| Money                  | Refunds, chargebacks, failed payments, retries handled once; full account deletion cancels billing                                           | `lib/billing/stripe.ts`, `lib/account/delete.ts`                                                  |
| Legal                  | 18+ gate, cookie consent, Terms, Privacy, DMCA, unsubscribe + postal address in email, renewal terms by every buy button                     | `app/(auth)/welcome`, `components/consent-banner.tsx`, `app/(marketing)/*`, `lib/email/*`         |
| Monitoring             | Structured logs, grouped error table, Sentry (optional), Slack/Discord/email alerts, Web Vitals, anonymous analytics, **Admin → Monitoring** | `lib/observability/*`, `instrumentation.ts`                                                       |
| SEO and AI answers     | robots, sitemap, `llms.txt`, JSON-LD, OG image, canonical URLs                                                                               | `app/robots.ts`, `app/sitemap.ts`, `lib/seo/schema.ts`                                            |
| Resilience             | Real 404/500/loading screens, offline banner, request timeouts, kill switch (`MAINTENANCE_MODE`)                                             | `app/error.tsx`, `lib/client/fetch-guard.ts`, `proxy.ts`                                          |
| Operations             | CI/CD, post-deploy smoke test, uptime check, nightly encrypted backup, weekly restore test, Dependabot, CodeQL                               | `.github/workflows/*`                                                                             |

Read next: `docs/LAUNCH-PLAN.md` (what to connect), `docs/RUNBOOK.md` (rollback and incidents), `docs/SECURITY-AUDIT.md` (what was found and fixed).

---

## Browser extension and mobile

- **Chrome extension** (`extension/`): adds **Analyze with FlagBid** to lot pages. It sends what you can see on the page, including details that only appear when you're signed in to the auction. Build and install it as described in [`extension/README.md`](./extension/README.md). Users create the token in **Settings → Browser extension**.
- **PWA**: the app is installable. On Android, **Share → FlagBid** from the auction app or browser opens `/app/share`, which picks the lot link (or VIN) and prefills the analyze box.

---

## Languages (English / Lithuanian)

The app speaks English and Lithuanian. The **EN | LT** switch is in the site header, the app sidebar (top bar on phones) and the sign-in page. The choice is stored in the `ap_locale` cookie for a year; without it, browsers set to Lithuanian get Lithuanian and everyone else gets English.

- Dictionaries live in `lib/i18n/messages/{en,lt}/`. The English files define the keys and the Lithuanian ones are type-checked against them, so a missing key fails `pnpm typecheck`. `tests/i18n.test.ts` also checks that both languages use the same `{placeholders}`.
- Server components use `await getT()` (`lib/i18n/server.ts`), client components use `useT()` (`lib/i18n/client.tsx`). Plurals use `{n:one|few|many}` inside a message.
- The analysis engine still writes its stored text (risk flags, verdict reasons, checklist, repair lines, provider notes) in English. `lib/i18n/generated.ts` matches each sentence against the English templates in `messages/en/generated.ts` and re-renders it in the active language. When you add or reword an engine sentence, add the template there and its translation in `messages/lt/generated.ts`. The test fails if a demo lot produces text it can't translate.
- Still English only: what the AI writes about photos, the admin pages, legal text, the PDF, emails and the browser extension.

---

## Project layout

```
app/                 Next.js App Router: (marketing), (auth), (app)/app, (admin)/admin, api/*
components/          UI (shadcn-style ui/*), report/*, admin/*, marketing/*, …
lib/calc/            Pure bid calculator: fees, repair aggregation, scenarios, solver, verdict, deal score
lib/pipeline/        Analysis workflow (runner-agnostic steps, Inngest or inline), assembly, caching
lib/providers/       Listing fetch/extract, NHTSA, VinAudit, Marketcheck, FX, distance — each with fallbacks
lib/ai/              AI SDK client (structured output + retry), prompts, usage tracking, narrative guard
lib/estimate/        Repair estimator (rules, reference prices, heuristic damage)
lib/flags/           Risk flags, inspection checklist, template narrative
lib/i18n/            EN/LT dictionaries, translator, display-time translation of engine text
lib/demo/            Demo fixtures (5 lots) and generated demo photos
prisma/              Schema, migrations, seed
extension/           Chrome MV3 extension
e2e/                 Playwright specs (demo mode)
docs/                Product spec, AI master prompt, build playbook
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, the production build, the extension build and the e2e suite against Postgres on every push to `main` and on pull requests.
