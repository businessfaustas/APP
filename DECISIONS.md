# Implementation decisions

This file records where the code departs from [`docs/02-AI-MASTER-PROMPT.md`](./docs/02-AI-MASTER-PROMPT.md), and the judgement calls the prompt left open. The prompt describes _what_ to build. This file says _how_, and why it differs.

## Name

The product was built as AuctionPulse AI and is now **BidPilot**. The name lives in `lib/brand.ts`; everything else that spells it out (README, legal pages, extension, docs) is kept in step by `node scripts/rename-brand.mjs <OldName> <NewName>`.

The logo is supplied artwork (a PNG), traced to vector paths in `components/brand-art.ts` with potrace (8× upscale, light blur, threshold) so it stays sharp at any size and follows light and dark themes: the emblem and letters use the text colour, the needle and speed lines keep their orange. `app/icon.svg` (favicon, app icon, extension icon) is the emblem on a near-black tile. A rename needs new artwork.

Left on the old name on purpose, because they are identifiers rather than branding and changing them would orphan data or break setups: the database name `auctionpulse`, the demo user's email `demo@auctionpulse.app` (its reports belong to that account), the `ap_` cookie prefix, and the deployed `auctionpulse-ai.vercel.app` URL until the Vercel project is renamed.

## Platform versions

| Area       | Prompt says                                  | Built with                   | Why / what changed                                                                                                                                                                                                                                                              |
| ---------- | -------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js    | Next.js App Router, "middleware"             | **Next.js 16.3**             | `middleware.ts` is now **`proxy.ts`** and runs on the Node.js runtime. `params` and `searchParams` are Promises. `after()` from `next/server` runs post-response work.                                                                                                          |
| React / TS | React, strict TypeScript                     | **React 19.3, TypeScript 6** | `noUncheckedIndexedAccess` is on. Hooks follow the React Compiler lint rules: no impure calls during render, no setState in effects.                                                                                                                                            |
| Prisma     | Prisma                                       | **Prisma 7.10**              | The `prisma-client` generator writes to `lib/generated/prisma` (git-ignored). The connection URL lives in `prisma.config.ts`, and the client uses the `@prisma/adapter-pg` driver adapter. `prisma migrate dev` no longer runs `generate`, so `build` and `postinstall` run it. |
| AI SDK     | `generateObject` "or its current equivalent" | **AI SDK 7**                 | `generateText({ output: Output.object({ schema }) })`, with one automatic retry that feeds the validation errors back to the model.                                                                                                                                             |
| Tailwind   | Tailwind + shadcn/ui                         | **Tailwind 4**               | CSS-first `@theme` tokens in `app/globals.css`. Components are written shadcn-style on the unified `radix-ui` package.                                                                                                                                                          |
| ESLint     | —                                            | **ESLint 9**                 | `eslint-config-next` bundles `eslint-plugin-react`, which crashes on ESLint 10. Pinned to 9.39 until the plugin supports 10.                                                                                                                                                    |

## Architecture

- **Inngest is optional.** The pipeline is a list of steps behind a small `StepRunner` interface (`lib/pipeline/analysisRun.ts`).
  - With Inngest keys it runs as a durable Inngest function, with crons for reminders and maintenance.
  - Without them, `inlineRunner` runs the same steps in-process via `after()`, and `/api/cron/[job]` (protected by `CRON_SECRET`) exposes the two jobs to any scheduler.
  - Local development and CI therefore need no queue.
- **"Needs input" without `step.waitForEvent`.** When no listing data can be fetched, the analysis is stored as `RUNNING` with `currentStep = NEEDS_INPUT`, and the run ends.
  - `POST /api/analyses/:id/resume` with pasted text, manual details or photos runs the pipeline again with the added input. Provider responses are cached (`ApiCache`), so the repeat is cheap.
  - The daily maintenance job fails runs stuck for more than 24 hours and refunds the credit.
  - This works the same with and without Inngest.
- **One calculator, two places.** `lib/calc` is pure, dependency-free TypeScript.
  - The pipeline stores an `AnalysisBase` (line items, market values, fee schedules, logistics) in `Analysis.calcInput`.
  - The What-if panel recomputes from it in the browser on every slider move. The report and the panel can never disagree, and what-ifs cost no credits.
- **Integer money.** Every amount is whole US dollars and every percentage is basis points, applied with `applyBps` (`Math.round`, so halves round up). There is no floating-point drift between the server, the browser and the PDF.
- **Monotonic solver.** Total acquisition cost (bid + tiered fees + broker + tax + duty/VAT) never decreases as the bid rises. So the max, comfort and break-even bids are binary searches over the bid, rounded down to the bid increment, rather than closed-form inversions of tiered fee tables.
- **Postgres for everything stateful.** Rate limiting (`RateLimitHit`), third-party response caching (`ApiCache`), AI usage and cost (`AiUsage`) and the credit ledger are tables. There is no Redis.

## Data and estimates

- **Fallback chains instead of hard dependencies.** Every external provider has a fallback, and the report's _Data sources_ panel names which one was used. Market value, for example: Marketcheck comps → VinAudit → AI estimate → listing ACV × 0.85 → ask the user. A missing key lowers confidence; it never fails the analysis.
- **Pasted links without a page-reading service.** Copart and IAAI block automated requests from cloud servers, so without ScrapingBee or Apify:
  - The app makes one browser-like read of the lot page (8-second timeout, known auction hosts only, bot-protection pages detected). It's free and sometimes succeeds.
  - When the read is blocked, the analysis pauses with a short form prefilled from the link itself: Copart slugs carry year, make, model, trim, title and yard; Bid.cars slugs carry the VIN.
  - The user adds damage, odometer, current bid and the auction's estimated retail value, or pastes the page text. The browser extension avoids the problem entirely because it reads the page the user already has open.
- **Placeholder fee tables.** Real auction fee schedules change often, and copying them into a repo invites stale numbers.
  - The seed ships clearly marked placeholders (`isPlaceholder`). Every report raises an INFO flag while one is in use.
  - Admins replace them in **Admin → Fee tables**.
- **Hidden damage is probabilistic.** Hidden line items count in the expected case at a probability of 50% or more, and in the worst case at 20% or more.
- **Contingency by severity.** The base contingency is 10% / 15% / 25% / 35% for damage severity 1–3 / 4–6 / 7–8 / 9–10. The best case is 5 points lower (minimum 5%) and the worst case 10 points higher.
- **Demo fixtures reproduce the reference case.** The Audi A3 demo lot gives exactly the prompt's reference numbers: max bid $3,100, comfort $2,375, break-even $5,500, expected profit $2,518, verdict GO, score 73. This is asserted in `lib/pipeline/__tests__/demoLots.test.ts` and in the e2e suite. The landing page renders its sample report from the same engine.

## Languages

- **Cookie, not URL prefix.** The language is a cookie (`ap_locale`) with an `Accept-Language` fallback, not `/lt/…` routes. Report links, share links and the extension's URLs stay the same in both languages.
- **The engine stays English; translation happens at display time.** Flags, reasons, checklist items and repair lines are stored as English text (and the AI may write them). Translating the stored text means old reports switch language too, and nothing in the database or the pure engine depends on the language. Engine sentences are matched against English templates (`lib/i18n/messages/en/generated.ts`); anything unrecognised, such as what the AI wrote about photos, is shown as written.
- **The summary is rebuilt, not translated.** In Lithuanian, the Overview summary is regenerated from the stored calculation with the same rules as `templateNarrative`, so the numbers always match the English one.
- **Money stays in US format** (`$3,100`) in both languages, because the amounts are US-auction dollars. Dates use the language's format.

## Security and accounts

- **The demo account is never an admin in production.** With `DEMO_MODE=true`, every visitor shares one account. It keeps the ADMIN role in development, so the admin pages can be explored, but production builds treat it as a regular user (`lib/auth/session.ts`).
- **Extension auth.** Tokens are random (`ap_…`) and only their SHA-256 hash is stored. They are shown once, can be rotated or revoked, and are sent as a Bearer token.
  - The ingest endpoint answers CORS preflight itself, so the extension needs no host permissions.
- **SSRF guard.** Server-side fetches of user-supplied URLs go through `assertPublicUrl`. It rejects:
  - non-HTTPS URLs and URLs with embedded credentials;
  - `localhost`, `.local` and `.internal` hosts;
  - any host that resolves to a private address.

  Fetches also have timeouts.

- **Credits.** One credit is charged when an analysis is created and refunded automatically if it fails. Monthly allowances reset lazily (every 30 days, on the next request) to `max(balance, allowance)`, so purchased packs aren't wiped.
- **Photos** are stored privately (Supabase Storage, or `.data/photos` locally) and served through an authenticated route. The maintenance job deletes stored auction photos after 90 days.

## Defaults worth knowing

| Setting                           | Default                                                                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Labor rate                        | $70/h; paint materials $40 per paint hour                                                                                        |
| Parts preference                  | Aftermarket                                                                                                                      |
| Profit target                     | max(15% of expected resale, $2,500)                                                                                              |
| Transport                         | $1.50/mi, $150 minimum                                                                                                           |
| Title / registration / inspection | $300                                                                                                                             |
| Holding                           | $8/day, 30 days expected (best 0.67×, worst 1.5×)                                                                                |
| Selling costs                     | 2% of resale                                                                                                                     |
| Pricing                           | EUR: packs of 10 / 30 / 100 cars for €29 / €75 / €199 · Free 3/mo · Pro €59 for 40/mo · Business €149 for 120/mo (see "Pricing") |
| Rate limits                       | 30 analyses/hour; batches of up to 10 lots                                                                                       |

## Pricing

**What is sold.** A "car" is one report (one lot analyzed). The main offer is a prepaid pack, because the first customer asked for "X euros for ten cars" and a dealer's volume comes in bursts around the auctions: one payment, no subscription to cancel, and credits never expire.

| Pack     | Price | Per car |
| -------- | ----- | ------- |
| 10 cars  | €29   | €2.90   |
| 30 cars  | €75   | €2.50   |
| 100 cars | €199  | €1.99   |

Monthly plans stay for people who analyze every week (Pro €59 for 40, Business €149 for 120, which is €1.48 and €1.24 a car) and the Free tier gives 3 reports a month to try it.

**Why these numbers.** The cost of one report is small: roughly a cent of page-reading credits, a few cents of AI for the photos and text (the vision model is the largest part), and nothing for the part prices (eBay's API is free). That is guessed at about €0.20–0.50, **not measured**: the Admin overview shows the real AI cost per report once an AI key has been running for a while, so check it after the first 50 reports and move the packs if it is far off. Against that, one wrong bid on a salvage car costs thousands, so a few euros a car is easy to justify to a dealer, and the margin stays large even if the real cost is several times the guess. The sums only stop working below roughly €1 a car. The market for comparable reports was not researched; treat the numbers as a starting point to test with the first clients.

**Changing prices.** Edit `PACKS` and `PLANS` in `lib/billing/plans.ts` (this drives the pricing page and the billing page) and create matching EUR prices in Stripe; checkout charges the Stripe price. VAT is not in the code: use Stripe Tax or set tax-inclusive prices in Stripe.

**Credits.** One credit per new analysis; analyzing the same input again within 24 hours is free; a failed analysis is refunded. A pack adds to the balance and a plan's monthly reset never lowers it, so pack credits are never lost. Credits can also be added by hand in Admin → Users.

## Look and feel

The look comes from the logo: an italic wordmark, a speedometer, orange speed lines. The idea is a motorsport timing board, not the usual dark-blue SaaS template.

- **Colour:** warm paper (light) and asphalt (dark) with the logo's signal orange. Buttons are ink (black on paper, bone on asphalt) and turn orange on hover; orange marks what is active, live or selected. Tokens are in `app/globals.css`.
- **Type:** Barlow for text and Barlow Condensed for headings, figures, tags and buttons (`@fontsource`, bundled, no network at runtime). Page titles are condensed italic capitals; money figures use `.display` (condensed italic, tabular).
- **Shape:** small radii everywhere (the Tailwind steps are overridden in the theme block). Buttons and tags are slanted plates (`.slant`, a skewed pseudo-element so the text stays upright). Cards carry two registration ticks as background layers. Labels have a skewed orange dash (`.eyebrow`). Every lucide icon is drawn with square ends by one CSS rule; the sidebar icons are BidPilot's own (`components/icons.tsx`).
- **Details:** GO / BE CAUTIOUS / WALK AWAY are the green, yellow and red race flags; credits are a fuel gauge; sliders are gauge tracks with a tick every 10%; the landing page is a typographic spec sheet instead of icon cards.
- **When changing it:** keep the tokens, not hard-coded colours, so light and dark both work, and keep the contrast of text on `--primary` (the light theme's orange is darker than the logo's for that reason).

## VIN input

A VIN pasted into the analyze box is checked and decoded live (`/api/vin/[vin]`, the free NHTSA decoder, cached 30 days, 60 checks an hour per user) and shown as a plate with the car's year, model, engine and drive before anything is charged. When the analysis runs, `lib/providers/listing/vinLookup.ts` decodes the VIN again and, with an AI key, searches the web for an auction lot of that exact VIN (damage, odometer, title, location, photos). A lot is used only if the notes name this VIN and say something about damage or photos; it is marked as found by search and may be an earlier sale. Without a lot, the form opens with the decoded car filled in and asks only for the damage, odometer and bid. In demo mode the VIN of a sample car runs the offline fixture.
