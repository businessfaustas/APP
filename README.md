# AuctionPulse AI

**Know your max bid before you bid.** Paste a Copart, IAAI or Bid.cars link, a VIN or the listing text. AuctionPulse decodes the VIN and reads the title and every photo. It builds an itemized repair estimate and values the car from market comparables. Then it adds auction fees, transport, holding and selling costs and returns:

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

| Step               | With keys                                  | Without                                                             |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------------- |
| Listing fetch      | ScrapingBee or Apify fetch the page        | Paste the listing text or use the extension; demo lots use fixtures |
| Listing extraction | AI structured extraction                   | Heuristic parser (Copart JSON, JSON-LD, label/value pairs)          |
| VIN decode         | NHTSA vPIC (free, no key)                  | Listing data                                                        |
| Title history      | VinAudit (NMVTIS)                          | Listing title only, flagged as unverified                           |
| Damage from photos | Vision model (Claude or OpenAI)            | Damage text heuristics, flagged as low confidence                   |
| Market value       | Marketcheck comps → VinAudit → AI estimate | ACV × 0.85, or you enter a value                                    |
| Narrative          | AI, checked by a numbers guard             | Template                                                            |
| Background jobs    | Inngest                                    | In-process after the response (`after()`)                           |
| Auth               | Supabase (magic link + Google)             | Demo user (`DEMO_MODE=true`)                                        |
| Photos             | Supabase Storage                           | `.data/photos` on local disk                                        |
| Billing / email    | Stripe / Resend                            | Plans shown read-only / reminder emails skipped                     |

---

## Environment variables

Copy `.env.example` to `.env`. Only `DATABASE_URL` is required. On Vercel, the names its Postgres integrations set (`DATABASE_URL_UNPOOLED`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`) are accepted as well.

| Variable                                                               | Purpose                                                                                                           | Where to get it                             |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                                                  | Absolute URL used in emails, share links, the extension and Stripe redirects                                      | Your domain                                 |
| `DEMO_MODE`                                                            | `true` turns on the demo lots and the shared **Continue as demo user** login. Keep `false` on a public deployment | —                                           |
| `DATABASE_URL`                                                         | Runtime Postgres connection (Supabase: pooled, port 6543, `?pgbouncer=true`)                                      | Supabase → Project settings → Database      |
| `DIRECT_URL`                                                           | Direct connection for migrations (Supabase: port 5432)                                                            | Same page                                   |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`            | Auth (magic link, Google)                                                                                         | Supabase → Project settings → API           |
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PHOTOS_BUCKET`                  | Photo storage (create a **private** bucket, default `listing-photos`)                                             | Same page / Storage                         |
| `ADMIN_EMAILS`                                                         | Comma-separated emails that get the admin role on sign-in                                                         | —                                           |
| `AI_PROVIDER`                                                          | `anthropic` (default) or `openai`                                                                                 | —                                           |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`                                 | Vision damage audit, extraction, narrative                                                                        | console.anthropic.com / platform.openai.com |
| `AI_MODEL_VISION`, `AI_MODEL_TEXT`                                     | Model IDs (defaults: `claude-sonnet-5-5`, `claude-haiku-4-5-20251001`)                                            | —                                           |
| `AI_MAX_PHOTOS`                                                        | Photos sent to the vision model (1–60, default 24)                                                                | —                                           |
| `AI_PRICE_VISION`, `AI_PRICE_TEXT`                                     | USD per million tokens `input,output`, for the admin cost dashboard                                               | Provider pricing page                       |
| `SCRAPINGBEE_API_KEY` or `APIFY_TOKEN` + `APIFY_ACTOR_ID`              | Fetch auction pages server-side                                                                                   | scrapingbee.com / apify.com                 |
| `VINAUDIT_API_KEY`                                                     | Title history (NMVTIS) and market value                                                                           | vinaudit.com (ask for API access)           |
| `MARKETCHECK_API_KEY`                                                  | Retail comparables                                                                                                | marketcheck.com                             |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`                             | Durable background workflow and crons                                                                             | Inngest Cloud, or the Vercel integration    |
| `INNGEST_DEV`                                                          | `1` = use the local dev server (`pnpm inngest:dev`)                                                               | —                                           |
| `CRON_SECRET`                                                          | Protects `/api/cron/*` when you schedule jobs without Inngest                                                     | Any long random string                      |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                           | Subscriptions and credit packs                                                                                    | Stripe dashboard → Developers               |
| `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`, `STRIPE_PRICE_CREDITS_10` | Price IDs: $39/mo, $129/mo, a one-time $9 pack                                                                    | Stripe → Products                           |
| `RESEND_API_KEY`, `EMAIL_FROM`                                         | Watchlist reminder emails                                                                                         | resend.com (verify your domain)             |

`/admin` and **Settings → Integrations** show which integrations are active. Secrets are never displayed.

---

## Scripts

| Command                                                  | What it does                                                                                                         |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                               | Dev server on :3000                                                                                                  |
| `pnpm build` / `pnpm start`                              | Production build (runs `prisma generate` first) and server                                                           |
| `pnpm typecheck`                                         | `tsc` for the app and the extension                                                                                  |
| `pnpm lint` / `pnpm format`                              | ESLint (Next + TypeScript rules) / Prettier                                                                          |
| `pnpm test`                                              | Vitest unit tests: calculator reference case, fees, solver, repair aggregation, parsers, flags, demo lots end to end |
| `pnpm e2e`                                               | Playwright in demo mode. It reuses a running `pnpm dev`, or starts one                                               |
| `pnpm db:migrate` / `db:deploy` / `db:seed` / `db:reset` | Prisma migrate (dev) / apply migrations (prod) / seed / reset                                                        |
| `pnpm inngest:dev`                                       | Local Inngest dev server                                                                                             |
| `pnpm extension:build`                                   | Build the Chrome extension into `extension/dist`                                                                     |

---

## How the numbers work

All money is whole US dollars. All percentages are integer basis points (`applyBps`), so the browser and the server always agree to the dollar.

1. **Repair**: line items (parts by source, body/paint/mechanical hours, sublets) × your labor rate, plus paint materials. Hidden damage is a probability-weighted line: it counts in the expected case at ≥ 50% probability and in the worst case at ≥ 20%. A severity-based contingency is added: 10% / 15% / 25% / 35%, lowered for the best case and raised for the worst.
2. **Resale**: best / expected / worst values from comparables, adjusted for mileage and title brand.
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

1. In Vercel, choose **Add New → Project** and import this repository. Under **Environment Variables**, add `DEMO_MODE` = `true`, then click **Deploy**. The first build succeeds even without a database. The home page works, and signing in explains that a database is needed.
2. In the project, open **Storage → Create Database → Neon** (free) and connect it to the project. Vercel adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED`, which the app picks up automatically. The Supabase integration's `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING` work too.
3. Open **Deployments**, choose **Redeploy** on the latest deployment, then open your `….vercel.app` link and click **Continue as demo user**.

`NEXT_PUBLIC_APP_URL` defaults to the project's production domain on Vercel, so share links and emails point at the right place. Without Supabase Storage, uploaded photos live in the function's temporary directory and don't persist. The demo lots aren't affected.

## Deploying for real users (Vercel + Supabase + Inngest)

1. **Supabase**
   - Create a project. Copy the pooled and direct connection strings into `DATABASE_URL` / `DIRECT_URL`.
   - Under **Authentication**, enable Email (magic link) and Google. Add `https://YOUR_DOMAIN/auth/callback` to the redirect URLs.
   - Create a private storage bucket named `listing-photos`.
2. **Database**: on Vercel, the build applies migrations and seeds automatically (`scripts/vercel-build.mjs`). Elsewhere, run `pnpm db:deploy && pnpm db:seed` against the production database.
3. **Vercel**: import the repo, set the env vars above with `DEMO_MODE=false`, and deploy. Proxy and route handlers run on the Node.js runtime.
4. **Inngest**: install the Vercel integration, or set `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` and sync `https://YOUR_DOMAIN/api/inngest`. This gives durable analysis runs, watchlist reminders every 15 minutes, and daily maintenance (expired runs refunded, photos older than 90 days deleted, caches pruned).
   - Without Inngest, analyses run in-process. Schedule the two jobs yourself, for example with Vercel Cron and `CRON_SECRET` set (Vercel sends it as the bearer token). The 15-minute schedule needs a Vercel plan that allows it:
     ```json
     {
       "crons": [
         { "path": "/api/cron/reminders", "schedule": "*/15 * * * *" },
         { "path": "/api/cron/maintenance", "schedule": "0 4 * * *" }
       ]
     }
     ```
5. **Stripe**:
   - Create the Pro and Business monthly prices and the one-time credit pack, and set their IDs in the `STRIPE_PRICE_*` variables.
   - Add a webhook to `https://YOUR_DOMAIN/api/stripe/webhook` for `checkout.session.completed`, `customer.subscription.created|updated|deleted` and `invoice.paid`, and set `STRIPE_WEBHOOK_SECRET`.
   - Enable the customer portal.
6. **Resend**: verify your sending domain and set `RESEND_API_KEY` and `EMAIL_FROM`.
7. **Admins**: put your email in `ADMIN_EMAILS` and sign in.

If you run a public demo with `DEMO_MODE=true`, every visitor shares one demo account. In production builds that account is never an admin.

---

## Browser extension and mobile

- **Chrome extension** (`extension/`): adds **Analyze with AuctionPulse** to lot pages. It sends what you can see on the page, including details that only appear when you're signed in to the auction. Build and install it as described in [`extension/README.md`](./extension/README.md). Users create the token in **Settings → Browser extension**.
- **PWA**: the app is installable. On Android, **Share → AuctionPulse** from the auction app or browser opens `/app/share`, which picks the lot link (or VIN) and prefills the analyze box.

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
lib/demo/            Demo fixtures (5 lots) and generated demo photos
prisma/              Schema, migrations, seed
extension/           Chrome MV3 extension
e2e/                 Playwright specs (demo mode)
docs/                Product spec, AI master prompt, build playbook
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, the production build, the extension build and the e2e suite against Postgres on every push to `main` and on pull requests.
