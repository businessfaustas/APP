# AuctionPulse AI — Product Summary & Specification

> Working name: **AuctionPulse AI** (alternative: **FlipVault AI**). Spec version 1.0, October 2026.
> The build prompt for an AI coding tool is in [`02-AI-MASTER-PROMPT.md`](./02-AI-MASTER-PROMPT.md). Step-by-step instructions for using it are in [`03-BUILD-PLAYBOOK.md`](./03-BUILD-PLAYBOOK.md).

---

## 1. Summary

AuctionPulse AI is a web and mobile-web app for people who buy damaged cars at salvage auctions (Copart, IAAI, Bid.cars and broker sites) to repair and resell.

The user pastes a listing link, a VIN, or the listing text. In about a minute the app:

1. pulls the listing data and every photo,
2. decodes the VIN and checks the title, history and open recalls,
3. has a vision AI inspect every photo for visible damage and for damage that is likely hidden,
4. builds an itemized repair estimate (parts, labor, paint, sublets, contingency),
5. pulls market comps to find what the car is worth once repaired, including the discount for a rebuilt title,
6. adds every cost a flipper actually pays: auction fees, broker fee, transport, title and inspection, storage, holding, selling costs, taxes, and for exporters freight, duty and VAT,
7. returns a clear answer: **GO / BE CAUTIOUS / WALK AWAY** and **"Do not bid above $X."**

Users can then drag sliders (labor rate, target profit, parts discount, rebuilt discount and others) and the max bid recalculates instantly without another AI run.

**The core principle:** the AI only looks at photos and reads text. All money math is deterministic code that the user can inspect, so the numbers are explainable and repeatable.

---

## 2. The problem

- **Doing it properly takes time.** Checking one lot takes 30–90 minutes: decode the VIN, guess repairs from 10–30 photos, find retail comps, work out tiered auction fees and transport, then work backwards to a bid. Serious buyers look at dozens of lots a week and should reject most of them quickly.
- **Most losses have the same few causes:**
  - Hidden damage was underestimated: frame rails, radiator support, suspension, airbags/SRS, cooling, A/C, ADAS sensors.
  - Costs were forgotten: buyer fee, internet-bid fee, gate fee, broker fee, storage, title and inspection, holding, selling.
  - The resale value of a *rebuilt-title* car was overestimated.
  - Emotional bidding with no hard limit.
- **The data exists but is scattered** across the auction site, the VIN decoder, history reports, marketplaces and fee charts.

---

## 3. Who it's for

| Persona | Volume | Main goal | What they need most |
|---|---|---|---|
| **Part-time flipper** | 1–5 cars/yr | Don't buy a money pit | Simple verdict, max bid, plain-English risks |
| **Full-time flipper / small dealer** | 20–200 cars/yr | Screen many lots fast | Batch compare, saved settings, accurate fee tables, history |
| **Body shop owner** | 5–50 cars/yr | Buy cars to fix with own labor | Own labor rate, parts sourcing choice, line-item estimates |
| **Exporter / importer** (e.g., US → EU via Bid.cars) | 10–500 cars/yr | Know the landed cost at the destination | Export mode: inland + ocean freight, duty, VAT, compliance conversion, currency |
| *(later)* **Parts recycler** | high | Part-out value | Part-out exit strategy |

---

## 4. Core user journey

```
 Paste link / VIN / listing text  (or "Analyze" button in the browser extension)
                │
                ▼
 ┌───────────────────────────────┐
 │ 1. Ingest listing             │  VIN, lot #, title, odometer, damage, run/drive,
 │                               │  keys, sale date, current bid, yard location, photos
 └───────────────────────────────┘
                │
                ▼
 ┌───────────────────────────────┐
 │ 2. Enrich                     │  NHTSA decode + recalls + complaints, title/NMVTIS
 │                               │  history, distance to user, currency
 └───────────────────────────────┘
                │
                ▼
 ┌───────────────────────────────┐
 │ 3. Vision AI damage audit     │  Damaged parts per photo, hidden-damage risks,
 │                               │  severity, airbags, frame, flood/fire, coverage gaps
 └───────────────────────────────┘
                │
                ▼
 ┌───────────────────────────────┐
 │ 4. Repair estimate            │  Parts (OEM/aftermarket/used), body/paint/mech hours,
 │                               │  sublets, contingency → best/expected/worst
 └───────────────────────────────┘
                │
                ▼
 ┌───────────────────────────────┐
 │ 5. Market valuation           │  Comps → P25/P50/P75 clean value → rebuilt value
 └───────────────────────────────┘
                │
                ▼
 ┌───────────────────────────────┐
 │ 6. Financial engine           │  Fees (tiered) + transport + title + holding + selling
 │                               │  + tax/duty → solve for MAX BID, profit, ROI
 └───────────────────────────────┘
                │
                ▼
 ┌───────────────────────────────┐
 │ 7. Investor report            │  Verdict, bid ladder, profit range, itemized costs,
 │                               │  damage map, risks, "before you bid" checklist
 └───────────────────────────────┘
```

Target time from paste to report: under 90 seconds (median).

---

## 5. What the user gets: the Investor Report

1. **Verdict badge:** GO (green), BE CAUTIOUS (amber), WALK AWAY (red), plus a **Deal Score from 0 to 100**.
2. **Bid ladder.** Three numbers, with the current bid marked against them:
   - **Comfort bid:** you break even even in the worst case.
   - **Max bid ("Do not bid above"):** you still hit your profit target in the expected case.
   - **Break-even bid:** above this you lose money in the expected case.
3. **Profit & ROI** at the max bid and at the current bid, shown for the **best, expected and worst** scenarios.
4. **Itemized repair estimate.** Each part shows replace/repair/refinish, the parts source, price, body/paint/mechanical hours, confidence, and whether it is visible or only suspected. Users can edit every line.
5. **Damage map.** A top-down car diagram with each damaged zone colored by severity, per-photo findings, a "likely hidden damage" list, and a **photo coverage checklist** (e.g., "no engine bay photo, no undercarriage photo").
6. **Market value.** Comps table, a price-vs-mileage chart, median clean value, rebuilt-title value, and typical days to sell.
7. **Cost waterfall** from resale value down to net profit, with every cost on its own line.
8. **Vehicle & history.** Decoded specs, title brands, odometer records, open recalls, and common problems from NHTSA complaints.
9. **Risk flags** sorted by severity, plus a generated **"Before you bid" checklist**, for example "Ask the yard for photos of the LH frame rail" or "Confirm keys present".
10. **What-if panel** with sliders that recalculate instantly.
11. **Actions:** save to watchlist, export a PDF, share a read-only link, re-run the analysis, log the actual outcome.

---

## 6. Features by release

| Area | MVP (v1) | v1.5 | v2 |
|---|---|---|---|
| Input | URL, VIN, pasted listing text, photo upload, manual form | Chrome extension "Analyze" button; PWA share-target on Android | Bulk import from watchlist/CSV |
| Sources | Copart, IAAI, Bid.cars, generic | AutoBidMaster, A Better Bid, SalvageBid, others | Dealer auctions (Manheim/ACV) for licensed users |
| Vehicle data | NHTSA decode, recalls, complaints | NMVTIS title history | Full history via partnership (Carfax/AutoCheck) |
| Damage AI | Photo audit, hidden-damage risks, severity, flags | Manual damage editor (click zones/parts) | Model-specific damage patterns learned from user outcomes |
| Repair estimate | Reference price table + AI estimate, 3 scenarios | Editable line items, parts-source mix | Live parts pricing integrations |
| Market value | One comps provider + fallbacks | Rebuilt-title comps, days-to-sell | Final-hammer-price prediction from historical lots |
| Financial engine | Fees, transport, title, holding, selling, tax, solver, scenarios | Export mode (freight, duty, VAT, FX), broker fees | Part-out and as-is-resale exit strategies compared |
| Workflow | History, settings, watchlist | Batch compare (up to 10 lots), PDF, share link, sale-date reminders | Team seats, API, CRM-style pipeline |
| Learning loop | — | **Deal journal**: log actual buy, repair and sale numbers; P&L dashboard | Calibrate estimates from users' actual results |
| Business | Auth, free tier, Stripe subscriptions, credits | Admin: fee tables, price tables, usage/cost | Multilingual (EN + LT/PL/UA/RU…), multi-currency |

---

## 7. How it works: pipeline stages

| # | Stage | What happens | If it fails |
|---|---|---|---|
| 1 | **Parse input** | Detect the source from the URL, or a VIN (17 characters, check digit verified for North-American VINs), or free text | Ask the user to choose the input type |
| 2 | **Fetch listing** | Provider chain: cache → extension data → scraping API + site parser → LLM extraction from HTML/text | Ask the user to paste the listing text and upload photos |
| 3 | **Store photos** | Download, resize to ≤1568 px long edge, hash, store privately | Continue with whatever photos loaded and flag low coverage |
| 4 | **Decode & check** | NHTSA vPIC decode, recalls, complaints; NMVTIS history (if enabled); cross-check year/make/model against the listing | Continue; flag "history unavailable" |
| 5 | **Vision audit** | LLM inspects all photos and returns strict JSON (parts, zones, hidden risks, severity, flags) | Manual damage editor |
| 6 | **Repair estimate** | Rules engine expands damage (e.g., airbags → SRS module + pretensioners), prices parts, clamps labor to reference ranges, builds 3 scenarios | Use AI-only price estimates with low confidence |
| 7 | **Market valuation** | Comps → mileage adjustment → P25/P50/P75 → list-to-sale ratio → rebuilt factor | Fall back to another provider, then the listing's ACV, then an AI estimate (each labeled) |
| 8 | **Logistics** | Distance from yard to the user's ZIP, transport cost; export costs if export mode is on | Use the default distance and flag it |
| 9 | **Calculate** | Pure TypeScript engine: scenarios, bid solver, verdict, deal score | — (deterministic) |
| 10 | **Narrate** | LLM writes a short summary using only numbers from the computed JSON; a guard rejects any number it invented | Template summary |

Stages 3–4 and 7–8 run in parallel. Results are cached: a VIN decode forever, history for 30 days, vision results per photo set for 30 days, comps for 24 hours.

---

## 8. Data sources: what is realistic

| Need | Recommended source | Access | Notes |
|---|---|---|---|
| VIN decode | **NHTSA vPIC API** | Free, no key | Trim and options are sometimes incomplete; cross-check with the listing |
| Recalls, complaints | **NHTSA Recalls & Complaints APIs** | Free | Open recalls are repaired free by dealers. Complaints feed the "common problems" section |
| Theft / insurance total-loss check | **NICB VINCheck** | Free website, no API | Link out from the report |
| Title brands, junk/salvage records, odometer (NMVTIS) | **VinAudit API** or another NMVTIS-approved provider | Paid per report or plan | The NMVTIS consumer disclaimer must be shown |
| Full accident/service history | Carfax / AutoCheck | **No self-serve API**; dealer or partner agreement needed | v2 partnership. Until then, deep-link for the user to buy a report |
| Market comps / price prediction | **Marketcheck API**, **VinAudit Market Value API** | Paid | Filter by year ±1, trim, mileage, radius |
| KBB / Edmunds / J.D. Power / Black Book | Enterprise licensing | Not self-serve | Not required for MVP |
| Auction listing + photos | **Browser extension** (reads the page the user already has open), **pasted listing text**, **scraping API** (ScrapingBee / Bright Data / Apify) as fallback, licensed auction-data vendors | Mixed | Copart and IAAI have no public buyer API, their terms restrict automated scraping, and they use bot protection. Plan for several input paths from day one |
| Final prices of past similar lots | Auction-history data vendors / partnerships | Licensing | v2: predict the final hammer price |
| Auction fees | Official Copart/IAAI fee charts → admin-editable tables in the database | Free, manual upkeep | Fees change periodically and differ by buyer type, payment method and vehicle/title type |
| Distance | US ZIP centroid data (Census Gazetteer) + haversine × road factor; optionally Google/Mapbox routing | Free / paid | |
| Parts prices | Starter reference table + AI estimate; later parts-network integrations (e.g., PartsTech, used-parts networks) | Mixed | After photo quality, this has the biggest effect on accuracy |
| Exchange rates | ECB reference rates (e.g., Frankfurter API) | Free | For export mode |
| Vision / text AI | Anthropic Claude or OpenAI behind one interface | Pay per token | About 1.5–2.5k input tokens per resized photo |

---

## 9. Financial engine

### 9.1 Formulas (per scenario: best / expected / worst)

```
Resale            = MV_clean × RebuiltFactor              (default 0.70)
                    — or, in export mode, destination resale value
Repair            = (Parts × (1 − PartsDiscount)
                     + (BodyH + PaintH + MechH) × LaborRate
                     + PaintH × PaintMaterialsRate
                     + Sublets) × (1 + Contingency)
Logistics         = max(TransportMin, Miles × $/mile)        [+ export costs]
Admin             = Title/Registration/Inspection + StorageDays × Storage/day
Holding           = HoldingDays × HoldingCost/day
Selling           = Resale × SellingCost% + SellingFixed
TargetProfit      = max(Resale_expected × TargetProfit%, TargetProfitMin)

AcquisitionCost(B) = B + AuctionFees(B) + BrokerFee + SalesTax(B) [+ Duty(B) + VAT(B)]

Profit(B)         = Resale − AcquisitionCost(B) − Repair − Logistics − Admin − Holding − Selling
```

### 9.2 Why the max bid needs a solver

The original formula `MaxBid = MV − (Repair + Shipping + Fees + Profit)` is **circular**: auction fees (and tax and duty) depend on the bid itself, and fees come in steps (tiers). The engine therefore searches for the **largest bid B, in $25 steps, where AcquisitionCost(B) ≤ Budget**. AcquisitionCost always rises with B, so a binary search gives an exact answer.

### 9.3 Three bid numbers instead of one

| Number | Definition |
|---|---|
| **Comfort bid** | Largest B where profit ≥ 0 in the **worst** scenario |
| **Max bid** | Largest B where profit ≥ TargetProfit in the **expected** scenario |
| **Break-even bid** | Largest B where profit ≥ 0 in the **expected** scenario |

### 9.4 Three scenarios

| Scenario | Market value | Parts | Labor | Hidden damage | Contingency | Holding days |
|---|---|---|---|---|---|---|
| Best | P75 of comps | lowest source price | low end | excluded | base − 5 pts (min 5%) | expected × 0.67 |
| Expected | Median (P50) | preferred source, mid price | mid | included if probability ≥ 50% | base (by severity) | expected |
| Worst | P25 of comps | OEM, high price | high end | included if probability ≥ 20% | base + 10 pts | expected × 1.5 |

Base contingency by severity: 1–3 → 10%, 4–6 → 15%, 7–8 → 25%, 9–10 → 35%.

### 9.5 Default settings (all editable per user)

| Setting | Default |
|---|---|
| Labor rate | $70/h |
| Paint materials | $40 per paint hour |
| Rebuilt factor (rebuilt value ÷ clean value) | 0.70 (rebuilt-title cars typically sell for 25–35% less) |
| List-to-sale ratio (comps are asking prices) | 0.96 |
| Target profit | max(15% of resale, $2,500) |
| Transport | $1.50/mile, minimum $150 |
| Title / registration / rebuilt inspection | $300 |
| Holding cost | $8/day × 30 days |
| Selling cost | 2% of resale |
| Sales tax on purchase | 0% (licensed dealer with resale certificate). Public buyers set their state rate |
| Broker fee | $0 for licensed buyers. Public buyers set their broker's fee |
| Bid increment | $25 |

### 9.6 Export mode (v1.5)

For international buyers, transport is replaced by: inland transport to the port + port/loading + ocean freight + marine insurance + destination port and customs-broker fees + **customs duty on the CIF value** + **VAT on (CIF + duty)** (can be marked recoverable for VAT-registered businesses) + registration/excise tax + compliance conversion (e.g., lighting changes for EU homologation) + delivery from the port. Resale is the destination-market value, converted with the current FX rate. Countries are set up as editable "export profiles". For example, the EU duty on passenger cars is typically 10% and VAT depends on the country.

---

## 10. Damage & repair estimation

- **The AI perceives and does no math.** The vision model returns, for each part: name, zone, side, action (replace/repair/refinish/inspect), the photo numbers where the damage is visible, confidence, and labor/paint hours. Anything inferred but not visible goes into `likely_hidden_damage` with a probability.
- **A rules engine adds the predictable extras**:
  - Deployed airbags → SRS module (or crash-data reset), seat-belt pretensioners, possibly dash panel and clock spring.
  - Front hit beyond the bumper → condenser, radiator, fans, and intercooler if turbo.
  - Wheel pushed back or wrong camber → control arm, knuckle, tie rod, alignment.
  - Front radar/camera area damaged → ADAS calibration sublet.
  - Keys missing → key programming.
  - Coolant or refrigerant opened → fluids and A/C recharge.
- **Pricing**: a reference price table (part × vehicle class × source: OEM-new / aftermarket / used) is used first, and the AI estimates prices only for parts not in the table. Every line shows where its price came from.
- **Labor hours** from the AI are kept within reference ranges per part, so a hallucinated "40 hours for a bumper" cannot reach the totals.
- **Confidence is always shown.** Low photo coverage, poor image quality or contradictions with the listing lower it and widen the worst-case scenario.
- **No bounding boxes.** LLM bounding boxes are unreliable, so the report shows a **zone map** with per-photo captions instead of pixel overlays.

---

## 11. Risk flags

| Level | Examples |
|---|---|
| **HARD STOP** (forces WALK AWAY) | Title is non-repairable / certificate of destruction / parts-only (for road resale); max bid ≤ $0; current bid already above max bid |
| **HIGH** | Flood/water damage; fire/burn; frame or structural damage suspected; engine bay damaged; odometer "not actual"/"exceeds mechanical limits"; EV/hybrid high-voltage battery or cable damage; VIN decode doesn't match the listing; previous salvage/total-loss events; rollover/roof damage |
| **MEDIUM** | Airbags deployed; doesn't run/drive or won't start; keys missing; poor photo coverage (no engine bay, interior or undercarriage); suspension damage; listing contradicts the photos; sale "on approval" (seller can reject); open recalls |
| **INFO** | ADAS calibration likely; premium brand with expensive lighting/sensors; hail damage (PDR-heavy); low comp count; fee table is a placeholder or out of date |

---

## 12. Verdict & deal score

**Verdict:**
- **WALK AWAY** if there is any hard stop, the max bid is ≤ 0, or the current bid is above the max bid.
- **BE CAUTIOUS** if any of these apply:
  - severity ≥ 8
  - frame damage suspected
  - flood suspected
  - AI confidence < 0.5
  - headroom (max bid − current bid) < 15% of the max bid
  - worst-case loss at the max bid > 10% of the worst-case total cost
  - two or more HIGH flags
- **GO** otherwise.

**Deal score (0–100):** start at 100, then:
- −3 × severity
- −20 frame suspected
- −25 flood
- −8 airbags deployed
- −10 confidence < 0.6
- −10 headroom < 15%
- −15 worst-case profit < 0 at max bid
- −5 per other HIGH flag, −2 per MEDIUM flag
- +5 if expected ROI ≥ 25%

The result is clamped to 0–100. All weights live in one config file so they can be tuned from real outcomes.

---

## 13. Worked example: 2019 Audi A3 (illustrative numbers)

> These numbers show how the engine works. They are not real market data. The same case is the required unit test for the calculator in the master prompt.

**Listing:** Copart Dallas, TX. 2019 Audi A3 2.0T Premium quattro, 61,200 mi (actual), salvage title. Primary damage: front end. Run & Drive, keys present, airbags not deployed. Current bid $2,100. Buyer is a licensed dealer in Houston (240 mi away).

**AI findings (severity 5/10, confidence 0.72):**

| Part | Action | Source | Parts $ | Body h | Paint h |
|---|---|---|---|---|---|
| Front bumper cover | Replace | Aftermarket | 320 | 2.0 | 2.5 |
| Bumper reinforcement + absorber | Replace | Aftermarket | 190 | 1.0 | – |
| Grille | Replace | Aftermarket | 210 | 0.5 | – |
| Headlamp assembly LH (LED) | Replace | Used OEM | 480 | 1.0 | – |
| Hood panel | Replace | Aftermarket | 260 | 1.5 | 2.5 |
| Fender LH | Repair | – | 0 | 3.0 | 2.0 |
| Radiator support | Replace | Aftermarket | 290 | 5.0 | – |
| A/C condenser | Replace | Aftermarket | 150 | 1.0 | – |
| Radiator | Replace | Aftermarket | 170 | 1.0 | – |
| **Totals** | | | **2,070** | **16.0** | **7.0** |

Sublets: four-wheel alignment $120 and A/C evacuate & recharge $150, so $270. Flags: MEDIUM "no undercarriage photos: rail damage can't be ruled out". INFO "ADAS calibration may be needed". INFO "premium-brand lighting costs".

**Expected-case repair:** (2,070 + 23 h × $70 + 7 h × $40 + 270) × 1.15 = 4,230 × 1.15 = **$4,865**.

| | Best | Expected | Worst |
|---|---|---|---|
| Clean market value (after mileage adj. & list-to-sale) | 18,800 | 17,700 | 16,600 |
| Rebuilt resale (× 0.70) | 13,160 | 12,390 | 11,620 |
| Repair (incl. contingency 10/15/25%) | 3,839 | 4,865 | 7,300 |
| Transport (240 mi × $1.50) | 360 | 360 | 360 |
| Title / inspection | 300 | 300 | 300 |
| Holding (20/30/45 days × $8) | 160 | 240 | 360 |
| Selling (2%) | 263 | 248 | 232 |

**Solving the bid** (target profit = max(15% × 12,390, 2,500) = $2,500):
- Budget for bid + fees = 12,390 − 4,865 − 360 − 300 − 240 − 248 − 2,500 = **$3,877**.
- At B = $3,100 the fees are $759 (buyer $560 + online-bid $89 + gate $95 + environmental $15), so the total is $3,859 ≤ $3,877 ✓. At $3,125 the total is $3,884 ✗.

| Output | Value |
|---|---|
| **Max bid ("Do not bid above")** | **$3,100** |
| Comfort bid (worst case breaks even) | $2,375 |
| Break-even bid (expected case) | $5,500 |
| Expected profit at max bid | $2,518 (ROI 25.5% on $9,872 all-in) |
| Profit range at max bid | worst −$791 · expected $2,518 · best $4,379 |
| Expected profit if won at current bid ($2,100) | $3,588 |
| Headroom vs current bid | 32% |
| **Verdict** | **GO**, Deal Score 73/100 |

Generated "Before you bid" checklist: ask for or look for photos under the front of the car (rails, subframe); check whether the A/C compressor and cooling fans are intact; budget for ADAS front-radar calibration; confirm the pickup deadline to avoid storage fees.

---

## 14. Screens

| Screen | Purpose |
|---|---|
| **Landing page** | Value proposition, how it works, sample report, pricing, FAQ |
| **Dashboard** | Big input bar (URL / VIN / paste text / upload photos), recent analyses, watchlist with sale-date countdowns, credits |
| **Analysis in progress** | Live stepper: fetching listing → decoding VIN → checking history → analyzing N photos → estimating repairs → pulling comps → calculating |
| **Report** | Deal card + bid ladder → tabs: Overview, Damage, Repair, Market, Costs & Profit, Vehicle & History, Logistics; sticky what-if panel (a bottom sheet on mobile) |
| **Compare** | Paste up to 10 links → ranked table (verdict, max bid, headroom, profit, ROI, severity, sale date) |
| **Watchlist / History / Deal journal** | Saved lots, past reports, actual-vs-estimated P&L |
| **Settings** | Business profile (ZIP, buyer type, rates, defaults), export profile, API token for the extension |
| **Billing** | Plan, credits, Stripe portal |
| **Admin** | Fee tables, parts price reference, export profiles, users, AI cost tracking |
| **Shared report** | Read-only public link |

Design: dark mode first, data-dense but calm, numbers in tabular figures. Verdicts always use color + icon + text so color-blind users can read them. Built mobile-first, because buyers often check lots on their phones.

---

## 15. Tech architecture

```
Browser (Next.js App Router, PWA)  ◄── Chrome extension (v1.5)
        │ server actions / REST
        ▼
Next.js API on Vercel ── Supabase Auth
        │ enqueue "analysis/requested"
        ▼
Inngest durable workflow (retries, parallel steps, progress updates)
  ├─ Listing providers ── extension data / ScrapingBee or Apify / paste / manual
  ├─ Photo store ──────── Supabase Storage (private bucket, signed URLs)
  ├─ NHTSA vPIC, Recalls, Complaints
  ├─ History provider ─── VinAudit (NMVTIS)
  ├─ Vision AI ────────── Claude or OpenAI via Vercel AI SDK (structured output + Zod)
  ├─ Repair estimator ─── rules + reference prices + AI fallback
  ├─ Market provider ──── Marketcheck / VinAudit market value
  └─ Calculator ───────── pure TypeScript, shared with the browser for live sliders
        ▼
PostgreSQL (Supabase) via Prisma
```

Stack: Next.js + TypeScript (strict) + Tailwind + shadcn/ui + lucide + Recharts + TanStack Query + React Hook Form/Zod; Prisma + Supabase (Postgres, Auth, Storage); Inngest; Vercel AI SDK; Stripe; Resend (email); `@react-pdf/renderer` (PDF); Vitest + Playwright.

**Demo mode:** with no API keys, every provider returns realistic fixture data, so the whole app runs end to end on day one. A "Demo data" badge shows wherever fixtures are used.

---

## 16. Business model (to validate)

| Plan | Price (suggested) | Includes |
|---|---|---|
| Free | $0 | 3 reports / month, basic report |
| Pro | ~$39 / month | ~60 reports, compare, PDF, watchlist, deal journal |
| Business | ~$129 / month | ~300 reports, 3 seats, extension, export mode, custom fee tables |
| Credits | ~$9 / 10 reports | Pay as you go |
| Add-on | per report | Paid NMVTIS history report (passed through at cost + margin) |

**Unit economics to track:** AI cost per report (about 20 photos at roughly 1.5–2.5k tokens each, usually well under $1 with a mid-tier vision model; check current pricing), scraping cost, market-data API cost and history-report cost. Caching per listing and VIN cuts repeat costs. Moving sliders is free because no AI runs.

---

## 17. Legal, compliance & trust

- **Auction terms.** Copart and IAAI restrict automated scraping. Prefer the browser extension (the user's own page view), pasted text and licensed data. Rate-limit and cache any server fetches. Keep photos private and delete them automatically after 90 days. Public shared reports link to the original listing instead of re-hosting its photos.
- **Disclaimers.** Every report says the figures are estimates, not an appraisal, insurance estimate or guarantee, and that the user is responsible for their bids. Show the NMVTIS disclaimer wherever NMVTIS data is shown.
- **Privacy.** GDPR-ready (EU users are likely): consent, data export and delete, no selling of data. Payments only through Stripe.
- **AI honesty.** Show confidence, list what the AI could not see, and never present a suspected issue as confirmed.

---

## 18. Key risks & mitigations

| Risk | Mitigation |
|---|---|
| Losing access to auction data (blocks, ToS) | Several input paths (extension, paste, scraping API, licensed vendors); parsers tested against saved fixtures |
| Inaccurate repair estimates | Rules engine + reference ranges + 3 scenarios + editable lines + deal journal to calibrate against real outcomes |
| Overvalued resale | Comps P25/P50/P75, rebuilt factor, list-to-sale ratio, worst-case scenario drives the comfort bid |
| Out-of-date fee tables | Admin editor with "last verified" date; report warns if a table is older than 90 days |
| LLM cost spikes | Cache per photo set, resize images, cap photos per run, credits per report |
| Liability for bad deals | Clear disclaimers, confidence display, "before you bid" checklist |

---

## 19. Success metrics

- Activation: first report completed in the first session (target ≥ 60%).
- Time to report: p50 < 90 s, p95 < 180 s.
- Report success rate (no fallback to manual): ≥ 85%.
- Estimate accuracy from the deal journal: median absolute error of the repair estimate ≤ 20%.
- Free → paid conversion ≥ 5%. Weekly reports per active paid user ≥ 8.

---

## 20. Roadmap

| Phase | Weeks | Outcome |
|---|---|---|
| 0. Validate | 0–1 | Interview 10 flippers/shops; landing page with waitlist; collect 20 past deals with real numbers |
| 1. Foundation | 1 | App shell, auth, database, settings, demo mode |
| 2. Financial engine | 1–2 | Calculator with tests plus a manual calculator page, useful on its own |
| 3. Ingestion & enrichment | 2–3 | URL/VIN/paste input, photos, NHTSA, history, distance |
| 4. AI + pipeline | 3–5 | Vision audit, repair estimator, market valuation, background workflow |
| 5. Report UI | 4–6 | Full report, what-if panel, PDF, share, watchlist, history |
| 6. Business | 6–8 | Stripe, credits, compare, deal journal, export mode, admin, landing page |
| 7. Reach | 8–12 | Chrome extension, PWA share target, sale-date reminders, multilingual |

---

## 21. What changed from the original draft, and why

1. **The max-bid formula was fixed.** Fees depend on the bid, so the engine solves for the bid with a search instead of subtracting fees as a constant.
2. **Missing costs were added:** broker fee, sales tax, storage, title/inspection, holding, selling, paint materials, sublets (alignment, A/C, ADAS), contingency, key programming.
3. **Three scenarios and three bid numbers** (comfort / max / break-even) replace one fragile number.
4. **Data sources were checked against reality.** Carfax, AutoCheck, KBB and Edmunds have no self-serve APIs, and Copart and IAAI restrict scraping. The spec uses available sources and several input paths.
5. **The AI looks, the code calculates.** The LLM returns structured observations with confidence. Prices and hours are kept within reference ranges, and the narrative cannot introduce numbers that the engine did not produce.
6. **Damage overlays became a zone map**, because LLM bounding boxes are unreliable.
7. **The model choice is provider-agnostic.** GPT-4o and Claude 3.5 Sonnet are outdated, so the model is set by environment variables.
8. **Batch compare was added**, because buyers usually weigh several lots of the same model.
9. **Export mode was added** for international buyers.
10. **Hard-stop title types were added**, because non-repairable titles can't be returned to the road.
11. **Demo mode** lets the app run end to end before any paid API keys exist.
12. **Deal journal:** users log actual outcomes. This is a retention feature and the data that makes estimates better over time.
