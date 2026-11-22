# Pre-launch security, privacy and legal audit

Date: 2026-11-22 · Scope: the whole FlagBid repository (Next.js 16, Prisma 7, Postgres/Supabase, Stripe, Anthropic, Resend).
Method: read every API route and page; wrote tests that attack the app the way a hostile user would; ran each test against a development server and a production build; fixed what failed.

> I am not a lawyer and this is not legal advice. The legal pages are solid templates. Have a lawyer in your country read `/terms` and `/privacy` once before you take real customers.

## Verdict

Before this work: a working demo with good bones (every route checked the signed-in user, money was integer dollars, security headers were set) but **not safe to put real customers on**: the database was open through Supabase's public API, a critical Next.js vulnerability was unpatched, refunds and chargebacks were ignored, deleting an account kept billing the card, and shared links leaked the owner's home ZIP.

After: **every item found is fixed and covered by an automated test**, except the things only you can do (accounts, domain, registrations, rotating the key that was pasted in chat). Those are listed at the end and sequenced in `docs/LAUNCH-PLAN.md`.

The launch rule: *core flows pass repeatedly + edge cases fail gracefully + permissions verified + monitoring live + rollback possible.* Status: flows, edge cases, permissions and rollback are done and tested; **monitoring needs your alert webhook and uptime monitor connected** (30 minutes).

## Your 8 self-tests: results

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Network tab: does any response contain other users' emails, names, ids? | **Pass.** Every endpoint returns only the caller's rows; the only cross-user data is behind admin checks. A shared report link used to leak the owner's home ZIP, pasted text and AI cost: **fixed** | `tests/ownership.test.ts`, `lib/analysis/view.ts` |
| 2 | Second user opens user A's URL | **Pass.** User B gets *not found* for A's reports, batches, photos, journal, watchlist, share, re-run, resume, delete, and cannot change anything | `tests/ownership.test.ts` (6 tests), e2e *someone else's report id* |
| 3 | Stripe refund | **Was failing, now passes.** Refunds, partial refunds, chargebacks, cancellations and failed payments are handled; credits are taken back without going below zero; each Stripe event is applied once | `lib/billing/stripe.ts`, `app/api/stripe/webhook/route.ts`, `tests/stripe-webhook.test.ts` (7 tests) |
| 4 | Disconnect wifi mid-action | **Was weak, now passes.** An offline banner appears, requests fail with a clear message within seconds, buttons recover, nothing spins forever | `components/offline-banner.tsx`, `lib/client/fetch-guard.ts`, `e2e/resilience.spec.ts` (@offline) |
| 5 | Secrets in AI chat history | **One exposure, needs you:** the ScrapingBee key was pasted into this chat. **Rotate it** (`docs/LAUNCH-PLAN.md` step 0). The repository and its full git history are clean | `scripts/secret-scan.mjs --history`, run in CI |
| 6 | A 3-year-old phone | **Pass in emulation.** Slow 4G with a 4× slower CPU: headline visible in 1.5 s, interactive in 3.5 s (production build). No horizontal scroll on Pixel 5, iPhone 13, iPhone SE (320 px), Galaxy S9+, iPad Mini, Galaxy Tab S4. Real-device testing is still yours (see the end) | `e2e/resilience.spec.ts` |
| 7 | Near-duplicate workflows | **One found, fixed.** Inngest and the new daily cron both ran maintenance, and reminders could be triggered from two schedulers. Now the cron endpoint stands down when Inngest is connected, and every reminder is claimed atomically so it can never send twice | `app/api/cron/[job]/route.ts`, `lib/jobs/maintenance.ts`, `tests/account-lifecycle.test.ts` |
| 8 | `/admin` signed out, then as a regular user | **Pass.** Signed out: redirect to sign-in. Regular user: redirected away; admin APIs answer 403. The shared demo account is never admin on a production build | `tests/api-security.test.ts`, `e2e/smoke.spec.ts` |

## Findings by severity

### Critical

| ID | Finding | Fix | Files |
| --- | --- | --- | --- |
| C1 | **Every table was readable and writable through Supabase's public REST API** with the anon key (which ships in the browser). No row-level security anywhere. | Row-level security on all 23 tables, deny by default (the server connects as the owner, which bypasses it, so the app is unaffected); anon/authenticated privileges revoked. A CI check fails if any table lacks RLS. Proven: a non-owner role reads 0 rows | `prisma/migrations/20261122114400_enable_row_level_security/migration.sql`, `scripts/check-rls.mjs` |
| C2 | **Next.js 16.3.8 had critical unauthenticated remote-code-execution advisories** (image optimisation, `use cache`), plus a denial-of-service and several cache-leak issues | Upgraded to 16.4.6; Zod to 4.6.7; overrides for `undici`, `fast-uri`, a vulnerable `effect` path. Audit: **29 findings (2 critical, 10 high) → 4**, all in Prisma's build-time CLI, accepted with a reason and a review date | `package.json`, `pnpm-lock.yaml`, `scripts/audit-gate.mjs`, `scripts/audit-allowlist.json` |
| C3 | A ScrapingBee key was pasted into an AI chat | **You must rotate it.** I cannot. The scan proves it is not in the repo | `docs/LAUNCH-PLAN.md` step 0 |

### High

| ID | Finding | Fix | Files |
| --- | --- | --- | --- |
| H1 | Shared report links exposed the owner's home ZIP (a location), pasted listing text and what the analysis cost | Redacted on shared views | `lib/analysis/view.ts` |
| H2 | Stripe: refunds, disputes, failed payments, async payments ignored; webhook retries could double-apply | Full event coverage; each event id applied once; credits clawed back proportionally, never below zero; alerts on disputes | `lib/billing/stripe.ts`, `app/api/stripe/webhook/route.ts`, `prisma/schema.prisma` (`StripeEvent`) |
| H3 | Deleting an account left the Stripe subscription **still billing** and the Supabase sign-in identity alive | One `deleteAccount` that cancels the subscription, deletes the customer, removes files, erases all rows (cascade) and the auth identity; aborts if Stripe is unreachable | `lib/account/delete.ts`, `app/api/account/route.ts` |
| H4 | No age gate (COPPA) | 18+ and terms tick **before any email is collected**; `/welcome` gate for everyone who skipped it; API refuses until accepted; date and terms version stored | `components/auth/supabase-login.tsx`, `app/(auth)/welcome/page.tsx`, `components/auth/welcome-form.tsx`, `app/api/consent/route.ts`, `lib/auth/session.ts`, `app/auth/callback/route.ts` |
| H5 | Only analyses were rate limited | Database-backed limiter on uploads, checkout, portal, token creation, export, delete, extension, beacons; per-IP burst limit on the whole API | `lib/security/rateLimit.ts`, `lib/security/memoryLimit.ts`, `proxy.ts`, `lib/api.ts`, each route |
| H6 | No CSRF defence on cookie-authenticated JSON routes | Cross-site state-changing API calls are refused (extension, webhook, cron exempt) | `proxy.ts` |
| H7 | Prompt injection: listing text flowed into model prompts | Untrusted-data notice on every call, listing fields flattened to one line, delimiters broken, size caps; bid numbers come from deterministic code and narratives can't introduce figures | `lib/ai/guard.ts`, `lib/ai/client.ts`, `lib/ai/prompts/*`, `tests/prompt-injection.test.ts`, `evals/` |
| H8 | No cost ceiling on AI or the paid page reader | Daily and monthly AI caps with 80% alerts, daily page-reader cap; at the cap the app falls back to no-AI | `lib/ai/budget.ts`, `lib/security/spend.ts`, `lib/config/env.ts` |
| H9 | Model outage would slow or break every analysis | Timeouts, circuit breaker (4 failures/minute opens it for 2 minutes), context-overflow and truncation retries; every failure degrades to the no-AI path | `lib/ai/client.ts`, `lib/ai/guard.ts`, `tests/ai-gateway.test.ts` |
| H10 | Email had no unsubscribe link or postal address | Footer with the operator's name, address and a signed one-click unsubscribe (+ `List-Unsubscribe` headers); unsubscribed users get no optional mail | `lib/email/footer.ts`, `lib/email/send.ts`, `app/api/unsubscribe/route.ts`, `app/(marketing)/unsubscribe/page.tsx` |

### Medium

| ID | Finding | Fix | Files |
| --- | --- | --- | --- |
| M1 | Races: two simultaneous first sign-ins, monthly credit grants, reminders | Unique-violation handling, compare-and-set, atomic claim. 10 simultaneous analyses on 3 credits charge exactly 3 | `lib/auth/session.ts`, `lib/billing/credits.ts`, `lib/jobs/maintenance.ts`, `tests/ownership.test.ts` |
| M2 | **Time zones:** a zone-less sale time was read in the server's zone (UTC), so a 10:00 AM Texas sale was 5 hours off, and times showed no zone | Zone-less times are read in the yard's zone; every sale time is shown with its zone, so 8:00 AM New York reads "8:00 AM EDT" in London | `lib/time/zones.ts`, `lib/providers/listing/normalize.ts`, `components/report/vehicle-tab.tsx`, `components/watchlist/watchlist-client.tsx`, `lib/jobs/maintenance.ts`, `lib/time/__tests__/zones.test.ts` |
| M3 | No error tracking, alerts, logs or monitoring | Structured JSON logs with secret redaction; grouped error table; optional Sentry (no replay); Slack/Discord/email alerts; Next's `onRequestError` hook; Admin → Monitoring; uptime workflow | `lib/observability/*`, `instrumentation.ts`, `app/(admin)/admin/monitoring/page.tsx`, `.github/workflows/uptime.yml` |
| M4 | Raw error strings on sign-in failures (expired magic link) | Plain message and a way to request a new link; only verified emails accepted | `app/auth/callback/route.ts`, `app/(auth)/login/page.tsx` |
| M5 | No 404, 500, loading or global-error screens | Real ones, no stack traces, with a reference id, a retry and crash reporting | `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`, `app/loading.tsx`, `app/(app)/app/error.tsx`, `app/(app)/app/loading.tsx`, `components/error-view.tsx` |
| M6 | Accessibility: failing colour contrast (buttons, badges, chart labels), unlabeled inputs | Tokens darkened, labels added; axe-core WCAG 2.1 A/AA passes on every public page and the app, both themes | `app/globals.css`, `components/ui/button.tsx`, `components/report/*`, `e2e/a11y.spec.ts` |
| M7 | Renewal and cancellation terms were not next to the subscribe button | Added beside every subscribe and buy button (English and Lithuanian) | `components/marketing/pricing-table.tsx`, `components/billing/billing-client.tsx`, `lib/i18n/messages/*/states.ts` |
| M8 | Privacy: analytics and session replay risk | No third-party scripts or replay (a test fails if one is added); consent-gated anonymous analytics; text inputs masked by default; fonts self-hosted (nothing loads from Google) | `components/consent-banner.tsx`, `components/analytics.tsx`, `lib/privacy/*`, `components/ui/input.tsx`, `tests/compliance.test.ts` |
| M9 | Terms and Privacy lacked 18+, injury/loss disclaimers, refunds, cookies, retention, processors, children, rights | Rewritten; DMCA page and agent block added; operator and address come from environment variables | `app/(marketing)/terms/page.tsx`, `app/(marketing)/privacy/page.tsx`, `app/(marketing)/dmca/page.tsx`, `lib/config/legal.ts` |
| M10 | No SEO/AEO basics | `robots.txt` (staging blocked, AI answer engines allowed), sitemap, `llms.txt`, `security.txt`, JSON-LD (Organization, WebSite, SoftwareApplication, FAQ, breadcrumbs), OG/Twitter image, `favicon.ico`, canonical URLs, `noindex` for private pages | `app/robots.ts`, `app/sitemap.ts`, `app/llms.txt/route.ts`, `app/.well-known/security.txt/route.ts`, `lib/seo/schema.ts`, `app/opengraph-image.tsx`, `app/favicon.ico`, `next.config.ts` |
| M11 | No kill switch | `MAINTENANCE_MODE=true` returns a friendly 503 everywhere in one redeploy | `proxy.ts` |

### Low / noted

- Two high-severity advisories remain in Prisma's **build-time** config loader (`deepmerge-ts`, `effect`) and two moderate ones in Inngest's telemetry dependencies. None is reachable from user input or ships in the server bundle; fixing them by force breaks Prisma, which I tried and reverted. They are allowlisted until **2027-01-31**; the audit job fails after that until someone re-checks.
- Pages render dynamically (language comes from a cookie), so they are not CDN-cached. Static assets, car pictures and icons are cached for a week.
- The demo account is a shared admin in development only; on any production build it is a plain user.

## About your "runner scheduling app" audit prompt

That prompt describes a different product (running events), so I applied its **concerns** to FlagBid instead of its literal items:

| Concern in the prompt | FlagBid equivalent | Status |
| --- | --- | --- |
| Injury waivers and disclaimers | Bid-at-your-own-risk, not-advice and limitation-of-liability terms (Terms §2 and §8); consumers' statutory rights preserved | Done |
| Location privacy, scraping of rendezvous points | The user's **home ZIP** and pasted text; shared links no longer carry them; reports are private by row-level security and per-user checks; photos are served only to the owner | Done |
| Time zones (8:00 AM New York seen from London) | Auction sale times (M2) | Done, tested |
| Race on a hard capacity limit | The credit balance (a hard limit): 10 parallel requests on 3 credits charge exactly 3; refunds can't go negative | Done, tested |

## What only you can do (nothing here needs code)

1. **Rotate the ScrapingBee key** and anything else you pasted into a chat.
2. Create the accounts and fill in the variables (Supabase, Stripe, Anthropic, Resend, domain). Order, timings and exact variable names: `docs/LAUNCH-PLAN.md`.
3. **Register a DMCA agent** at copyright.gov (about US$6). Only the legal entity can.
4. **Provider-side spend caps and billing alerts** (Anthropic, Vercel, Supabase, Stripe). The in-app caps help, but the provider caps are the backstop.
5. **Set up SPF, DKIM and DMARC** for your domain (`pnpm email:check-dns yourdomain.com` verifies them).
6. **Have a lawyer read the Terms and Privacy Policy**, and check the *FlagBid* name at EUIPO and your national trademark office.
7. **Test on a few real phones** (an older Android on mobile data). I tested emulations in Chromium; CI also runs the smoke tests in Firefox and WebKit.
8. **Run one real sign-up** with a second email on production: Supabase sign-in could not be exercised here (no project), so that one end-to-end test is skipped locally.
9. **Run the live AI evaluation once** with your key: `pnpm eval:live`. Offline evaluations (parsing accuracy, injection resistance) pass; the live model could not be called from here.
10. Connect the alert webhook and an external uptime monitor so you hear about problems before customers do.

## How to re-run everything

```bash
pnpm check                 # types, lint, 400+ unit and integration tests
pnpm e2e                   # 70+ browser tests: smoke, regression, devices, slow network, offline, accessibility
pnpm eval                  # listing-reader accuracy and prompt-injection resistance (offline)
pnpm db:check-rls          # every table has row-level security
pnpm secrets:scan --history   # no secrets in files or git history
pnpm audit:deps            # no unaccepted high/critical vulnerabilities
pnpm db:restore-test       # backup → restore → compare every table
E2E_BASE_URL=https://yourdomain.com pnpm test:smoke   # read-only checks against production
```

CI runs all of this on every push (`.github/workflows/ci.yml`), plus Firefox/WebKit smoke tests, CodeQL, Dependabot, a post-deploy smoke test, an uptime check and a nightly encrypted backup.
