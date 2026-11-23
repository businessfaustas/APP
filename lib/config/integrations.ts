import "server-only";

import { fetchWithTimeout } from "@/lib/providers/http";

import { env, features } from "./env";
import { legalConfig } from "./legal";

export type Priority = "required" | "recommended" | "optional";

export interface IntegrationVar {
  name: string;
  set: boolean;
  /** Only needed for some setups (e.g. one of two alternative keys). */
  optional?: boolean;
}

/** One external service: what it does, what the app does without it, and which variables switch it on. */
export interface Integration {
  key: string;
  name: string;
  priority: Priority;
  enabled: boolean;
  unlocks: string;
  without: string;
  vars: IntegrationVar[];
  /** Where to create the key. */
  docs: string;
  /** True when "Test" makes a real, read-only request with the saved key. */
  checkable: boolean;
}

const isSet = (v: string | undefined | null) => Boolean(v && String(v).trim());

/** The full setup checklist. Never includes a secret's value, only whether it is set. */
export function integrations(): Integration[] {
  const e = env();
  const ai = e.AI_PROVIDER;
  return [
    {
      key: "database",
      name: "Postgres database",
      priority: "required",
      enabled: isSet(e.DATABASE_URL),
      unlocks: "Stores users, reports, watchlist, journal and settings.",
      without: "Nothing works — this is the one key the app cannot run without.",
      vars: [
        { name: "DATABASE_URL", set: isSet(e.DATABASE_URL) },
        { name: "DIRECT_URL", set: isSet(process.env.DIRECT_URL), optional: true },
      ],
      docs: "https://supabase.com/dashboard/project/_/settings/database",
      checkable: true,
    },
    {
      key: "auth",
      name: "Supabase Auth (sign-in)",
      priority: "required",
      enabled: features.supabaseAuth(),
      unlocks: "Real accounts: email magic link and Google sign-in for your customers.",
      without: "Only the shared demo account can sign in.",
      vars: [
        { name: "NEXT_PUBLIC_SUPABASE_URL", set: isSet(e.NEXT_PUBLIC_SUPABASE_URL) },
        { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", set: isSet(e.NEXT_PUBLIC_SUPABASE_ANON_KEY) },
        { name: "ADMIN_EMAILS", set: isSet(e.ADMIN_EMAILS), optional: true },
      ],
      docs: "https://supabase.com/dashboard/project/_/settings/api",
      checkable: true,
    },
    {
      key: "storage",
      name: "Supabase Storage (photos)",
      priority: "recommended",
      enabled: features.supabaseStorage(),
      unlocks: "Keeps auction and uploaded photos permanently.",
      without:
        "Photos are kept in your Postgres database instead. That works everywhere but uses database space, so move them to Supabase Storage once you have regular users.",
      vars: [
        { name: "SUPABASE_SERVICE_ROLE_KEY", set: isSet(e.SUPABASE_SERVICE_ROLE_KEY) },
        { name: "SUPABASE_PHOTOS_BUCKET", set: isSet(process.env.SUPABASE_PHOTOS_BUCKET), optional: true },
      ],
      docs: "https://supabase.com/dashboard/project/_/storage/buckets",
      checkable: false,
    },
    {
      key: "ai",
      name: ai === "openai" ? "OpenAI (AI vision)" : "Anthropic Claude (AI vision)",
      priority: "required",
      enabled: features.ai(),
      unlocks:
        "Reads the damage from the photos part by part, researches the car's clean market value on the web from its exact model, trim and mileage, extracts pasted listing text and writes the summary. For the web research, turn on web search in the Anthropic console (Settings → Privacy).",
      without:
        "The photos aren't analyzed (damage comes from the listing's damage type with built-in rules) and the market value isn't estimated: the report asks you to type it.",
      vars: [
        { name: "AI_PROVIDER", set: isSet(process.env.AI_PROVIDER), optional: true },
        ai === "openai" ? { name: "OPENAI_API_KEY", set: isSet(e.OPENAI_API_KEY) } : { name: "ANTHROPIC_API_KEY", set: isSet(e.ANTHROPIC_API_KEY) },
      ],
      docs: ai === "openai" ? "https://platform.openai.com/api-keys" : "https://console.anthropic.com/settings/keys",
      checkable: true,
    },
    {
      key: "scraping",
      name: "Listing reader (ScrapingBee or Apify)",
      priority: "recommended",
      enabled: features.scraping(),
      unlocks: "Paste a Copart / IAAI link and every detail and photo is filled in automatically.",
      without: "Auction sites usually block direct reads, so the app asks for a few details or the pasted page text (the browser extension also works).",
      vars: [
        { name: "SCRAPINGBEE_API_KEY", set: isSet(e.SCRAPINGBEE_API_KEY) },
        { name: "APIFY_TOKEN", set: isSet(e.APIFY_TOKEN), optional: true },
        { name: "APIFY_ACTOR_ID", set: isSet(e.APIFY_ACTOR_ID), optional: true },
      ],
      docs: "https://app.scrapingbee.com/account/manage/api_key",
      checkable: isSet(e.SCRAPINGBEE_API_KEY),
    },
    {
      key: "history",
      name: "VinAudit (title history & market value)",
      priority: "recommended",
      enabled: features.history(),
      unlocks: "NMVTIS title and odometer history, plus a market value for the resale estimate.",
      without: "The VIN is still decoded (free NHTSA); the title comes from the listing and is flagged as unverified.",
      vars: [{ name: "VINAUDIT_API_KEY", set: isSet(e.VINAUDIT_API_KEY) }],
      docs: "https://www.vinaudit.com/vehicle-history-api",
      checkable: false,
    },
    {
      key: "market",
      name: "Marketcheck (comparable listings)",
      priority: "optional",
      enabled: features.marketcheck(),
      unlocks: "Real comparable listings near the buyer for the resale value and the market chart.",
      without: "Resale falls back to VinAudit, an AI estimate or the auction's retail value; if none is known, the report asks you to type it.",
      vars: [{ name: "MARKETCHECK_API_KEY", set: isSet(e.MARKETCHECK_API_KEY) }],
      docs: "https://www.marketcheck.com/apis",
      checkable: false,
    },
    {
      key: "parts",
      name: "eBay Motors (real part prices)",
      priority: "recommended",
      enabled: features.partsMarket(),
      unlocks: "Every replaced part is priced from live new and used listings, with links as proof, instead of estimates.",
      without: "Part prices come from the built-in reference table and AI estimates, and the report labels them as estimates.",
      vars: [
        { name: "EBAY_CLIENT_ID", set: isSet(e.EBAY_CLIENT_ID) },
        { name: "EBAY_CLIENT_SECRET", set: isSet(e.EBAY_CLIENT_SECRET) },
        { name: "EBAY_MARKETPLACE", set: isSet(process.env.EBAY_MARKETPLACE), optional: true },
      ],
      docs: "https://developer.ebay.com/my/keys",
      checkable: features.partsMarket(),
    },
    {
      key: "stripe",
      name: "Stripe (car packs and plans)",
      priority: "recommended",
      enabled: features.stripe(),
      unlocks: "Customers pay in euros for packs of 10 / 30 / 100 cars and for monthly plans; the billing portal works.",
      without: "Plans are shown, but checkout is switched off — credits can be given from Admin › Users.",
      vars: [
        { name: "STRIPE_SECRET_KEY", set: isSet(e.STRIPE_SECRET_KEY) },
        { name: "STRIPE_WEBHOOK_SECRET", set: isSet(e.STRIPE_WEBHOOK_SECRET) },
        { name: "STRIPE_PRICE_PACK_10", set: isSet(e.STRIPE_PRICE_PACK_10) || isSet(e.STRIPE_PRICE_CREDITS_10) },
        { name: "STRIPE_PRICE_PACK_30", set: isSet(e.STRIPE_PRICE_PACK_30), optional: true },
        { name: "STRIPE_PRICE_PACK_100", set: isSet(e.STRIPE_PRICE_PACK_100), optional: true },
        { name: "STRIPE_PRICE_PRO", set: isSet(e.STRIPE_PRICE_PRO), optional: true },
        { name: "STRIPE_PRICE_BUSINESS", set: isSet(e.STRIPE_PRICE_BUSINESS), optional: true },
        { name: "STRIPE_AUTOMATIC_TAX", set: e.STRIPE_AUTOMATIC_TAX, optional: true },
      ],
      docs: "https://dashboard.stripe.com/apikeys",
      checkable: true,
    },
    {
      key: "email",
      name: "Resend (email reminders)",
      priority: "optional",
      enabled: features.email(),
      unlocks: "Emails a reminder 2 hours before a watched lot's sale (sent by Inngest or the scheduled job below).",
      without: "Sale countdowns show in the app only.",
      vars: [
        { name: "RESEND_API_KEY", set: isSet(e.RESEND_API_KEY) },
        { name: "EMAIL_FROM", set: isSet(process.env.EMAIL_FROM), optional: true },
      ],
      docs: "https://resend.com/api-keys",
      checkable: true,
    },
    {
      key: "jobs",
      name: "Inngest (background jobs)",
      priority: "optional",
      enabled: features.inngest(),
      unlocks: "Runs analyses in a queue with automatic retries — useful at higher volume.",
      without: "Analyses run inside the request; fine for normal use.",
      vars: [
        { name: "INNGEST_EVENT_KEY", set: isSet(e.INNGEST_EVENT_KEY) },
        { name: "INNGEST_SIGNING_KEY", set: isSet(e.INNGEST_SIGNING_KEY) },
      ],
      docs: "https://app.inngest.com/env/production/manage/keys",
      checkable: false,
    },
    {
      key: "cron",
      name: "Scheduled reminders (cron secret)",
      priority: "optional",
      enabled: isSet(e.CRON_SECRET),
      unlocks:
        "Lets a scheduler call /api/cron/reminders hourly (Vercel Cron on Pro, or a free service such as cron-job.org with the header Authorization: Bearer <secret>).",
      without: "Scheduled reminders and clean-up only run when Inngest is connected.",
      vars: [{ name: "CRON_SECRET", set: isSet(e.CRON_SECRET) }],
      docs: "https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs",
      checkable: false,
    },
    {
      key: "domain",
      name: "Your own domain (HTTPS)",
      priority: "required",
      enabled: /^https:\/\//.test(e.NEXT_PUBLIC_APP_URL) && !/\.vercel\.app/.test(e.NEXT_PUBLIC_APP_URL),
      unlocks: "Your brand's address with an automatic SSL certificate, and a sender domain for email that lands in the inbox.",
      without: "The app runs on the temporary vercel.app address, and email from a shared domain is more likely to go to spam.",
      vars: [{ name: "NEXT_PUBLIC_APP_URL", set: isSet(process.env.NEXT_PUBLIC_APP_URL) }],
      docs: "https://vercel.com/docs/domains/working-with-domains/add-a-domain",
      checkable: false,
    },
    {
      key: "legal",
      name: "Company details (legal pages, emails, DMCA)",
      priority: "required",
      enabled: !legalConfig().isPlaceholder,
      unlocks:
        "Names the operator and the postal address on the Terms, Privacy Policy, DMCA page and in the footer of every email (required by CAN-SPAM, GDPR and similar laws).",
      without: "Those pages and emails show a placeholder. Fill it in before taking real customers.",
      vars: [
        { name: "LEGAL_ENTITY", set: isSet(process.env.LEGAL_ENTITY) },
        { name: "LEGAL_ADDRESS", set: isSet(process.env.LEGAL_ADDRESS) },
        { name: "SUPPORT_EMAIL", set: isSet(process.env.SUPPORT_EMAIL) },
        { name: "DMCA_AGENT_NAME", set: isSet(process.env.DMCA_AGENT_NAME), optional: true },
        { name: "DMCA_AGENT_EMAIL", set: isSet(process.env.DMCA_AGENT_EMAIL), optional: true },
        { name: "DMCA_REGISTRATION_NUMBER", set: isSet(process.env.DMCA_REGISTRATION_NUMBER), optional: true },
      ],
      docs: "https://www.copyright.gov/dmca-directory/",
      checkable: false,
    },
    {
      key: "monitoring",
      name: "Error tracking and alerts",
      priority: "recommended",
      enabled: isSet(e.SENTRY_DSN) || isSet(e.ALERT_WEBHOOK_URL) || (isSet(e.ALERT_EMAIL) && features.email()),
      unlocks: "Tells you the moment something breaks: new errors, failed payments, chargebacks, spend caps and outages go to Slack/Discord, email and Sentry.",
      without: "Errors are still logged and listed under Admin › Monitoring, but nobody is notified, so a problem can sit unseen.",
      vars: [
        { name: "ALERT_WEBHOOK_URL", set: isSet(e.ALERT_WEBHOOK_URL) },
        { name: "ALERT_EMAIL", set: isSet(e.ALERT_EMAIL), optional: true },
        { name: "SENTRY_DSN", set: isSet(e.SENTRY_DSN), optional: true },
      ],
      docs: "https://api.slack.com/messaging/webhooks",
      checkable: false,
    },
    {
      key: "secret",
      name: "App secret (signed email links)",
      priority: "recommended",
      enabled: isSet(process.env.APP_SECRET),
      unlocks: "Signs one-click unsubscribe links with a key of your own, so they keep working if the database password is ever rotated.",
      without: "Links are signed with a key derived from the database URL: secure, but they stop working if that URL changes.",
      vars: [{ name: "APP_SECRET", set: isSet(process.env.APP_SECRET) }],
      docs: "https://vercel.com/docs/environment-variables",
      checkable: false,
    },
    {
      key: "spend",
      name: "Spend caps (built in)",
      priority: "optional",
      enabled: e.AI_DAILY_BUDGET_USD > 0 || e.AI_MONTHLY_BUDGET_USD > 0 || e.SCRAPE_DAILY_CAP > 0,
      unlocks: `Stops AI and paid page-reader calls at a limit (now $${e.AI_DAILY_BUDGET_USD}/day, $${e.AI_MONTHLY_BUDGET_USD}/month, ${e.SCRAPE_DAILY_CAP} page reads/day) and warns you at 80%. Also set caps in each provider's own dashboard.`,
      without: "No limit: a bug or abuse could run up the AI bill.",
      vars: [
        { name: "AI_DAILY_BUDGET_USD", set: isSet(process.env.AI_DAILY_BUDGET_USD), optional: true },
        { name: "AI_MONTHLY_BUDGET_USD", set: isSet(process.env.AI_MONTHLY_BUDGET_USD), optional: true },
        { name: "SCRAPE_DAILY_CAP", set: isSet(process.env.SCRAPE_DAILY_CAP), optional: true },
      ],
      docs: "https://console.anthropic.com/settings/limits",
      checkable: false,
    },
  ];
}

export interface CheckResult {
  ok: boolean;
  message: string;
}

async function probe(url: string, init: RequestInit, okMessage: string): Promise<CheckResult> {
  try {
    const res = await fetchWithTimeout(url, { ...init, timeoutMs: 10_000, cache: "no-store" });
    if (res.ok) return { ok: true, message: okMessage };
    if (res.status === 401 || res.status === 403) return { ok: false, message: `The key was rejected (HTTP ${res.status}). Check it was copied in full.` };
    return { ok: false, message: `The service answered HTTP ${res.status}.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error && err.name === "AbortError" ? "No answer within 10 seconds." : "Couldn't reach the service." };
  }
}

/** Makes one small read-only request with the saved key. Never sends anything that costs credits. */
export async function checkIntegration(key: string): Promise<CheckResult> {
  const e = env();
  switch (key) {
    case "database": {
      const { prisma } = await import("@/lib/db/prisma");
      try {
        await prisma.$queryRaw`SELECT 1`;
        return { ok: true, message: "Connected." };
      } catch {
        return { ok: false, message: "Couldn't connect with DATABASE_URL." };
      }
    }
    case "auth":
      if (!features.supabaseAuth()) return { ok: false, message: "Not configured." };
      return probe(
        `${e.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "")}/auth/v1/settings`,
        { headers: { apikey: e.NEXT_PUBLIC_SUPABASE_ANON_KEY! } },
        "Supabase Auth answered.",
      );
    case "ai":
      if (!features.ai()) return { ok: false, message: "Not configured." };
      return e.AI_PROVIDER === "openai"
        ? probe("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${e.OPENAI_API_KEY}` } }, "Key accepted by OpenAI.")
        : probe(
            "https://api.anthropic.com/v1/models",
            { headers: { "x-api-key": e.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" } },
            "Key accepted by Anthropic.",
          );
    case "scraping":
      if (!e.SCRAPINGBEE_API_KEY) return { ok: false, message: "Not configured." };
      return probe(`https://app.scrapingbee.com/api/v1/usage?api_key=${encodeURIComponent(e.SCRAPINGBEE_API_KEY)}`, {}, "Key accepted by ScrapingBee.");
    case "stripe":
      if (!e.STRIPE_SECRET_KEY) return { ok: false, message: "Not configured." };
      return probe("https://api.stripe.com/v1/balance", { headers: { authorization: `Bearer ${e.STRIPE_SECRET_KEY}` } }, "Key accepted by Stripe.");
    case "parts": {
      if (!features.partsMarket()) return { ok: false, message: "Not configured." };
      const { checkEbay } = await import("@/lib/providers/parts/ebay");
      try {
        await checkEbay();
        return { ok: true, message: "eBay accepted the keyset." };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "Couldn't reach eBay." };
      }
    }
    case "email":
      if (!e.RESEND_API_KEY) return { ok: false, message: "Not configured." };
      return probe("https://api.resend.com/domains", { headers: { authorization: `Bearer ${e.RESEND_API_KEY}` } }, "Key accepted by Resend.");
    default:
      return { ok: false, message: "No live check for this service — it is used on the next analysis." };
  }
}
