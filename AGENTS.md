<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AuctionPulse AI — working in this repo

- Read `README.md` (setup, env, scripts) and `DECISIONS.md` (how the code departs from `docs/02-AI-MASTER-PROMPT.md`, and why) first.
- **Money is integer dollars; percentages are basis points.** Use `applyBps` / `hoursCost` from `lib/calc/money.ts`. Never use float percentages in `lib/calc`.
- `lib/calc` is pure and isomorphic. The browser's What-if panel and the server must produce identical numbers, so keep it free of I/O, `Date.now()` and `Intl`.
- The Audi A3 demo lot is the reference case (max $3,100 / comfort $2,375 / break-even $5,500 / GO / score 73). `lib/pipeline/__tests__/demoLots.test.ts` and `e2e/analysis.spec.ts` assert it, so if those numbers move, the change is a bug unless it was intended.
- Every external provider needs a fallback that works with no API key. Demo mode (`DEMO_MODE=true`) must keep the full flow working offline.
- Prisma 7: after changing `prisma/schema.prisma`, run `pnpm db:migrate` **and** `pnpm db:generate`.
- Before committing: `pnpm typecheck && pnpm lint && pnpm test`, and `pnpm e2e` with the dev server running for UI changes.
