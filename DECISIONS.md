# Implementation decisions

This file records where the code departs from [`docs/02-AI-MASTER-PROMPT.md`](./docs/02-AI-MASTER-PROMPT.md), and the judgement calls the prompt left open. The prompt describes _what_ to build. This file says _how_, and why it differs.

## Name

The product was built as AuctionPulse AI and is now **FlagBid**. The name lives in `lib/brand.ts`; everything else that spells it out (README, legal pages, extension, docs) is kept in step by `node scripts/rename-brand.mjs <OldName> <NewName>`.

The logo is the supplied lowercase "flagbid" wordmark in blue with no background, traced from the artwork to a vector path with potrace (blue-minus-green separates the letters from the green backdrop), so it needs no font or image and stays sharp at any size. It is drawn in `--logo` (`app/globals.css`): the supplied blue `#545ce1` on light (5.2:1 on white), a touch lighter `#7a84f2` on dark. The path is in `components/brand-art.ts` (generated, not hand-edited; regenerate from new artwork). `app/icon.svg` (favicon, app icon, extension icon) is the "f" in light blue on a dark blue tile, and the maskable icon background in `app/icons/[file]/route.ts` is `#171a45`. A rename needs new artwork. The name was picked after a web search for existing products under candidate names (BidPilot, BidLens, LotLens, BidSight, BidSense and BidWise were taken); that is not a trademark search, so check EUIPO and the Lithuanian patent office before building a brand on it.

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
  - **Copart licensed has real figures** (`lib/calc/copartFees.ts`): the "CrashedToys Licensed Fees, Preferred Pricing" page the owner copied on 2026-11-24, with secured-payment buyer fees, Live Bid virtual-bid fees, and the $95 gate and $15 environmental fees. The seed loads it into the Copart licensed-dealer card, but only outside demo mode and only when that card still holds the untouched placeholder (compared by value), so an admin's edits are never overwritten and the demo account, CI and the Audi A3 reference case keep the placeholder.
  - **IAAI has figures too** (`lib/calc/iaaFees.ts`), for both the licensed and the public card: the standard buyer-fee schedule (the one for non-licensed buyers and for licensed buyers under 25 units a year), Live Online Bid fees, and the $105 service and $20 title fees. IAA publishes the tables as images, so they were typed in by eye and carry no Verified date until someone compares rows with IAA's page. The high-volume schedule is stored but not the default. Left out because they are optional, unknown or vary: premium imagery set ($10), the EH&S and fuel surcharge (IAA shows no amount) and storage.
  - The Copart table is loaded **still flagged as a placeholder**: CrashedToys is Copart's powersports brand and the page does not say it is the car and truck table. Once an admin has checked it against the Member Fees page in a signed-in Copart account, they switch "Placeholder" off. Half-dollar fees on the page are rounded up to whole dollars, because money is integer dollars.
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

- **Sign-up and sign-in.** New customers create an account with name, email, phone and a password (`components/auth/supabase-login.tsx`, Supabase `signUp`), and confirm their email once; after that they sign in with email and password only. The earlier passwordless email-link flow was dropped: it asked returning customers to open their inbox every time and gave us no name or phone. Details:
  - The form sends the name, a phone number normalized to E.164 (`+37060012345`, country code required, no guessing) and the 18+/terms tick (with its time) as Supabase user metadata. The server re-cleans all of it (`lib/auth/signup.ts`) before copying it into our `User` row, because metadata is client-supplied.
  - The tick travels with the account, so it still counts when the confirmation link is opened on a phone while the form was filled in on a laptop (a browser cookie would be missing there). The cookie remains as a fallback.
  - Both ways in end at the same server step (`finishSignIn`): `/auth/callback` for emailed links and Google, `/auth/complete` after a password sign-in. It creates the app user, records consent and redirects to a same-site path only.
  - A sign-up for an address that already has an account is answered in plain words (Supabase returns a user with no identities in that case); a password-reset request always says "if there is an account…".
  - A link that lands on `/?code=…` (Supabase does this when our callback is not in its allowed Redirect URLs) is forwarded to `/auth/callback` by the proxy instead of being dropped.
  - Passwords are 8 to 72 bytes (bcrypt ignores the rest). We never see or store them; Supabase does. Phone numbers are not verified by SMS: it is a contact detail, not a login factor.
- **Account emails look like FlagBid.** Confirm sign-up is a welcome-style layout (hero picture of the product, get-started cards, dark promo block, help bar) and reset-password stays short on purpose. Both are our own HTML (`docs/email-templates/`), pasted into Supabase's dashboard (templates are not read from the repo), with the wordmark as a PNG (`public/email/flagbid-logo.png`, because Gmail shows no SVG), English and Lithuanian in one message (Supabase sends one template per project, and a template that logic-branches on a missing value would stop the email being sent), and only the three variables Supabase always provides. Supabase locks the template editor on the Free plan until custom SMTP is configured, so SMTP comes first: Resend on your own domain is the real setup, and Gmail with an app password is a stopgap (the guide in `docs/email-templates/` says how). That same setting is what changes who the email is _from_. `tests/email-templates.test.ts` guards the files.
- **Credits.** One credit is charged when an analysis is created and refunded automatically if it fails. Monthly allowances reset lazily (every 30 days, on the next request) to `max(balance, allowance)`, so purchased packs aren't wiped.
- **Photos** are stored privately (Supabase Storage, or `.data/photos` locally) and served through an authenticated route. The maintenance job deletes stored auction photos after 90 days.

## Hardening before launch

- **Row-level security, deny by default.** Prisma connects as the table owner (bypasses RLS) and every query is scoped to the user in code, so no policies are needed; enabling RLS with none closes Supabase's public REST API. Do not add `USING (true)`; a CI script (`scripts/check-rls.mjs`) fails on open tables and wide-open policies.
- **Every route is registered** in `tests/api-security.test.ts` with how it is protected. A new route without an entry fails the test.
- **The proxy now also covers the API**: maintenance mode, a same-origin check on state-changing calls (webhook, Inngest, extension and cron are exempt), a per-IP burst limit, a request id. Accurate per-user limits live in the routes (`lib/security/rateLimit.ts`, database backed, fail-open).
- **Consent.** Essential cookies need no consent. Analytics and web vitals are anonymous (no user id, IP or cookie), a fixed event list, and sent only after "Allow analytics". Crash reports are always sent (no personal data). A test fails if a third-party tracker, session replay or Google font is added.
- **Age gate.** A tick before any email is collected, plus a `/welcome` fallback and an API refusal. The shared demo account is exempt (nothing personal is collected through it).
- **AI gateway.** All model calls go through `lib/ai/client.ts`: spend cap, circuit breaker, timeout, size cap, one retry for overflow or truncation, untrusted-data notice. Failures are `AiUnavailableError`, which every caller already treats as "use the no-AI path". Bid numbers never come from the model.
- **Sale times** are read in the yard's time zone (state → zone) and always displayed with the zone name (`lib/time/zones.ts`); a zone-less time with an unknown state is read as UTC so it never depends on where the server runs.
- **Stripe events are applied once** (`StripeEvent` table, released on failure so Stripe's retry works). Refund clawback is proportional and never takes a balance below zero.
- **Email.** Optional mail (reminders) carries a signed one-click unsubscribe and the postal address; essential mail (billing, security) carries the address and says why it can't be switched off. The signing key is `APP_SECRET`, or a key derived from the database URL if unset.
- **Accepted risks** are written down with a reason and a review date in `scripts/audit-allowlist.json`; the audit job fails when the date passes.
- **Error tracking** talks to Sentry's HTTP envelope endpoint directly (no SDK in the bundle). Session replay is never enabled.

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

A modern dashboard look: soft rounded panels, one indigo-blue accent, pill controls. Dark is a deep blue-black with glassy cards and a faint blue glow; light is a soft off-white with white cards. (An earlier attempt with slanted plates, condensed italic capitals and racing flags was dropped because it read as a game; a lime-green variant was dropped in favour of the original blue.)

- **Colour:** `app/globals.css`. `--brand` is the fill (primary buttons, the active nav pill, active tabs, sliders, progress, the credits card) and always carries white text (`--brand-foreground`). `--primary` is the same hue made readable as text and thin lines on the current background (deep indigo on light, light periwinkle on dark). Verdict colours (`--go`, `--caution`, `--stop`) are separate hues, so GO is never confused with "primary".
- **Shape:** large radii (the theme block sets the Tailwind radius steps), pill buttons, tabs and badges, cards with a soft shadow and a bright top edge. No hard edges or uppercase headings.
- **Type:** Geist. Money figures use `.display` (heavier, tight, tabular).
- **Charts:** the validated `--series-*` slots are unchanged; only the single-series activity bars use `--brand-bar`.
- **Logo and icons:** the blue "flagbid" wordmark with no background (theme-aware, `--logo`); the favicon, app icon and extension icon are the "f" on a dark blue tile, and the manifest and theme colours follow the dark background.
- **When changing it:** use the tokens, not hard-coded colours, so light and dark both work; put accent fills on `bg-brand text-brand-foreground`, and use `text-primary` for accent-coloured text.

## Car pictures

Where a lot has no real photo, the app shows a car on a studio floor. These are seven photos cut out of their studio backgrounds (`public/cars/*.webp`, transparent, all facing right): coupes (yellow, orange McLaren), sedans/hatchbacks (grey, blue) and SUVs (orange, white Volvo, white Tesla). `lib/vehicle/looks.ts` (`pickCarLook`) chooses among a body type's photos: one made for the lot's make and model if there is one (the demo Audi A3 gets the blue hatchback), otherwise the closest to the listing's paint colour, and for equally close ones a stable pick from the make and model text, so server and browser always agree. `bodyOf` (server) and `bodyTypeOf` (client) pick one from the make and model; a pickup uses the SUV photo until a pickup photo is added. `CarArt` adds a ground shadow and a glow in the verdict colour, marks damaged zones (positions come from `damageSpot` in `lib/vehicle/art.ts`, so they match the old drawing's zones) and can run a scan sweep. The drawn side views in `lib/vehicle/art.ts` remain only for the demo lots' fake "photos" (`lib/demo/photoSvg.ts`).

**No photo:** in lists and cards (dashboard, history, watchlist, compare) a lot with no auction photo shows a "No preview available" tile with the faint logo behind it (`components/vehicle/no-preview.tsx`, `CarVisual fallback="placeholder"`), not a generic car drawing that could be mistaken for the real car. The report header, the scan animation and the hero keep the illustration because they mark damage on it.

**Licences:** the photos were supplied by the owner and their licences are not recorded here. Before launch, confirm each one is licensed for commercial use or replace it (`public/cars/sedan-wrecked.webp`, the landing-page and sign-in showcase car, still carries a Vecteezy watermark: swap in the paid, watermark-free download under the same file name before launch). To add a photo: put it in `public/cars/`, add a line to `CAR_LOOKS`, and the test in `lib/vehicle/__tests__/looks.test.ts` checks the file.

To change the cars: cut the new photo out (flood the studio background in from the border, remove the floor shadow below the sill line, keep the tyres, feather the edge), flip it to face right, and save it as a WebP with alpha in `public/cars/`. The BMW source photo was small (246 px wide), so the coupe is softer than the others; swap in a larger photo for a crisper one. `/cars/` is excluded from the auth proxy so the landing page and login can show it.

## Database TLS (Supabase)

Supabase's database certificates are signed by Supabase's own authority, which Node does not trust. node-postgres treats `sslmode=require` as \"verify the chain\", so without help every connection fails with \"self-signed certificate in certificate chain\" (the build's migrate/seed step and the running app alike). Skipping verification would make the connection easy to impersonate, so instead the app checks the server against Supabase's published root certificate (`lib/config/supabaseCa.ts`, valid until 2031): `nodePgConfig` gives node-postgres that certificate with verification on (and drops `sslmode`, which would override it), and `prisma.config.ts` writes it to a file for Prisma's migration engine (`sslcert`). Other providers are untouched. `DATABASE_SSL_CA` (a PEM) overrides the certificate for any provider, for example if Supabase rotates its root.

## The car lobby

- The landing page, the sign-in page, the dashboard hero and the waiting screen of an analysis (when the lot has no photo of its own) show **a lobby of cars that take turns** instead of one car (`components/vehicle/car-lobby.tsx`). It cycles through every cut-out photo in `public/cars` (`LOBBY_LOOKS`, wrecked showcase sedan first), sliding each in as the last rolls out, every 3.8 seconds.
- **Clean cars are never marked.** Damage markers only appear on the wrecked sedan, or, on the waiting screen, on the lot's own kind of car once the scan has found real damage: the cars take turns while it looks, then the show stops on that car and marks it (`lock`).
- It starts on the lot's own kind of car (the blue sedan for an Audi A3), and never replaces a real auction photo.
- **Motion rules:** it does not move at all for people who asked for reduced motion, and it holds still while the mouse is on it. It has no buttons or dots: the owner found the pause-and-dots bar visual clutter and asked for it removed. (A visible pause control is what WCAG 2.2.2 asks of auto-moving content that is shown beside other content; here the motion is decorative, the cars carry no information, and reduced-motion is honoured.) Only the first car loads with the page; the other seven load about 0.7 seconds later so they never compete with the first paint.

## Landing icons and the pre-bid checklist

The nine feature cards and three "how it works" steps use FlagBid's own two-tone icons (`components/marketing/feature-icons.tsx`) instead of generic outline glyphs: each one is a small picture of its subject (a receipt with a wrench, a ship carrying containers, a shield against rising water) with one amber detail, on a lit plate that tilts on hover.

"Before you bid" (`components/report/prebid-checklist.tsx`) is laid out as a boarding pass: a stub with a progress ring and a stamp that lands when every step is ticked, a perforated edge, and the steps on a timeline, each tagged Inspect, Paperwork, Money or Logistics (`lib/flags/checklistKinds.ts` sorts the English source line, so it works in every language). Steps are real checkboxes, so keyboard and screen readers work as before; ticks are not saved.

## VIN input

A VIN pasted into the analyze box is checked and decoded live (`/api/vin/[vin]`, the free NHTSA decoder, cached 30 days, 60 checks an hour per user) and shown as a plate with the car's year, model, engine and drive before anything is charged. When the analysis runs, `lib/providers/listing/vinLookup.ts` decodes the VIN again and, with an AI key, searches the web for an auction lot of that exact VIN (damage, odometer, title, location, photos). A lot is used only if the notes name this VIN and say something about damage or photos; it is marked as found by search and may be an earlier sale. Without a lot, the form opens with the decoded car filled in and asks only for the damage, odometer and bid. In demo mode the VIN of a sample car runs the offline fixture.
