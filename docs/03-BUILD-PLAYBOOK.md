# Build Playbook: turning the prompt into a working app

This guide explains how to use [`02-AI-MASTER-PROMPT.md`](./02-AI-MASTER-PROMPT.md) to get a working AuctionPulse AI app from an AI coding tool, one phase at a time, checking each phase before moving on.

---

## 1. Pick your AI builder

| Tool | Fit for this app | How to use it |
|---|---|---|
| **Claude Code** (CLI, desktop, or claude.ai/code on this repo) | ✅ Best. It handles many files, runs tests, and commits | Open this repo and use the phase prompts below |
| **Cursor / Windsurf** (agent mode) | ✅ Very good | Open the repo, put the prompt file in context, use the phase prompts |
| **Lovable / Bolt / v0** | ⚠️ Good for UI prototypes, weak on background jobs, tests and a complex backend | Paste the master prompt and ask for **Phases 1–2 only**. Then export to GitHub and finish in Claude Code or Cursor |

Don't ask for "the whole app" in one message. Large apps come out much better when they are built **one phase at a time**, with tests passing at each step. The master prompt is written for that.

---

## 2. Accounts & API keys

You can **start with no keys at all.** Demo mode runs the whole app on fixture data. Add keys when you reach the phase that needs them.

| Service | Used for | Needed from | Cost to start |
|---|---|---|---|
| Node.js 20+ and pnpm | Running the app locally | Phase 1 | Free |
| **Supabase** | Database, login, photo storage | Phase 1 | Free tier |
| **Anthropic** (or OpenAI) API key | Vision damage audit, text extraction, narrative | Phase 3–4 | Pay per use |
| **Inngest** | Background analysis workflow | Phase 4 (works locally with the Inngest dev server without a key) | Free tier |
| **ScrapingBee** or **Apify** | Fetching listing pages | Phase 3 (optional; paste-text works without it) | Free trial |
| **Marketcheck** and/or **VinAudit** | Market comps, title history (NMVTIS) | Phase 4 (optional; fallbacks exist) | Paid, ask about trials |
| **Stripe** | Subscriptions and credits | Phase 6 | Free in test mode |
| **Resend** | Watchlist reminder emails | Phase 7 | Free tier |
| **Vercel** | Hosting | When you deploy | Free hobby tier |

NHTSA (VIN decode, recalls, complaints) is free and needs no key.

---

## 3. Phase prompts (copy and paste one at a time)

Before Phase 1, make sure `docs/02-AI-MASTER-PROMPT.md` is in the repo (it already is). If your tool can't read repo files, paste the whole master prompt as your first message, then send these prompts one by one. The prompt is about 70k characters. If a tool rejects that length, paste Sections 0–13 in one message and Sections 14–23 in a second one, saying "part 2 of the spec, don't start yet" until both are in.

### Phase 1: Foundation
```
Read docs/02-AI-MASTER-PROMPT.md completely before writing any code. It is the single source of truth.
Execute ONLY Phase 1 (Foundation) from Section 22. Do not start Phase 2.
When finished: run typecheck, lint and tests; list the files you created; give me the exact commands to run
the app locally; and give me a short click-through checklist to verify Phase 1.
```
**Check yourself:** the app starts → you can sign in or "continue as demo user" → change the labor rate in Settings, reload, and it's saved → it works on a phone-sized window.

### Phase 2: Financial engine
```
Continue with Phase 2 (Financial engine) from docs/02-AI-MASTER-PROMPT.md.
The "Audi A3 reference case" test in Section 13.6 must pass with EXACTLY the listed numbers.
If it fails, fix the code — never change the expected numbers. Implement every additional test in 13.6.
Then build the /app/calculator page with the What-if panel. Stop when Phase 2 acceptance criteria are met.
```
**Check yourself:** in `/app/calculator`, enter the Audi numbers. The max bid shows **$3,100**, comfort **$2,375**, break-even **$5,500**, and the verdict is **GO**. Move labor to $100 and the max bid becomes **$2,375** with the verdict **BE CAUTIOUS**.

### Phase 3: Ingestion & enrichment
```
Continue with Phase 3 (Ingestion & enrichment) from docs/02-AI-MASTER-PROMPT.md.
Use demo providers wherever a key is missing. Add saved HTML fixtures and parser tests for Copart, IAAI and Bid.cars.
NHTSA decode must work live (no key needed). Stop when Phase 3 acceptance criteria are met.
```
**Check yourself:** each of the 5 demo URLs shows a vehicle header. A real VIN (for example, from your own car) decodes. Paste listing text with an AI key set and the fields fill in.

### Phase 4: AI, estimator, market, pipeline
```
Continue with Phase 4 (AI, estimator, market, pipeline) from docs/02-AI-MASTER-PROMPT.md.
The Audi demo analysis must store results identical to the Section 13.6 reference case, and all 5 demo lots
must reach their expected verdicts. Every optional provider must degrade gracefully when its key is missing.
Stop when Phase 4 acceptance criteria are met.
```
**Check yourself:** analyze the Audi demo URL and watch the progress steps finish. Analyze the Civic demo and it says WALK AWAY with a title hard stop. With a real AI key, try one real listing (paste its text if fetching fails).

### Phase 5: Report UI
```
Continue with Phase 5 (Report UI) from docs/02-AI-MASTER-PROMPT.md. Follow Section 16 closely,
mobile-first at 375px wide. Wire the What-if panel and line-item editing to userOverrides.
Make the Phase 5 e2e tests pass. Stop when Phase 5 acceptance criteria are met.
```
**Check yourself:** the report looks right on your phone. The sliders update numbers instantly. Editing a repair line changes the totals. PDF export works. A share link opens in a private window without logging in.

### Phase 6: Business
```
Continue with Phase 6 (Business) from docs/02-AI-MASTER-PROMPT.md: Stripe billing + credits (test mode),
batch compare, deal journal, export mode end-to-end, admin pages, landing + pricing + legal pages.
Make the full e2e suite pass. Stop when Phase 6 acceptance criteria are met.
```
**Check yourself:** buy a plan with Stripe test card `4242 4242 4242 4242` and the credits update. Compare 3 demo lots. Switch to export mode and duty and VAT lines appear.

### Phase 7: Reach
```
Continue with Phase 7 (Reach) from docs/02-AI-MASTER-PROMPT.md: Chrome MV3 extension, PWA share target,
watchlist email reminders. Include a README for the extension with build and "load unpacked" steps.
```
**Check yourself:** load the extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked), open a Copart lot, click "Analyze with AuctionPulse", and a report opens.

---

## 4. When something goes wrong (fix-it prompts)

**Bug:**
```
Bug: <what I did> → <what I expected> → <what happened>. Error/log: <paste>.
Find the root cause, fix it, add a test that would have caught it, and run the full test suite.
```

**Tests failing:**
```
These tests fail: <paste output>. Fix the code, not the tests — unless a test contradicts
docs/02-AI-MASTER-PROMPT.md, in which case explain why before changing it.
```

**AI returns bad or empty JSON:**
```
The vision step fails Zod validation on this listing: <paste error>. Keep the schema; improve the prompt
and the retry-with-errors logic, and make the manual damage editor open if it still fails.
```

**Design polish:**
```
Polish the report page UI: tighter spacing, clearer hierarchy, better mobile layout, consistent number
formatting. Do not change any calculation logic. Show me before/after screenshots if you can.
```

**Drifting from the spec:**
```
Re-read docs/02-AI-MASTER-PROMPT.md Sections <N>. List every place the current code differs from it, then fix them.
```

---

## 5. Go-live checklist

- [ ] **Replace the placeholder auction fee tables** with the current official Copart and IAAI fee charts (Admin → Fees), set `verifiedAt` and `sourceUrl`, and repeat every quarter.
- [ ] Calibrate the parts price and labor reference tables with real invoices or estimates from 10–20 recent repairs.
- [ ] **Back-test with 20 past deals** where you know the real buy price, repair cost and sale price. Compare them with the app's estimates and tune the rebuilt factor, contingency and labor ranges.
- [ ] Set `DEMO_MODE=false` and add the live keys. Run a smoke test on 5 real listings from each auction.
- [ ] Review the legal pages (terms, privacy, disclaimers) with a lawyer, especially the auction terms of service and the NMVTIS display rules.
- [ ] Set spending limits and alerts on the AI provider, scraping and data APIs. Check the average cost per report on the Admin → Usage page.
- [ ] Switch Stripe to live mode. Test a real purchase and a refund.
- [ ] Add error monitoring (e.g., Sentry) and uptime checks.

---

## 6. Validate the business while it's being built

- Talk to 10 people who flip salvage cars, run body shops or export cars. Ask: *"Walk me through the last car you bid on. How did you decide your max bid? What did you get wrong?"*
- Collect 20 real past deals (buy price, repair cost, sale price). This becomes your accuracy benchmark and your best marketing ("our max bid would have saved you $X on this car").
- Put up the landing page with a waitlist in Phase 6, or earlier with a simple page, and share it in salvage-flipping communities: Facebook groups, forums, and YouTube creators who do auction rebuilds.
