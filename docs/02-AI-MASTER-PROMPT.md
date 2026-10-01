<!-- Copy EVERYTHING in this file into your AI coding tool (Claude Code, Cursor, Windsurf…). How to use it: docs/03-BUILD-PLAYBOOK.md -->

# MASTER BUILD PROMPT — "AuctionPulse AI"

You are a senior full-stack engineer and AI architect. Build a **production-ready web + mobile-web application called "AuctionPulse AI"** for salvage-car flippers, body shops, small dealers and exporters. The user pastes a salvage-auction listing link (Copart, IAAI, Bid.cars, broker sites), a VIN, or the listing text. The app researches the car and returns an investor report: is the car worth buying, **the maximum they should bid**, an itemized repair cost, the market value after repair, profit, ROI and risks.

Read this whole prompt before writing any code. It is the single source of truth.

---

## 0. RULES FOR HOW YOU WORK

1. **Build in the phases from Section 22, in order.** Finish each phase completely before starting the next: code, migrations, seed, tests, and `pnpm typecheck && pnpm lint && pnpm test` all passing. At the end of each phase, print a short summary of what was built, how to run it, and what I need to provide (API keys etc.).
2. **No stubs, no TODOs, no "implement later" in delivered code.** If an external API key is missing, the matching **demo provider** (Section 18) must make the feature work end to end with fixture data, and the UI shows a "Demo data" badge.
3. **TypeScript `strict: true`, no `any`, no `@ts-ignore`.** Validate every external input and every LLM output with **Zod**.
4. **The AI never does money math.** LLMs only look at photos and extract text, returning structured JSON. Every price, fee, total, bid and verdict is computed by deterministic TypeScript in `lib/calc` and `lib/estimate`.
5. **`lib/calc` is pure.** No I/O, no `Date.now()`, no server-only imports, so it runs identically on the server and in the browser (live sliders). 100% unit-test coverage for `lib/calc`.
6. **All money is integer whole US dollars. All percentages are integer basis points** (`1500` = 15%). Use the single helper `applyBps(amount, bps) = Math.round(amount * bps / 10000)` and `Math.round(hours * rate)` for labor. Never use floating-point percentages in the calculator.
7. If something is ambiguous, choose a sensible default, keep going, and record it in `DECISIONS.md`. Only stop to ask me if you are truly blocked.
8. Priority when trade-offs conflict: **correct money math > honest data (show confidence and sources) > works end to end > UI polish.**

---

## 1. PRODUCT IN ONE PARAGRAPH

A buyer pastes a link such as a Copart lot for a damaged 2019 Audi A3. In under ~90 seconds the app:
- fetches the listing (VIN, title type, odometer, primary/secondary damage, run/drive, keys, sale date, current bid, yard location, all photos),
- decodes the VIN (NHTSA), checks recalls, complaints and title history,
- runs a **vision AI damage audit** over all photos,
- builds an **itemized repair estimate** with best/expected/worst scenarios,
- pulls **market comps** and converts the clean-title value to rebuilt-title value,
- adds **every cost**: tiered auction fees, broker fee, sales tax, transport, title/inspection, storage, holding, selling, contingency, and in export mode freight, duty and VAT,
- **solves for the maximum bid** and shows a **GO / BE CAUTIOUS / WALK AWAY** verdict with a deal score.

The user can then move sliders (labor rate, target profit, parts discount and others) and every number updates instantly without re-running the AI.

---

## 2. USERS & CORE WORKFLOWS

Personas: part-time flipper, full-time flipper/small dealer, body shop owner, exporter (e.g., US → EU via Bid.cars).

Workflows to support:
1. **Single analysis:** paste URL / VIN / listing text (optional photo upload) → live progress → report.
2. **Batch compare:** paste up to 10 URLs → each analyzed → ranked comparison table.
3. **What-if:** adjust sliders and edit repair line items on a report → instant recalculation → save as report overrides or as my defaults.
4. **Watchlist:** save lots, see sale-date countdowns, get email reminders before the sale.
5. **Deal journal:** after buying, log the actual purchase, fees, transport, parts, labor and sale price → P&L dashboard → estimated-vs-actual accuracy.
6. **Manual mode:** if a listing can't be fetched, the user fills a short form and/or pastes the listing text and uploads photos. The analysis still runs.

---

## 3. TECH STACK (use exactly these)

- **Next.js (latest stable), App Router, React Server Components, TypeScript strict**, pnpm
- **Tailwind CSS + shadcn/ui + lucide-react**, dark mode first (with a light toggle) via `next-themes`
- **Recharts** for charts; **TanStack Query** for client data and polling; **React Hook Form + Zod** for forms
- **PostgreSQL on Supabase** + **Prisma ORM**; **Supabase Auth** (email magic link + Google) via `@supabase/ssr`; **Supabase Storage** (private bucket `listing-photos`)
- **Inngest** for the durable multi-step analysis workflow (retries, parallel steps), plus cron jobs
- **Vercel AI SDK** (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`) behind `lib/ai/client.ts`, so the provider and model are set by env vars. Use the SDK's structured-output API (`generateObject` or its current equivalent) with Zod schemas.
  - Default vision model: `claude-sonnet-5-5`. Default cheap text model: `claude-haiku-4-5-20251001`.
  - OpenAI works by setting `AI_PROVIDER=openai` and model env vars.
- **sharp** for image resizing; **@react-pdf/renderer** for PDF export; **Stripe** (Checkout, Customer Portal, webhooks); **Resend** for email
- **Vitest** for unit tests, **Playwright** for e2e (use the preinstalled Chromium if present)
- Deploy target: **Vercel** + Supabase + Inngest Cloud

---

## 4. FOLDER STRUCTURE

```
app/
  (marketing)/page.tsx                 landing page
  (marketing)/pricing/page.tsx
  (auth)/login/page.tsx
  (app)/app/layout.tsx                 authenticated shell (sidebar desktop, bottom nav mobile)
  (app)/app/page.tsx                   dashboard + AnalyzeBar
  (app)/app/analyses/[id]/page.tsx     progress → report
  (app)/app/compare/page.tsx           new batch
  (app)/app/compare/[batchId]/page.tsx batch results
  (app)/app/calculator/page.tsx        manual calculator (no AI)
  (app)/app/watchlist/page.tsx
  (app)/app/history/page.tsx
  (app)/app/journal/page.tsx
  (app)/app/settings/page.tsx
  (app)/app/billing/page.tsx
  (app)/app/share/page.tsx             PWA share-target handler
  (admin)/admin/{fees,parts,export-profiles,users,usage}/page.tsx
  r/[token]/page.tsx                   public read-only shared report
  api/analyses/route.ts                POST create
  api/analyses/[id]/route.ts           GET status/result, PATCH overrides
  api/analyses/[id]/pdf/route.ts       GET PDF
  api/batches/route.ts                 POST create batch
  api/extension/ingest/route.ts        POST from browser extension (Bearer token)
  api/inngest/route.ts
  api/stripe/{checkout,portal,webhook}/route.ts
components/
  input/AnalyzeBar.tsx
  report/{DealCard,BidLadder,VerdictBadge,DealScoreGauge,ScenarioTable,CostWaterfall,
          DamageZoneMap,PhotoGallery,RepairLineItemsTable,CompsTable,CompsScatter,
          RiskFlagsList,BeforeYouBidChecklist,VehicleSpecs,HistoryPanel,LogisticsPanel,
          WhatIfPanel,AnalysisProgress,DemoBadge,Disclaimer}.tsx
  compare/CompareTable.tsx
  ui/…                                 shadcn components
lib/
  calc/       money.ts fees.ts solver.ts repair.ts calculator.ts verdict.ts dealScore.ts types.ts index.ts __tests__/
  domain/     schemas.ts (Zod) titles.ts vehicleClass.ts damageZones.ts
  input/      parseInput.ts vin.ts urls.ts
  providers/
    listing/  index.ts demo.ts extension.ts scrapingApi.ts pasteText.ts manual.ts
              parsers/{copart,iaai,bidcars,generic}.ts
    vin/      nhtsa.ts demo.ts
    history/  vinaudit.ts demo.ts
    market/   marketcheck.ts vinauditMarket.ts listingAcv.ts aiEstimate.ts demo.ts stats.ts
    parts/    reference.ts aiEstimate.ts
    geo/      zip.ts distance.ts
    fx/       frankfurter.ts
  ai/         client.ts usage.ts narrativeGuard.ts
              prompts/{vision,extractListing,partsPrice,marketEstimate,narrative}.ts
  estimate/   rules.ts laborReference.ts repairEstimator.ts scenarios.ts contingency.ts
  flags/      riskFlags.ts checklist.ts
  pipeline/   inngest.ts analysisRun.ts progress.ts cache.ts
  storage/    photos.ts
  billing/    plans.ts stripe.ts credits.ts
  config/     env.ts providers.ts defaults.ts verdictWeights.ts
  db/         prisma.ts
  auth/       server.ts client.ts middleware helpers
prisma/       schema.prisma seed.ts
fixtures/     listings/*.json html/*.html photos/*.svg ai/*.json market/*.json
data/         us-zip-centroids.csv (Census Gazetteer ZCTA, public domain)
extension/    (Phase 7) Chrome MV3 extension
e2e/          *.spec.ts
DECISIONS.md  README.md  .env.example
```

---

## 5. DATABASE (Prisma schema; extend only if needed)

```prisma
generator client { provider = "prisma-client-js" }
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Plan           { FREE PRO BUSINESS }
enum Role           { USER ADMIN }
enum AuctionSource  { COPART IAAI BIDCARS AUTOBIDMASTER OTHER MANUAL }
enum InputType      { URL VIN TEXT MANUAL EXTENSION }
enum AnalysisStatus { QUEUED RUNNING COMPLETED FAILED }
enum Verdict        { GO BE_CAUTIOUS WALK_AWAY }
enum TitleCategory  { CLEAN SALVAGE REBUILT NON_REPAIRABLE PARTS_ONLY FLOOD OTHER UNKNOWN }
enum RunCondition   { RUNS_AND_DRIVES STARTS WONT_START UNKNOWN }
enum BuyerType      { LICENSED_DEALER PUBLIC_VIA_BROKER }
enum PartSource     { OEM_NEW AFTERMARKET USED }
enum ExitStrategy   { RETAIL_REBUILT EXPORT }

model User {
  id               String   @id            // Supabase auth user id
  email            String   @unique
  name             String?
  role             Role     @default(USER)
  plan             Plan     @default(FREE)
  stripeCustomerId String?  @unique
  creditsRemaining Int      @default(3)
  creditsResetAt   DateTime?
  apiTokenHash     String?  @unique        // sha256 of the extension token
  createdAt        DateTime @default(now())
  settings         UserSettings?
  analyses         Analysis[]
  batches          Batch[]
  watchlist        WatchlistItem[]
  deals            DealJournalEntry[]
  ledger           CreditLedger[]
}

model UserSettings {
  userId                 String       @id
  user                   User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  homeZip                String       @default("77002")
  currency               String       @default("USD")
  buyerType              BuyerType    @default(LICENSED_DEALER)
  laborRate              Int          @default(70)
  paintMaterialsPerHour  Int          @default(40)
  partsSourcePreference  PartSource   @default(AFTERMARKET)
  partsDiscountBps       Int          @default(0)
  rebuiltFactorBps       Int          @default(7000)
  listToSaleBps          Int          @default(9600)
  targetProfitBps        Int          @default(1500)
  targetProfitMin        Int          @default(2500)
  transportCentsPerMile  Int          @default(150)
  transportMin           Int          @default(150)
  titleRegInspection     Int          @default(300)
  storageDays            Int          @default(0)
  storagePerDay          Int          @default(0)
  holdingCostPerDay      Int          @default(8)
  holdingDaysExpected    Int          @default(30)
  sellingCostBps         Int          @default(200)
  sellingCostFixed       Int          @default(0)
  salesTaxBps            Int          @default(0)
  brokerFee              Int          @default(0)
  contingencyOverrideBps Int?
  exitStrategy           ExitStrategy @default(RETAIL_REBUILT)
  exportProfileId        String?
  updatedAt              DateTime     @updatedAt
}

model Vehicle {
  vin              String    @id
  year             Int?
  make             String?
  model            String?
  trim             String?
  bodyClass        String?
  driveType        String?
  engine           String?
  fuelType         String?
  transmission     String?
  vehicleClass     String?   // economy|mainstream|premium|luxury|truck_suv|ev
  decoded          Json?
  decodedAt        DateTime?
  recalls          Json?
  complaintsSummary Json?
  checksFetchedAt  DateTime?
  history          Json?
  historyProvider  String?
  historyFetchedAt DateTime?
  listings         Listing[]
}

model Listing {
  id                String         @id @default(cuid())
  source            AuctionSource
  sourceUrl         String?
  lotNumber         String?
  vin               String?
  vehicle           Vehicle?       @relation(fields: [vin], references: [vin])
  year              Int?
  make              String?
  model             String?
  trim              String?
  odometer          Int?
  odometerUnit      String         @default("mi")
  odometerBrand     String?        // ACTUAL | NOT_ACTUAL | EXEMPT | EXCEEDS_MECHANICAL_LIMITS | UNKNOWN
  titleCategory     TitleCategory  @default(UNKNOWN)
  titleRaw          String?
  titleState        String?
  primaryDamage     String?
  secondaryDamage   String?
  runCondition      RunCondition   @default(UNKNOWN)
  hasKeys           Boolean?
  saleDate          DateTime?
  saleStatus        String?        // PURE_SALE | MINIMUM_BID | ON_APPROVAL | BUY_NOW | UNKNOWN
  currentBid        Int?
  buyNowPrice       Int?
  listedRetailValue Int?           // Copart "Est. Retail Value" / IAAI "ACV" — low trust
  yardName          String?
  yardCity          String?
  yardState         String?
  yardZip           String?
  sellerType        String?
  extractionMethod  String         // FIXTURE | PARSER | LLM | EXTENSION | MANUAL
  rawData           Json?
  fetchedAt         DateTime       @default(now())
  photos            ListingPhoto[]
  analyses          Analysis[]
  watchlist         WatchlistItem[]
  @@unique([source, lotNumber])
  @@index([vin])
}

model ListingPhoto {
  id          String  @id @default(cuid())
  listingId   String
  listing     Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  position    Int
  originalUrl String?
  storagePath String?
  width       Int?
  height      Int?
  sha256      String?
  @@index([listingId])
}

model Analysis {
  id               String         @id @default(cuid())
  userId           String
  user             User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  listingId        String?
  listing          Listing?       @relation(fields: [listingId], references: [id])
  batchId          String?
  batch            Batch?         @relation(fields: [batchId], references: [id])
  inputType        InputType
  inputValue       String
  status           AnalysisStatus @default(QUEUED)
  currentStep      String?
  progress         Int            @default(0)   // 0–100
  error            String?
  settingsSnapshot Json           // CalcSettings at run time
  damage           Json?          // DamageAssessment (Zod-validated on read)
  repairEstimate   Json?          // RepairEstimate
  market           Json?          // MarketValuation
  logistics        Json?          // LogisticsInfo
  calcInput        Json?          // CalcInput (baseline) — lets the browser recompute
  calc             Json?          // CalculationResult (baseline)
  flags            Json?          // RiskFlag[]
  checklist        Json?          // string[]
  narrative        String?
  verdict          Verdict?
  maxBid           Int?
  comfortBid       Int?
  breakEvenBid     Int?
  expectedProfit   Int?
  dealScore        Int?
  userOverrides    Json?          // WhatIf values + edited line items
  dataSources      Json?          // per-step: provider used, demo/live, confidence
  aiModel          String?
  aiCostUsd        Float?
  shareToken       String?        @unique
  createdAt        DateTime       @default(now())
  completedAt      DateTime?
  journal          DealJournalEntry[]
  @@index([userId, createdAt])
}

model Batch {
  id        String     @id @default(cuid())
  userId    String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String?
  createdAt DateTime   @default(now())
  analyses  Analysis[]
}

model WatchlistItem {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  listingId  String
  listing    Listing   @relation(fields: [listingId], references: [id], onDelete: Cascade)
  analysisId String?
  notes      String?
  myMaxBid   Int?
  remindAt   DateTime?
  remindedAt DateTime?
  createdAt  DateTime  @default(now())
  @@unique([userId, listingId])
}

model DealJournalEntry {
  id                 String    @id @default(cuid())
  userId             String
  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  analysisId         String?
  analysis           Analysis? @relation(fields: [analysisId], references: [id])
  vin                String?
  title              String
  purchasePrice      Int?
  auctionFeesActual  Int?
  transportActual    Int?
  partsActual        Int?
  laborActual        Int?
  otherCostsActual   Int?
  salePrice          Int?
  purchasedAt        DateTime?
  soldAt             DateTime?
  notes              String?
  createdAt          DateTime  @default(now())
}

model FeeSchedule {
  id                String        @id @default(cuid())
  source            AuctionSource
  buyerType         BuyerType
  name              String
  buyerFeeTiers     Json          // FeeTier[]
  onlineBidFeeTiers Json          // FeeTier[]
  fixedFees         Json          // { label, amount }[]
  isPlaceholder     Boolean       @default(true)
  sourceUrl         String?
  verifiedAt        DateTime?
  active            Boolean       @default(true)
  updatedAt         DateTime      @updatedAt
}

model PartPriceReference {
  id             String     @id @default(cuid())
  partKey        String     // e.g. "front_bumper_cover"
  vehicleClass   String     // economy|mainstream|premium|luxury|truck_suv|ev
  source         PartSource
  priceLow       Int
  priceHigh      Int
  isPlaceholder  Boolean    @default(true)
  updatedAt      DateTime   @updatedAt
  @@unique([partKey, vehicleClass, source])
}

model LaborReference {
  partKey        String  @id
  displayName    String
  zone           String
  bodyHoursLow   Float
  bodyHoursHigh  Float
  paintHoursLow  Float
  paintHoursHigh Float
  mechHoursLow   Float   @default(0)
  mechHoursHigh  Float   @default(0)
}

model ExportProfile {
  id                    String  @id @default(cuid())
  name                  String  // e.g. "Lithuania via Klaipėda (container)"
  countryCode           String
  currency              String
  departurePortZip      String  // US port the car ships from, e.g. "07114" (Newark)
  inlandToPortCentsPerMile Int
  portAndLoading        Int
  oceanFreight          Int
  marineInsuranceBps    Int
  destinationPortFees   Int
  customsBrokerFee      Int
  dutyBps               Int     // e.g. 1000 = 10% (EU passenger cars)
  vatBps                Int
  vatRecoverableDefault Boolean @default(false)
  registrationTax       Int
  complianceConversion  Int
  deliveryFromPort      Int
  isPlaceholder         Boolean @default(true)
}

model CreditLedger {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  delta      Int
  reason     String   // ANALYSIS | REFUND | MONTHLY_RESET | PURCHASE | ADMIN
  analysisId String?
  createdAt  DateTime @default(now())
}

model ApiCache {
  key       String   @id
  value     Json
  expiresAt DateTime
}

model AiUsage {
  id           String   @id @default(cuid())
  analysisId   String?
  purpose      String   // VISION | EXTRACT | PARTS_PRICE | MARKET_ESTIMATE | NARRATIVE
  model        String
  inputTokens  Int
  outputTokens Int
  costUsd      Float
  createdAt    DateTime @default(now())
}
```

`prisma/seed.ts` must seed: the placeholder Copart/IAAI fee schedules (Section 12) for both buyer types, about 60 `LaborReference` rows and `PartPriceReference` rows for common collision parts × 6 vehicle classes × 3 sources (clearly `isPlaceholder: true`), two placeholder export profiles (e.g., "Lithuania via Klaipėda" and "Germany via Bremerhaven", 10% duty, VAT 21% / 19%, everything else editable), and a demo user with default settings.

---

## 6. CORE DOMAIN TYPES (Zod, in `lib/domain/schemas.ts`)

```ts
export const NormalizedListingSchema = z.object({
  source: z.enum(['COPART','IAAI','BIDCARS','AUTOBIDMASTER','OTHER','MANUAL']),
  sourceUrl: z.string().url().nullable(),
  lotNumber: z.string().nullable(),
  vin: z.string().length(17).nullable(),
  year: z.number().int().nullable(), make: z.string().nullable(),
  model: z.string().nullable(), trim: z.string().nullable(),
  odometer: z.number().int().nullable(), odometerUnit: z.enum(['mi','km']),
  odometerBrand: z.enum(['ACTUAL','NOT_ACTUAL','EXEMPT','EXCEEDS_MECHANICAL_LIMITS','UNKNOWN']),
  titleRaw: z.string().nullable(), titleState: z.string().nullable(),
  titleCategory: z.enum(['CLEAN','SALVAGE','REBUILT','NON_REPAIRABLE','PARTS_ONLY','FLOOD','OTHER','UNKNOWN']),
  primaryDamage: z.string().nullable(), secondaryDamage: z.string().nullable(),
  runCondition: z.enum(['RUNS_AND_DRIVES','STARTS','WONT_START','UNKNOWN']),
  hasKeys: z.boolean().nullable(),
  engine: z.string().nullable(), transmission: z.string().nullable(),
  drive: z.string().nullable(), fuel: z.string().nullable(), color: z.string().nullable(),
  saleDate: z.string().datetime().nullable(),
  saleStatus: z.enum(['PURE_SALE','MINIMUM_BID','ON_APPROVAL','BUY_NOW','UNKNOWN']),
  currentBid: z.number().int().nullable(), buyNowPrice: z.number().int().nullable(),
  listedRetailValue: z.number().int().nullable(),
  location: z.object({ yardName: z.string().nullable(), city: z.string().nullable(),
                       state: z.string().nullable(), zip: z.string().nullable() }),
  sellerType: z.string().nullable(),
  photoUrls: z.array(z.string().url()),
  extractionMethod: z.enum(['FIXTURE','PARSER','LLM','EXTENSION','MANUAL']),
  warnings: z.array(z.string()),
});

export const RiskFlagSchema = z.object({
  code: z.string(),                 // e.g. 'FLOOD_SUSPECTED'
  level: z.enum(['HARD_STOP','HIGH','MEDIUM','INFO']),
  title: z.string(),
  detail: z.string(),
  source: z.enum(['LISTING','VIN','HISTORY','VISION','MARKET','CALC','SYSTEM']),
});

export const RepairLineItemSchema = z.object({
  id: z.string(),
  partKey: z.string().nullable(),   // matches LaborReference/PartPriceReference when known
  partName: z.string(),
  zone: DamageZone, side: z.enum(['LH','RH','CENTER','BOTH','NA']),
  action: z.enum(['REPLACE','REPAIR','REFINISH','INSPECT']),
  origin: z.enum(['VISIBLE','HIDDEN_LIKELY','RULE']),   // seen in photos / AI-suspected / added by rules
  probability: z.number().min(0).max(1),                // 1 for VISIBLE
  confidence: z.number().min(0).max(1),
  photoRefs: z.array(z.number().int()),
  prices: z.object({                                    // whole USD; null = not available from that source
    OEM_NEW: PriceRange.nullable(), AFTERMARKET: PriceRange.nullable(), USED: PriceRange.nullable() }),
  priceOrigin: z.enum(['REFERENCE','AI_ESTIMATE','USER']),
  bodyHours: HoursRange, paintHours: HoursRange, mechHours: HoursRange,
  included: z.boolean(),            // user can toggle
  userEdited: z.boolean(),
});
// PriceRange = { low, mid, high } ints; HoursRange = { low, mid, high } numbers (1 decimal)
// Sublets are line items too, with partKey like 'sublet_alignment', priced in prices.AFTERMARKET.
```

Define also: `DamageAssessment` (Section 9), `RepairEstimate` (`{ lineItems, sublets, severityContingencyBps, notes }`), `MarketValuation` (Section 11), `LogisticsInfo` (`{ distanceMiles, distanceMethod, yardZip, userZip }`), and all calculator types (Section 13).

---

## 7. INPUT HANDLING & LISTING INGESTION

### 7.1 `parseInput(raw)` → `{ type: 'URL'|'VIN'|'TEXT', source?, lotNumber?, vin?, url? }`
- **VIN:** 17 characters, `[A-HJ-NPR-Z0-9]`. Verify the North-American check digit (position 9). A failed check is a **warning, not an error**, because non-NA VINs may not use it.
- **URL:** detect the source from the host. Use tolerant regexes, each covered by unit tests with realistic sample URLs:
  - `copart.com` (lot number from `/lot/{digits}`)
  - `iaai.com` (stock id from `VehicleDetail/{digits}` patterns)
  - `bid.cars` (lot id from `/lot/{id}`)
  - `autobidmaster.com`, `abetter.bid`, `salvagebid.com` → source with best-effort lot id
  - anything else → `OTHER`
- Anything else → `TEXT` (pasted listing text).

### 7.2 Listing provider chain (`lib/providers/listing/index.ts`)
Interface: `fetchListing(input, ctx): Promise<NormalizedListing>`. Try in order and stop at the first success:
1. **Cache:** `Listing` with the same `(source, lotNumber)` fetched < 6 h ago.
2. **Demo provider:** when `DEMO_MODE=true` (Section 18).
3. **Extension payload:** if the request came from the extension, use its captured text, JSON-LD and image URLs.
4. **Scraping API provider:** ScrapingBee (or Apify if `APIFY_TOKEN` is set) fetches the rendered page. Then the site-specific parser (`parsers/copart.ts` etc.) reads embedded JSON or DOM. If the parser can't fill VIN + year/make/model, fall back to **LLM extraction** (cheap text model, `extractListing` prompt) over the cleaned page text. Parsers are tested against saved HTML fixtures in `fixtures/html/`.
5. **Paste-text provider:** LLM extraction from user-pasted text, plus photos the user uploads.
6. **Manual provider:** the form values.

If every automatic path fails, the analysis pauses with `status=RUNNING` and `currentStep='NEEDS_INPUT'` (Inngest `step.waitForEvent('analysis/input-provided', { timeout: '24h' })`). The UI asks the user to paste the listing text (Ctrl+A, Ctrl+C on the listing page) and/or upload photos, then resumes. On timeout the analysis is FAILED and the credit is refunded.

**Title mapping** (`lib/domain/titles.ts`):
- SALVAGE / SALVAGE CERTIFICATE / CERT OF TITLE-SALVAGE → `SALVAGE`
- REBUILT / RECONSTRUCTED → `REBUILT`
- CLEAN / CERTIFICATE OF TITLE without a brand → `CLEAN`
- NON-REPAIRABLE / CERTIFICATE OF DESTRUCTION / JUNK / DISMANTLE ONLY → `NON_REPAIRABLE`
- PARTS ONLY / BILL OF SALE PARTS ONLY → `PARTS_ONLY`
- FLOOD / WATER DAMAGE → `FLOOD`
- Unknown strings → the cheap LLM classifies them, or `UNKNOWN`.

Also normalize run condition ("Run and Drive", "Engine Start Program", "Starts", "Stationary", "Won't Start") and sale status.

### 7.3 Photos (`lib/storage/photos.ts`)
- Download up to `AI_MAX_PHOTOS` (default 24) in listing order. If a direct fetch is blocked, use the scraping API.
- Resize with sharp to ≤1568 px on the long edge (JPEG, quality 80), compute sha256, and store at `listing-photos/{listingId}/{position}.jpg` in the **private** bucket. Serve via signed URLs (1 h).
- SSRF protection: https only; block private/loopback IP ranges; enforce a size limit of 15 MB per image.
- An Inngest cron job deletes photos older than 90 days.

---

## 8. ENRICHMENT

- **NHTSA vPIC:** `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/{VIN}?format=json`. Map to year, make, model, trim, bodyClass, driveType, engine (displacement, cylinders, turbo), fuelType, transmission. Cache forever per VIN.
- **NHTSA recalls:** `https://api.nhtsa.gov/recalls/recallsByVehicle?make=&model=&modelYear=`. **Complaints:** `https://api.nhtsa.gov/complaints/complaintsByVehicle?make=&model=&modelYear=`. Summarize complaints into the top components by count, which feeds "Common problems" in the report. Cache 7 days.
- **Cross-check:** if the decoded year/make/model don't match the listing, raise flag `VIN_MISMATCH` (HIGH).
- **Vehicle class** (`lib/domain/vehicleClass.ts`): `ev` if fuel is electric; `truck_suv` for pickups and full-size SUVs; `luxury` (Porsche, Land Rover, Maserati, Bentley, Rolls-Royce, Lamborghini, Ferrari, Aston Martin, McLaren); `premium` (Audi, BMW, Mercedes-Benz, Lexus, Acura, Infiniti, Volvo, Genesis, Lincoln, Cadillac, Jaguar, Alfa Romeo); `economy` (Mitsubishi, Fiat, small Kia/Hyundai/Nissan/Chevrolet models); everything else `mainstream`. Put the mapping in one editable table.
- **History provider** (optional): VinAudit (NMVTIS) when `VINAUDIT_API_KEY` is set, else demo/none. Extract title brands per state and date, junk/salvage/insurance records, odometer readings, and theft records. Flags: `PRIOR_SALVAGE_EVENTS` (more than one total-loss event), `ODOMETER_INCONSISTENT`, `TITLE_BRAND_HISTORY`, `THEFT_RECORD`. Show the NMVTIS disclaimer when this data is shown. Cache 30 days.
- **Distance:** look up yard ZIP and user ZIP in `data/us-zip-centroids.csv`, compute haversine × 1.18 road factor, and round to whole miles. If the yard ZIP is unknown, use the city/state centroid; failing that, a default of 500 mi plus flag `DISTANCE_ESTIMATED`.
- **FX** (export mode): Frankfurter API (ECB rates), cached 12 h.
- Always add an outbound link to **NICB VINCheck** in the report (free theft/total-loss check, no API).

---

## 9. VISION AI DAMAGE AUDIT

`lib/ai/prompts/vision.ts`. Send all photos in one structured-output call (≤ `AI_MAX_PHOTOS`). Put a text label `Photo {n}:` before each image, and include the listing metadata as context. Cache the result by `sha256(sorted photo hashes)` for 30 days.

### 9.1 System prompt (use verbatim, you may extend)
```
You are a senior collision damage appraiser and salvage-auction buyer with 20 years of experience.
You are reviewing auction photos for a professional car flipper deciding how much to bid.
Return ONLY data matching the provided JSON schema. Do NOT estimate prices.

RULES
1. Evidence first. Every item in damaged_parts must cite the photo numbers where it is visible.
   Anything inferred but not visible goes in likely_hidden_damage with a probability (0–1) and a reason.
2. Be conservative. Give each part a confidence (0–1). Dark, blurry, distant or low-resolution photos lower confidence.
3. Use standard collision-estimating part names, with LH/RH (LH = driver side on US vehicles), e.g.:
   Front bumper cover, Front bumper reinforcement, Bumper energy absorber, Grille, Headlamp assembly LH,
   Fog lamp RH, Hood panel, Fender LH, Radiator support, A/C condenser, Radiator, Intercooler,
   Cooling fan assembly, Front door shell RH, Quarter panel LH, Rocker panel LH, Roof panel, Windshield,
   Driver frontal airbag, Passenger frontal airbag, Knee airbag LH, Curtain airbag LH, Seat belt pretensioner LH,
   SRS control module, Front lower control arm LH, Steering knuckle LH, Wheel LH front, Tire RH rear,
   Front radar sensor, Windshield camera, Rear bumper cover, Trunk lid, Tail lamp LH, Rear body panel, Trunk floor.
4. Action: REPLACE (torn, kinked, cracked, deployed, structurally deformed), REPAIR (dents without kinks, accessible),
   REFINISH (paint only), INSPECT (cannot determine).
5. Structural indicators: buckled/kinked frame rails or aprons, shifted strut towers, uneven door/hood/fender gaps,
   radiator support displaced beyond the bumper area, wheel pushed back or visibly wrong camber/toe,
   pillar/roof deformation, windshield cracked from body flex, B-pillar intrusion. If present, set
   frame_damage_suspected=true and explain in frame_evidence.
6. Airbags: visible bag fabric, open steering-wheel cover, split dash, hanging curtain bags, deployed knee bag.
   List each deployed airbag. If any deployed, add seat belt pretensioners and SRS control module to likely_hidden_damage.
7. Flood: water line or silt on door panels/seats, mud in seat tracks or footwells, corrosion on seat rails/under-dash
   bolts, moisture in lamps or gauges, mildew. Fire: soot, melted plastics, burned wiring.
8. If there is no engine-bay photo, set engine_bay_intact=null and add "engine_bay" to missing_critical_angles.
   Do the same for interior, undercarriage and each side of the car.
9. Severity 1–10: 1–2 cosmetic; 3–4 bolt-on panels only; 5–6 bolt-on + cooling/lighting, possible minor structural
   (radiator support); 7–8 structural damage likely, airbags with major impact, suspension damage;
   9–10 severe structural, rollover, fire, flood with interior submersion, multiple impact zones.
10. Hours: per part, typical flat-rate times for a professional shop. Body hours = remove/install, replace, repair.
    Paint hours = refinish. Mech hours = suspension, cooling, A/C, mechanical.
11. Compare with the listing metadata. Report contradictions as red_flags (e.g., listing says "Front End" but
    photos show rear damage; visible odometer reading differs from the listing).
12. EV/hybrid: damage near the high-voltage battery, underbody impact, or orange HV cables damaged
    → red flag level "high".
13. Be concise. No marketing language.
```

### 9.2 Output schema (Zod)
```ts
export const DamageAssessmentSchema = z.object({
  photo_coverage: z.object({
    angles_present: z.array(z.enum(['front','front_left','left','rear_left','rear','rear_right','right',
      'front_right','interior_front','interior_rear','dashboard_odometer','engine_bay','trunk',
      'undercarriage','roof','wheels','vin_plate','other'])),
    missing_critical_angles: z.array(z.string()),
    image_quality: z.enum(['good','fair','poor']),
  }),
  photos: z.array(z.object({ index: z.number().int(), angle: z.string(), findings: z.string() })),
  impact_zones: z.array(z.object({ zone: DamageZone, severity: z.number().int().min(0).max(10), description: z.string() })),
  damaged_parts: z.array(z.object({
    part_name: z.string(),
    category: z.enum(['body_panel','structural','lighting','glass','cooling','suspension_steering',
      'airbag_srs','mechanical','electrical_adas','interior','wheels_tires','other']),
    zone: DamageZone, side: z.enum(['LH','RH','CENTER','BOTH','NA']),
    action: z.enum(['REPLACE','REPAIR','REFINISH','INSPECT']),
    photo_refs: z.array(z.number().int()),
    confidence: z.number().min(0).max(1),
    body_hours: z.number().min(0), paint_hours: z.number().min(0), mech_hours: z.number().min(0),
    notes: z.string().optional(),
  })),
  likely_hidden_damage: z.array(z.object({ part_name: z.string(), zone: DamageZone,
    probability: z.number().min(0).max(1), reason: z.string() })),
  severity_score: z.number().int().min(1).max(10),
  airbag_deployed: z.boolean(),
  airbags_deployed_list: z.array(z.string()),
  frame_damage_suspected: z.boolean(), frame_evidence: z.string(),
  suspension_damage_suspected: z.boolean(),
  engine_bay_intact: z.boolean().nullable(),
  flood_indicators: z.array(z.string()), fire_indicators: z.array(z.string()),
  interior_condition: z.enum(['good','fair','poor','unknown']),
  odometer_reading_visible: z.number().int().nullable(),
  red_flags: z.array(z.object({ code: z.string(), message: z.string(), level: z.enum(['high','medium','info']) })),
  overall_confidence: z.number().min(0).max(1),
  summary: z.string(),
});
// DamageZone = 'front'|'front_left'|'front_right'|'left_side'|'right_side'|'rear'|'rear_left'|'rear_right'
//            |'roof'|'undercarriage'|'interior'|'engine_bay'
```
If validation fails, retry once with the validation errors appended. If it still fails, mark the step degraded and open the **manual damage editor** (click zones on the car map, tick parts from a per-zone checklist).

---

## 10. REPAIR ESTIMATOR (`lib/estimate`)

1. **Normalize parts:** map each AI `part_name` to a `partKey` (fuzzy match against `LaborReference.displayName` plus a synonyms table). Unknown parts keep `partKey=null`.
2. **Rules engine** (`rules.ts`) adds lines with `origin='RULE'`:
   - any airbag deployed → `srs_module` (REPLACE, or a "crash data reset" sublet when cheaper) + `seat_belt_pretensioner` ×2 + `sublet_srs_diag`
   - front zone severity ≥ 5 → hidden `ac_condenser`, `radiator`, `cooling_fan` (if not already listed); `intercooler` if the engine is turbo; `sublet_ac_recharge`
   - suspension suspected or wheel damage → `control_arm`, `tie_rod`, `sublet_alignment`
   - front bumper/grille on a vehicle with ACC/radar, or windshield replaced → `sublet_adas_calibration`
   - any structural part → `sublet_frame_measure`
   - keys missing → `sublet_key_programming`
   - doesn't start → `sublet_diagnostic`
   - EV + underbody/side impact → `sublet_hv_battery_inspection` + HIGH flag
3. **Hours:** take the AI hours and clamp them into `[LaborReference.low, LaborReference.high]` when the part is known. The `low/mid/high` hours are the clamped low, AI value (clamped) and clamped high. Unknown parts keep the AI hours, with ±30% for low/high.
4. **Prices:** use `PartPriceReference` for (partKey, vehicleClass, source) when it exists (`priceOrigin='REFERENCE'`). Otherwise make one batched cheap-LLM call (`partsPrice` prompt, structured output) for all unpriced parts on this specific vehicle (`priceOrigin='AI_ESTIMATE'`, confidence ≤ 0.5). REPAIR/REFINISH actions have zero parts cost.
5. **Base contingency by severity:** 1–3 → 1000 bps, 4–6 → 1500, 7–8 → 2500, 9–10 → 3500 (user override wins).
6. **Scenario aggregation** (`lib/calc/repair.ts`, pure, also used by the browser):

| | Best | Expected | Worst |
|---|---|---|---|
| Lines included | VISIBLE + RULE (not HIDDEN) | + HIDDEN with probability ≥ 0.5 | + HIDDEN with probability ≥ 0.2 |
| Part price | cheapest available source, `low` | user's preferred source (fallback order: AFTERMARKET → USED → OEM_NEW), `mid` | OEM_NEW `high` (fallback: highest available) |
| Hours | low | mid | high |
| Contingency | base − 500 bps (min 500) | base | base + 1000 |

`aggregateRepair(lineItems, scenario, settings) → RepairInputs` (see Section 13). Excluded lines (`included=false`) are skipped in every scenario.

---

## 11. MARKET VALUATION (`lib/providers/market`)

Provider chain: **Marketcheck** (`MARKETCHECK_API_KEY`) → **VinAudit market value** (`VINAUDIT_API_KEY`) → **listing ACV fallback** (`listedRetailValue × 0.85`, confidence 0.3) → **AI estimate** (cheap model; P25/P50/P75 clean retail for this year/make/model/trim/mileage/ZIP; confidence 0.25, labeled "AI estimate — verify"). In demo mode, use fixtures.

For comps providers:
1. Search the same make/model, year ±1, trim if known, mileage ±25k, within 200 mi of the user's ZIP. If fewer than 5 comps, widen to year ±2 and 500 mi (lower confidence).
2. **Mileage adjustment:** with ≥ 8 comps, fit OLS price~mileage and clamp the slope to [−0.25, 0] $/mi. Otherwise use −0.08 $/mi. Adjust each comp to the subject's mileage.
3. Compute P25/P50/P75 of the adjusted prices × `listToSaleBps` → `mvClean = { worst: P25, expected: P50, best: P75 }`.
4. Store comps (price, mileage, year, trim, distance, dealer/private, days on market, url) and `confidence` (number of comps, spread, provider).

```ts
MarketValuation = { provider, isDemo, confidence, compsCount, comps: Comp[],
  mvClean: { best, expected, worst }, medianDaysOnMarket: number | null, notes: string[] }
```

---

## 12. FEES, LOGISTICS, EXPORT

### 12.1 Fee schedules
`FeeTier = { min: number; max: number | null; amount?: number; bps?: number; minAmount?: number }`. `min` is inclusive and `max` exclusive. A tier gives either a flat `amount` or `max(minAmount, applyBps(bid, bps))`. `auctionFees(bid) = buyerFee(bid) + onlineBidFee(bid) + Σ fixedFees`. When an admin saves a schedule, check that fees never go down as the bid goes up over 0..50,000 in steps of 25, and reject it otherwise.

**Seed this PLACEHOLDER schedule** for Copart and IAAI (both buyer types; `PUBLIC_VIA_BROKER` uses the same tiers, and the broker fee comes from user settings). Every report that uses a placeholder schedule shows an INFO flag `FEE_TABLE_PLACEHOLDER`: "Fee table is approximate — verify on the auction's official fee page." Admins replace these with the official current charts before launch.

| Buyer fee: bid range | Fee |
|---|---|
| 0 – 499.99 | 175 |
| 500 – 999.99 | 275 |
| 1,000 – 1,999.99 | 400 |
| 2,000 – 2,999.99 | 500 |
| 3,000 – 3,999.99 | 560 |
| 4,000 – 5,999.99 | 650 |
| 6,000 – 7,999.99 | 750 |
| 8,000 – 9,999.99 | 825 |
| 10,000 – 14,999.99 | 900 |
| 15,000+ | 6% of bid (bps 600) |

| Online-bid fee: bid range | Fee |
|---|---|
| 0 – 999.99 | 59 |
| 1,000 – 2,999.99 | 79 |
| 3,000 – 4,999.99 | 89 |
| 5,000 – 7,999.99 | 109 |
| 8,000+ | 129 |

Fixed fees: Gate fee 95, Environmental fee 15.

A report flags `FEE_TABLE_STALE` (INFO) when `verifiedAt` is more than 90 days old.

### 12.2 Logistics
`transport = max(transportMin, Math.round(distanceMiles * transportCentsPerMile / 100))`.

### 12.3 Export mode (`exitStrategy = EXPORT`)
- Resale = the destination-market resale value. The user enters it in the destination currency, or the AI estimate provides it (flagged). It is converted to USD with FX. The rebuilt factor is **not** applied.
- Bid-dependent costs go into `acquisition(B)` (Section 13): marine insurance = `applyBps(B + fees(B), marineInsuranceBps)`; CIF = `B + fees(B) + brokerFee + inlandToPort + portAndLoading + oceanFreight + insurance`; duty = `applyBps(CIF, dutyBps)`; VAT = `vatRecoverable ? 0 : applyBps(CIF + duty, vatBps)`.
- `inlandToPort = max(transportMin, round(milesYardToDeparturePort * inlandToPortCentsPerMile / 100))`.
- Fixed logistics = inlandToPort + portAndLoading + oceanFreight + destinationPortFees + customsBrokerFee + registrationTax + complianceConversion + deliveryFromPort.
- Sales tax is normally 0 for exports, but the user setting is still respected.

---

## 13. FINANCIAL ENGINE (`lib/calc`). MOST IMPORTANT MODULE

### 13.1 Types
```ts
export type ScenarioKey = 'best' | 'expected' | 'worst';
export interface RepairInputs { partsCost: number; bodyHours: number; paintHours: number; mechHours: number;
  subletCost: number; contingencyBps: number; }
export interface ScenarioInput { mvClean: number; destinationResale?: number; repair: RepairInputs; holdingDays: number; }
export interface CalcSettings {
  laborRate: number; paintMaterialsPerHour: number; partsDiscountBps: number;
  rebuiltFactorBps: number; targetProfitBps: number; targetProfitMin: number;
  transportCentsPerMile: number; transportMin: number; titleRegInspection: number;
  storageDays: number; storagePerDay: number; holdingCostPerDay: number;
  sellingCostBps: number; sellingCostFixed: number; salesTaxBps: number; brokerFee: number;
  bidIncrement: number;                    // default 25
  exitStrategy: 'RETAIL_REBUILT' | 'EXPORT';
}
export interface ExportCostInputs { inlandToPort: number; portAndLoading: number; oceanFreight: number;
  marineInsuranceBps: number; destinationPortFees: number; customsBrokerFee: number; dutyBps: number;
  vatBps: number; vatRecoverable: boolean; registrationTax: number; complianceConversion: number;
  deliveryFromPort: number; }
export interface CalcInput {
  scenarios: Record<ScenarioKey, ScenarioInput>;
  distanceMiles: number;
  feeSchedule: FeeSchedule;
  exportCosts?: ExportCostInputs;          // required when exitStrategy = EXPORT
  extraFixedCosts: { label: string; amount: number }[];
  currentBid: number | null;
  signals: { severity: number; frameSuspected: boolean; floodSuspected: boolean; airbagsDeployed: boolean;
             overallConfidence: number; flags: RiskFlag[] };
}
export interface CalculationResult {
  targetProfit: number;
  scenarios: Record<ScenarioKey, {
    resale: number; repair: number; repairBreakdown: { parts: number; labor: number; paintMaterials: number;
      sublets: number; contingency: number };
    logistics: number; admin: number; holding: number; selling: number; extras: number;
    nonAcquisitionCosts: number;            // repair + logistics + admin + holding + selling + extras
    profitAtMaxBid: number | null; totalCostAtMaxBid: number | null; roiAtMaxBidBps: number | null;
    profitAtCurrentBid: number | null;
  }>;
  maxBid: number | null;       // null = no profitable bid exists
  comfortBid: number | null;
  breakEvenBid: number | null;
  feesAtMaxBid: { lines: { label: string; amount: number }[]; total: number } | null;
  headroomBps: number | null;  // (maxBid − currentBid) / maxBid
  verdict: 'GO' | 'BE_CAUTIOUS' | 'WALK_AWAY';
  verdictReasons: string[];
  dealScore: number;           // 0–100
  waterfall: { key: string; label: string; amount: number }[];  // expected scenario at max bid
}
```

### 13.2 Formulas (per scenario s)
```
resale_s     = RETAIL_REBUILT ? applyBps(mvClean_s, rebuiltFactorBps) : destinationResale_s
parts_s      = partsCost_s − applyBps(partsCost_s, partsDiscountBps)
labor_s      = Math.round((bodyHours_s + paintHours_s + mechHours_s) * laborRate)
paintMat_s   = Math.round(paintHours_s * paintMaterialsPerHour)
sub_s        = parts_s + labor_s + paintMat_s + subletCost_s
repair_s     = applyBps(sub_s, 10000 + contingencyBps_s)            // contingency = repair_s − sub_s
logistics    = RETAIL_REBUILT ? max(transportMin, round(distanceMiles * transportCentsPerMile / 100))
                              : fixed export logistics (12.3)
admin        = titleRegInspection + storageDays * storagePerDay
holding_s    = holdingDays_s * holdingCostPerDay
selling_s    = applyBps(resale_s, sellingCostBps) + sellingCostFixed
extras       = Σ extraFixedCosts
nonAcq_s     = repair_s + logistics + admin + holding_s + selling_s + extras
targetProfit = max(applyBps(resale_expected, targetProfitBps), targetProfitMin)

acquisition(B) = B + auctionFees(B) + brokerFee + applyBps(B, salesTaxBps)
                 [+ insurance(B) + duty(B) + vat(B) in EXPORT mode]
profit_s(B)    = resale_s − acquisition(B) − nonAcq_s
roi_s(B)       = profit_s(B) / (acquisition(B) + nonAcq_s)       → stored as bps, rounded
```
The scenario builder (not the calculator) sets holding days: best = `Math.round(holdingDaysExpected * 0.67)`, expected = `holdingDaysExpected`, worst = `Math.round(holdingDaysExpected * 1.5)`. With the default of 30, that gives 20 / 30 / 45.

### 13.3 Bid solver
The max bid is circular, because fees, tax and duty depend on the bid. Solve it by search:
```ts
// largest B (multiple of increment, 0 ≤ B ≤ ceiling) with acquisition(B) ≤ budget; null if acquisition(0) > budget
export function solveBid(budget: number, acquisition: (b: number) => number, increment: number, ceiling: number): number | null
// binary search over k = B / increment; acquisition is non-decreasing in B
```
- **maxBid** = `solveBid(resale_expected − nonAcq_expected − targetProfit, …)`
- **comfortBid** = `solveBid(resale_worst − nonAcq_worst, …)` (worst case breaks even)
- **breakEvenBid** = `solveBid(resale_expected − nonAcq_expected, …)`
- ceiling = `resale_best`.

### 13.4 Verdict (`verdict.ts`). Return the verdict and human-readable reasons
- **WALK_AWAY** if any flag has level `HARD_STOP`, or `maxBid === null`, or (`currentBid !== null && currentBid > maxBid`).
- **BE_CAUTIOUS** if any of these apply:
  - severity ≥ 8
  - frameSuspected
  - floodSuspected
  - overallConfidence < 0.5
  - (currentBid known and headroomBps < 1500)
  - profitAtMaxBid.worst < −10% × totalCostAtMaxBid.worst
  - ≥ 2 HIGH flags
- **GO** otherwise.

Hard stops are raised in `lib/flags`: title `NON_REPAIRABLE` or `PARTS_ONLY` (for road resale), and `maxBid === null`.

### 13.5 Deal score (`dealScore.ts`, weights in `lib/config/verdictWeights.ts`)
Start at 100, then:
- −3 × severity
- −20 if frameSuspected
- −25 if floodSuspected
- −8 if airbagsDeployed
- −10 if overallConfidence < 0.6
- −10 if headroomBps < 1500 (when current bid known)
- −15 if profitAtMaxBid.worst < 0
- −5 per HIGH flag whose code isn't already penalized above, −2 per MEDIUM flag
- +5 if roiAtMaxBidBps.expected ≥ 2500

Clamp to 0–100 and round. If `maxBid === null`, the score is 0.

### 13.6 REQUIRED unit test: "Audi A3 reference case" (`lib/calc/__tests__/reference.test.ts`)
Input:
```ts
settings = { laborRate: 70, paintMaterialsPerHour: 40, partsDiscountBps: 0, rebuiltFactorBps: 7000,
  targetProfitBps: 1500, targetProfitMin: 2500, transportCentsPerMile: 150, transportMin: 150,
  titleRegInspection: 300, storageDays: 0, storagePerDay: 0, holdingCostPerDay: 8,
  sellingCostBps: 200, sellingCostFixed: 0, salesTaxBps: 0, brokerFee: 0, bidIncrement: 25,
  exitStrategy: 'RETAIL_REBUILT' }
input = {
  distanceMiles: 240, currentBid: 2100, extraFixedCosts: [], feeSchedule: <placeholder schedule from 12.1>,
  scenarios: {
    best:     { mvClean: 18800, holdingDays: 20, repair: { partsCost: 1700, bodyHours: 14, paintHours: 6, mechHours: 0, subletCost: 150, contingencyBps: 1000 } },
    expected: { mvClean: 17700, holdingDays: 30, repair: { partsCost: 2070, bodyHours: 16, paintHours: 7, mechHours: 0, subletCost: 270, contingencyBps: 1500 } },
    worst:    { mvClean: 16600, holdingDays: 45, repair: { partsCost: 2900, bodyHours: 20, paintHours: 8, mechHours: 2, subletCost: 520, contingencyBps: 2500 } },
  },
  signals: { severity: 5, frameSuspected: false, floodSuspected: false, airbagsDeployed: false, overallConfidence: 0.72,
    flags: [ {code:'LOW_PHOTO_COVERAGE', level:'MEDIUM', …}, {code:'ADAS_CALIBRATION_LIKELY', level:'INFO', …},
             {code:'PREMIUM_PARTS_COST', level:'INFO', …} ] },
}
```
Expected output (exact):
```
resale            best 13160 | expected 12390 | worst 11620
repair            best  3839 | expected  4865 | worst  7300
logistics 360, admin 300 (all scenarios)
holding           best   160 | expected   240 | worst   360
selling           best   263 | expected   248 | worst   232
targetProfit 2500
maxBid 3100   feesAtMaxBid.total 759 (buyer 560, online 89, gate 95, environmental 15)
comfortBid 2375   breakEvenBid 5500
profitAtMaxBid    best  4379 | expected  2518 | worst  -791
totalCostAtMaxBid.expected 9872   roiAtMaxBidBps.expected 2551
profitAtCurrentBid.expected 3588
headroomBps 3226
verdict 'GO'   dealScore 73
```
Additional required tests:
- With `laborRate: 100` (everything else the same): `maxBid === 2375` and `verdict === 'BE_CAUTIOUS'` (headroom < 15%).
- A budget below `acquisition(0)` gives `maxBid === null`, verdict `WALK_AWAY`, dealScore 0.
- `currentBid` above maxBid gives `WALK_AWAY`.
- A `HARD_STOP` flag gives `WALK_AWAY` regardless of the numbers.
- Fee tier boundaries (2,999 vs 3,000, and 15,000 with 6%).
- `acquisition` never decreases over 0..50,000.
- `applyBps` rounding (e.g., `applyBps(4230, 11500) === 4865`).
- Export mode: duty and VAT are computed on CIF; `vatRecoverable` removes VAT.
- `aggregateRepair` produces best/expected/worst correctly from line items, honoring `included=false`, the probability thresholds and the source fallbacks.

### 13.7 Manual calculator page
`/app/calculator` exposes the engine directly. The user types market value, repair numbers, distance and current bid, and sees the full result with sliders. This works with zero AI and zero API keys.

---

## 14. ANALYSIS PIPELINE (Inngest function `analysis/run`)

Triggered by event `analysis/requested { analysisId }`. Concurrency: 3 per user, 20 global. Each step is `step.run(...)` with retries and updates `Analysis.currentStep` + `progress`:

| # | Step | Progress | Notes |
|---|---|---|---|
| 1 | `parse-input` | 5 | |
| 2 | `fetch-listing` | 15 | provider chain; may pause for NEEDS_INPUT |
| 3a | `store-photos` | 30 | in parallel with 3b |
| 3b | `decode-and-check` | 30 | NHTSA, recalls, complaints, history, vehicle class, cross-check |
| 4a | `vision-audit` | 55 | in parallel with 4b |
| 4b | `market-valuation` + `logistics` | 55 | |
| 5 | `repair-estimate` | 70 | |
| 6 | `risk-flags` | 80 | from listing + VIN + history + vision + market |
| 7 | `calculate` | 90 | build CalcInput from settings snapshot, run calculator, store calcInput + calc + summary columns |
| 8 | `narrate` | 97 | narrative + "before you bid" checklist |
| 9 | `finalize` | 100 | status COMPLETED, completedAt, aiCostUsd |

- **Degrade instead of failing.** Only fail if the vehicle can't be identified (no VIN and no year/make/model). Failed optional steps add a `SYSTEM` INFO/MEDIUM flag and record the fallback in `dataSources`.
- **Credits:** deduct 1 when the analysis is created (in a transaction with the CreditLedger) and refund on FAILED. Recalculating from sliders is free. Re-analyzing the same listing within 24 h reuses cached steps and costs no credit.
- **Narrative** (`narrative` prompt, cheap model): 5–8 plain-English bullets for a car flipper covering the verdict, max bid, biggest cost drivers, top risks, and what to inspect or ask the yard before bidding. Give the model the CalculationResult JSON and tell it to use only numbers from that JSON. **`narrativeGuard.ts`** extracts every `$` amount and `%` in the text and checks that each matches (±$1 / ±0.1%) a number in the result JSON. If any doesn't, regenerate once, then fall back to a deterministic template.
- **Checklist** (`lib/flags/checklist.ts`, deterministic): built from flags and missing photo angles, e.g. "Ask the yard for photos under the front (rails/subframe)", "Confirm keys", "Budget ADAS calibration", "Pick up within the free storage window", "Check open recalls at the dealer (free)".
- Record AI token usage in `AiUsage` and compute cost from a model price table in `lib/config` (env-overridable).

---

## 15. API & SERVER ACTIONS

| Route | Method | Purpose |
|---|---|---|
| `/api/analyses` | POST `{ input, inputType?, manual?, photos? }` | Validate, check credits/rate limits, create Listing/Analysis, send Inngest event → `{ id }` |
| `/api/analyses/[id]` | GET | Status, progress, currentStep, full result (owner only) |
| `/api/analyses/[id]` | PATCH `{ userOverrides }` | Save what-if overrides and edited line items (Zod-validated) |
| `/api/analyses/[id]/resume` | POST `{ pastedText?, photos? }` | Continue from NEEDS_INPUT |
| `/api/analyses/[id]/share` | POST/DELETE | Create or revoke `shareToken` |
| `/api/analyses/[id]/pdf` | GET | PDF report |
| `/api/batches` | POST `{ inputs: string[≤10] }` | Create batch + analyses |
| `/api/extension/ingest` | POST (Bearer token) | `{ url, pageText, jsonLd, imageUrls }` → analysis id |
| `/api/inngest` | — | Inngest handler |
| `/api/stripe/checkout`, `/portal`, `/webhook` | POST | Billing |

Server actions are used for settings, watchlist, journal and admin CRUD. Every mutation checks ownership. Rate limits: 30 analyses per hour per user, batches ≤ 10.

---

## 16. UI / UX SPEC

**Design system:** dark mode first, data-dense but calm. Use the shadcn defaults with a neutral zinc base and one accent color. Numbers use `tabular-nums`. Verdict colors: GO = emerald, BE CAUTIOUS = amber, WALK AWAY = rose. Always pair the color with an icon and text. Mobile first: test at 375 px. All money is formatted `$12,390`. Use skeleton loaders, not spinners, for content.

**AnalyzeBar** (dashboard hero): one large input that accepts a URL, VIN or pasted text and shows the detected type live ("Copart lot 12345678 detected"). It has a source selector (Auto, Copart, IAAI, Bid.cars, Other, Manual VIN), a "Paste listing text instead" toggle with a textarea, a photo dropzone, and an Analyze button. In demo mode it also shows "Try a demo lot" chips.

**AnalysisProgress:** vertical stepper with live step names, e.g. "Analyzing 24 photos…". Poll every 1.5 s. Show partial results as they arrive (vehicle header first). Handle the NEEDS_INPUT state with an inline paste/upload form.

**Report page layout:**
1. **Header:** vehicle title (year make model trim), source badge + lot # + link to the original, sale-date countdown, yard location, odometer, title chip, run/drive chip, keys chip, plus `DemoBadge` if any step used fixtures.
2. **DealCard** (top, full width):
   - VerdictBadge (large) and DealScoreGauge
   - the pill **"Do not bid above $3,100"**
   - **BidLadder:** a horizontal scale showing the comfort bid, max bid and break-even bid as labeled zones (green / amber / red) with a marker for the current bid
   - expected profit + ROI, the profit range (worst / expected / best), and the top 3 verdict reasons
3. **Tabs:**
   - **Overview:** narrative bullets, RiskFlagsList (grouped by level), BeforeYouBidChecklist (checkable)
   - **Damage:** DamageZoneMap (an SVG top-down car outline with 12 zones colored by severity; clicking a zone filters parts and photos); PhotoGallery (grid + lightbox, per-photo AI findings caption, photo numbers); photo coverage checklist; hidden-damage list with probabilities. **Do not draw bounding boxes.**
   - **Repair:** RepairLineItemsTable. Each row has an include toggle, part, zone/side, action, origin badge (Visible / Likely hidden / Rule), a source dropdown (OEM / Aftermarket / Used), editable price, editable body/paint/mech hours and confidence. Show totals per scenario and the contingency amount. Edits recalculate instantly.
   - **Market:** CompsTable + CompsScatter (price vs mileage with the subject's mileage as a vertical line and the P25/P50/P75 bands), P25/P50/P75, rebuilt factor, resale per scenario, median days on market, provider + confidence.
   - **Costs & Profit:** CostWaterfall (Recharts) for the expected scenario at the max bid, ScenarioTable with every cost line for best/expected/worst, and a fees breakdown at the max bid.
   - **Vehicle & History:** decoded specs, recalls (with an "open recall = free dealer repair" note), common problems from complaints, the history timeline (NMVTIS disclaimer), and the NICB VINCheck link.
   - **Logistics:** distance, transport cost, export costs when in export mode.
4. **WhatIfPanel:** sticky right column on desktop, a bottom-sheet drawer on mobile. Sliders and inputs:
   - labor rate ($40–150)
   - paint materials ($20–80/h)
   - parts discount (0–40%)
   - parts source (OEM / Aftermarket / Used)
   - contingency override (0–50%)
   - target profit % (0–40) and minimum ($0–10,000)
   - rebuilt factor (50–100%)
   - market value override
   - transport $/mile and minimum
   - holding days (0–120)
   - buyer type
   - sales tax %
   - broker fee
   - exit strategy (Retail rebuilt / Export + profile)

   Every change re-runs `aggregateRepair` + `calculate` in the browser in under 16 ms. Buttons: "Reset", "Save to this report", "Save as my defaults".
5. **Mobile sticky bottom bar:** verdict chip + "Max $3,100" + a What-if button.
6. **Actions:** Save to watchlist (with a reminder time, default sale − 2 h), Export PDF, Share link, Re-run analysis, "Log actual outcome" (creates a journal entry).
7. **Disclaimer footer:** "Estimates only — not an appraisal, insurance estimate or guarantee. Verify fees, title rules and vehicle condition before bidding."

**Compare page:** a sortable table with photo, vehicle, damage, title, sale date, current bid, max bid, headroom, expected profit, ROI, severity, verdict and deal score. The default sort is deal score. Rows link to their reports and can be shortlisted to the watchlist.

**Journal page:** entries table plus a P&L summary (total profit, average ROI, estimated vs actual repair error %), and a chart of estimated vs actual.

**Settings:** business profile (home ZIP, buyer type, currency), every default from `UserSettings` with explanations, export profile selection, extension API token (create/revoke; show it once).

**Landing page:**
- hero ("Know your max bid before you bid")
- a 3-step how-it-works
- an interactive sample report (Audi demo)
- feature grid, pricing, FAQ (data sources, accuracy, which auctions), and a footer with legal links

**PWA:** `manifest.webmanifest` with icons and `share_target` (`action: "/app/share"`, GET with `url`, `text` and `title` params). `/app/share` extracts the first URL and starts an analysis, so Android users can share a lot from the auction app or browser.

**Accessibility:** keyboard-reachable sliders with value labels, aria labels on charts with a table fallback, and contrast meeting WCAG AA.

---

## 17. AUTH, BILLING, LIMITS, ADMIN

- **Auth:** Supabase Auth with email magic link + Google. Middleware protects `/app/*` and `/admin/*`. Upsert `User` + default `UserSettings` on first login. When `DEMO_MODE=true`, also show "Continue as demo user" (used by e2e).
- **Plans** (`lib/billing/plans.ts`, editable): FREE 3 reports/month; PRO 60/month (compare, PDF, watchlist, journal); BUSINESS 300/month (+ export mode, extension, custom fee tables). One-off credit pack: 10 reports. Stripe Checkout for subscriptions and packs, Customer Portal, and a webhook that updates the plan, adds credits, and resets monthly credits on `invoice.paid`. Without Stripe keys, the billing page shows plans with disabled buttons and a "Billing not configured" note.
- **Admin** (`role=ADMIN`):
  - Fee schedules: a JSON/tier editor with Zod validation, the monotonic check, a preview table of fees at sample bids, and fields for `isPlaceholder`, `verifiedAt` and `sourceUrl`.
  - Parts price reference: table editing + CSV import.
  - Labor reference editor.
  - Export profiles.
  - Users (plan, credits adjust).
  - Usage: analyses per day, AI cost per day, and average cost per report.

---

## 18. DEMO MODE & FIXTURES

`DEMO_MODE=true` (the default in `.env.example`), or a missing provider key, makes that provider return fixtures. `lib/config/providers.ts` decides per provider and reports `isDemo` into `Analysis.dataSources`.

Create 5 fixture lots (`fixtures/listings/*.json`). Each comes with matching photo placeholders (generated SVGs: a car silhouette with the damaged zone shaded and the text "DEMO PHOTO"; **never use real auction photos**), a vision result (`fixtures/ai/*.json`), market comps (`fixtures/market/*.json`), and a distance:

| Demo id / URL | Vehicle | Scenario | Expected verdict |
|---|---|---|---|
| `https://www.copart.com/lot/90000001` | 2019 Audi A3 2.0T Premium quattro, front end, salvage, run & drive, keys, current bid $2,100, distance 240 mi | **Must reproduce the reference case in 13.6 exactly with default settings.** Line items: bumper cover 320 (2.0 body / 2.5 paint), reinforcement+absorber 190 (1.0), grille 210 (0.5), LH LED headlamp 480 (1.0; USED price only), hood 260 (1.5 / 2.5), LH fender repair 0 (3.0 / 2.0), radiator support 290 (5.0), condenser 150 (1.0), radiator 170 (1.0); sublets alignment 120 + A/C recharge 150 | GO, max bid $3,100 |
| `https://www.iaai.com/VehicleDetail/90000002~US` | 2021 Toyota Camry SE, water/flood | flood indicators, interior poor | BE CAUTIOUS or WALK AWAY |
| `https://bid.cars/en/lot/1-90000003` | 2020 Ford F-150 XLT, rear end | moderate, bed + bumper + tail lamps | GO |
| `https://www.copart.com/lot/90000004` | 2022 Tesla Model 3, LH side impact | possible HV battery damage (HIGH) | BE CAUTIOUS |
| `https://www.copart.com/lot/90000005` | 2017 Honda Civic, certificate of destruction | HARD STOP title | WALK AWAY |

For the Audi fixture, design the `RepairEstimate` line items (explicit low/mid/high prices and hours, origins and probabilities; e.g., alignment as HIDDEN_LIKELY p=0.6, ADAS calibration as HIDDEN_LIKELY p=0.3) so that `aggregateRepair` returns exactly: best = parts 1,700 / body 14 / paint 6 / mech 0 / sublets 150 / 1000 bps; expected = 2,070 / 16 / 7 / 0 / 270 / 1500 bps; worst = 2,900 / 20 / 8 / 2 / 520 / 2500 bps. Add a unit test asserting this. The demo market provider returns `mvClean` 18,800 / 17,700 / 16,600 (P75/P50/P25 after adjustments). Use synthetic VINs with valid check digits. In demo mode, unknown inputs return a friendly "Demo mode — try one of the sample lots" message.

---

## 19. SECURITY, PRIVACY, COMPLIANCE

- Validate every request body with Zod. Check ownership on every analysis/listing access. Admin routes require `role=ADMIN`.
- SSRF protection for every server-side fetch (Section 7.3). Server fetches of auction sites go only through the scraping provider, with caching and per-host rate limiting. Respect auction terms of service. The browser extension and paste paths are the primary ingestion paths.
- Photos are private (signed URLs, deleted after 90 days). Public shared reports **do not show auction photos**; they link to the original listing.
- Store only a hash of the extension tokens. Never log secrets or full LLM prompts containing user data in production.
- Security headers (CSP, HSTS, frame-ancestors none, referrer-policy).
- GDPR basics: privacy page, cookie notice (analytics only with consent), "Export my data" and "Delete my account" in settings.
- Disclaimers: report footer, the NMVTIS disclaimer when history is shown, terms of service with a liability limitation.

---

## 20. TESTING & QUALITY

- `pnpm typecheck`, `pnpm lint` (ESLint + Prettier), `pnpm test` (Vitest), `pnpm e2e` (Playwright, demo mode).
- Unit tests:
  - `lib/calc` (13.6 + full coverage)
  - `lib/input` (VIN check digit, URL parsing for every source)
  - title/run-condition normalizers
  - site parsers against `fixtures/html`
  - market stats (percentiles, mileage regression, slope clamp)
  - estimator rules + hour clamping + scenario aggregation
  - flags + checklist
  - narrativeGuard
- **E2E (demo mode):**
  - continue as demo user → paste the Audi URL → progress completes → verdict **GO** and **"Do not bid above $3,100"** visible
  - set the labor-rate slider to 100 → the max bid shows **$2,375** and the verdict becomes **BE CAUTIOUS**
  - save to watchlist → it appears on the watchlist page
  - paste the Civic URL → **WALK AWAY**
  - run a batch of 3 demo URLs → the compare table ranks them
- The CI workflow (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests and e2e on every push.

---

## 21. ENVIRONMENT VARIABLES (`.env.example`, all documented)

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEMO_MODE=true
DATABASE_URL=            # Supabase pooled
DIRECT_URL=              # Supabase direct (migrations)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_PROVIDER=anthropic    # anthropic | openai
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
AI_MODEL_VISION=claude-sonnet-5-5
AI_MODEL_TEXT=claude-haiku-4-5-20251001
AI_MAX_PHOTOS=24
SCRAPINGBEE_API_KEY=
APIFY_TOKEN=
VINAUDIT_API_KEY=
MARKETCHECK_API_KEY=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO=
STRIPE_PRICE_BUSINESS=
STRIPE_PRICE_CREDITS_10=
RESEND_API_KEY=
EMAIL_FROM=
```
`lib/config/env.ts` validates env with Zod at startup. Missing optional keys switch on the matching demo/fallback provider instead of crashing.

---

## 22. BUILD PHASES & ACCEPTANCE CRITERIA

**Phase 1 — Foundation**
- Next.js app, Tailwind, shadcn, theme, layout (desktop sidebar, mobile bottom nav), Supabase auth, Prisma schema + migration + seed, settings page, env validation, README, DECISIONS.md, CI workflow.
- **Done when:** I can sign in (or continue as the demo user), edit and save settings, and typecheck/lint/test pass.

**Phase 2 — Financial engine**
- `lib/calc` complete with every test in 13.6, plus the `/app/calculator` manual page with the WhatIfPanel.
- **Done when:** the reference test passes exactly and the manual calculator works at 375 px width.

**Phase 3 — Ingestion & enrichment**
- `parseInput`, the listing provider chain (demo, scraping API + parsers + LLM extraction, paste text, manual), photo storage, NHTSA decode/recalls/complaints, history provider, vehicle class, distance, FX.
- **Done when:** all 5 demo URLs produce normalized listings; a real VIN decodes via NHTSA; pasted listing text is extracted into a valid `NormalizedListing` when an AI key is set.

**Phase 4 — AI, estimator, market, pipeline**
- Vision audit, repair estimator (rules, clamping, pricing, scenarios), market providers, risk flags, checklist, narrative + guard, the Inngest workflow, progress, caching, credits, AI usage tracking.
- **Done when:** the Audi demo analysis stores calc results equal to the reference case; all 5 demo lots reach their expected verdicts; with real keys a real listing completes in < 120 s; turning off any optional provider degrades gracefully.

**Phase 5 — Report UI**
- The full report page (every section in 16), the WhatIfPanel wired to `userOverrides`, line-item editing, PDF, share link + public page, watchlist, history.
- **Done when:** the Phase-5 part of the e2e suite passes; Lighthouse mobile performance ≥ 85 and accessibility ≥ 95 on the report page.

**Phase 6 — Business**
- Stripe billing + credits, batch compare, deal journal + P&L, export mode end to end, admin pages, landing + pricing pages, legal pages.
- **Done when:** the full e2e suite passes; a Stripe test-mode purchase updates the plan and credits; an export-mode analysis shows duty/VAT lines.

**Phase 7 — Reach**
- Chrome MV3 extension in `/extension`:
  - content scripts for Copart, IAAI and Bid.cars lot pages
  - an "Analyze with AuctionPulse" button that sends page text, JSON-LD and image URLs to `/api/extension/ingest` using the user's token, then opens the report
  - its own README with build/load instructions
- PWA share target.
- Watchlist email reminders (Inngest cron every 15 min + Resend).
- **Done when:** the extension loads unpacked and creates an analysis from a lot page; a reminder email is sent in test mode.

---

## 23. DEFINITION OF DONE (whole app)

- `pnpm install && pnpm db:migrate && pnpm db:seed && pnpm dev` runs the full app **in demo mode with zero paid keys**, and every page works.
- Adding real keys to `.env` switches providers to live data with no code changes.
- No TypeScript errors, no lint errors, all unit and e2e tests green, and the CI workflow is included.
- `README.md` explains setup, every env var, how to get each API key, how to deploy (Vercel + Supabase + Inngest), and how to update the fee tables.
- `DECISIONS.md` lists every assumption you made.

Start with Phase 1 now.
