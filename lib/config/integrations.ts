import "server-only";

import { fetchWithTimeout } from "@/lib/providers/http";

import { env, features } from "./env";

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
      without: "Photos are saved to the server's disk, which is wiped on every Vercel deploy.",
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
      priority: "recommended",
      enabled: features.ai(),
      unlocks: "Reads damage from the photos part by part, extracts pasted listing text and writes the summary.",
      without: "Damage is estimated from the listing's damage type with built-in rules; no photo reading.",
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
      key: "stripe",
      name: "Stripe (subscriptions)",
      priority: "recommended",
      enabled: features.stripe(),
      unlocks: "Customers pay for plans and credit packs; the billing portal works.",
      without: "Plans are shown, but checkout is switched off — credits can be given from Admin › Users.",
      vars: [
        { name: "STRIPE_SECRET_KEY", set: isSet(e.STRIPE_SECRET_KEY) },
        { name: "STRIPE_WEBHOOK_SECRET", set: isSet(e.STRIPE_WEBHOOK_SECRET) },
        { name: "STRIPE_PRICE_PRO", set: isSet(e.STRIPE_PRICE_PRO) },
        { name: "STRIPE_PRICE_BUSINESS", set: isSet(e.STRIPE_PRICE_BUSINESS), optional: true },
        { name: "STRIPE_PRICE_CREDITS_10", set: isSet(e.STRIPE_PRICE_CREDITS_10), optional: true },
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
    case "email":
      if (!e.RESEND_API_KEY) return { ok: false, message: "Not configured." };
      return probe("https://api.resend.com/domains", { headers: { authorization: `Bearer ${e.RESEND_API_KEY}` } }, "Key accepted by Resend.");
    default:
      return { ok: false, message: "No live check for this service — it is used on the next analysis." };
  }
}
