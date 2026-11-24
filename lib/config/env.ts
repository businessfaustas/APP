import "server-only";

import { z } from "zod";

import { appUrl, databaseUrl, demoModeEnabled, supabaseAnonKey, supabaseUrl } from "./deployment";

const bool = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1");

const opt = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  DEMO_MODE: bool,
  // Optional here: the database client reports a clear error on first use when it is missing.
  DATABASE_URL: opt,
  NEXT_PUBLIC_SUPABASE_URL: opt,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: opt,
  SUPABASE_SERVICE_ROLE_KEY: opt,
  // Show "Continue with Google" on the sign-in card. Turn it on only after Google is enabled in Supabase (Authentication → Providers).
  AUTH_GOOGLE: bool,
  SUPABASE_PHOTOS_BUCKET: z.string().default("listing-photos"),
  ADMIN_EMAILS: opt,
  AI_PROVIDER: z.enum(["anthropic", "openai"]).default("anthropic"),
  ANTHROPIC_API_KEY: opt,
  OPENAI_API_KEY: opt,
  AI_MODEL_VISION: z.string().default("claude-sonnet-5-5"),
  AI_MODEL_TEXT: z.string().default("claude-haiku-4-5-20251001"),
  AI_MAX_PHOTOS: z.coerce.number().int().min(1).max(60).default(24),
  // Photos per lot that may be fetched through the paid page reader (1 credit each) once the
  // photo host refuses a direct download. Direct downloads are free and not limited by this.
  SCRAPER_MAX_PAID_PHOTOS: z.coerce.number().int().min(0).max(60).default(10),
  AI_PRICE_VISION: z.string().default("3,15"),
  AI_PRICE_TEXT: z.string().default("1,5"),
  SCRAPINGBEE_API_KEY: opt,
  // "false" turns off the free direct read of auction pages (used when no scraping key is set).
  LISTING_DIRECT_FETCH: opt,
  APIFY_TOKEN: opt,
  APIFY_ACTOR_ID: opt,
  VINAUDIT_API_KEY: opt,
  VINAUDIT_HISTORY_URL: z.string().default("https://api.vinaudit.com/query.php"),
  VINAUDIT_MARKET_URL: z.string().default("https://marketvalue.vinaudit.com/getmarketvalue.php"),
  MARKETCHECK_API_KEY: opt,
  // eBay Browse API keyset: real new / used part prices for the repair estimate.
  EBAY_CLIENT_ID: opt,
  EBAY_CLIENT_SECRET: opt,
  EBAY_MARKETPLACE: z.string().default("EBAY_US"),
  INNGEST_EVENT_KEY: opt,
  INNGEST_SIGNING_KEY: opt,
  INNGEST_DEV: bool,
  CRON_SECRET: opt,
  STRIPE_SECRET_KEY: opt,
  STRIPE_WEBHOOK_SECRET: opt,
  STRIPE_PRICE_PRO: opt,
  STRIPE_PRICE_BUSINESS: opt,
  STRIPE_PRICE_PACK_10: opt,
  STRIPE_PRICE_PACK_30: opt,
  STRIPE_PRICE_PACK_100: opt,
  // Old name of the 10-report pack price; still read when STRIPE_PRICE_PACK_10 is not set.
  STRIPE_PRICE_CREDITS_10: opt,
  // Ask Stripe Tax to calculate and collect VAT / sales tax at checkout. Leave off until Stripe Tax is set up (see docs/LAUNCH-PLAN.md).
  STRIPE_AUTOMATIC_TAX: bool,
  RESEND_API_KEY: opt,
  EMAIL_FROM: z.string().default("FlagBid <alerts@example.com>"),
  // Monitoring and alerting (all optional; without them errors still go to the log and the error table).
  SENTRY_DSN: opt,
  ALERT_WEBHOOK_URL: opt,
  ALERT_EMAIL: opt,
  // Spend caps: when a cap is reached the app falls back to the no-AI path instead of spending more.
  AI_DAILY_BUDGET_USD: z.coerce.number().min(0).default(25),
  AI_MONTHLY_BUDGET_USD: z.coerce.number().min(0).default(250),
  // Paid page-reader calls per day across all users (ScrapingBee / Apify).
  SCRAPE_DAILY_CAP: z.coerce.number().int().min(0).default(400),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

/** Validated environment. Missing optional keys switch features to demo/fallback mode. */
export function env(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse({
    ...process.env,
    DATABASE_URL: databaseUrl(),
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey(),
    NEXT_PUBLIC_APP_URL: appUrl(),
    DEMO_MODE: demoModeEnabled() ? "true" : "false",
  });
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${msg}`);
  }
  cached = parsed.data;
  return cached;
}

export const features = {
  demoMode: () => env().DEMO_MODE,
  supabaseAuth: () => Boolean(env().NEXT_PUBLIC_SUPABASE_URL && env().NEXT_PUBLIC_SUPABASE_ANON_KEY),
  googleAuth: () => env().AUTH_GOOGLE,
  supabaseStorage: () => Boolean(env().NEXT_PUBLIC_SUPABASE_URL && env().SUPABASE_SERVICE_ROLE_KEY),
  ai: () => (env().AI_PROVIDER === "openai" ? Boolean(env().OPENAI_API_KEY) : Boolean(env().ANTHROPIC_API_KEY)),
  scraping: () => Boolean(env().SCRAPINGBEE_API_KEY || (env().APIFY_TOKEN && env().APIFY_ACTOR_ID)),
  history: () => Boolean(env().VINAUDIT_API_KEY),
  marketcheck: () => Boolean(env().MARKETCHECK_API_KEY),
  partsMarket: () => Boolean(env().EBAY_CLIENT_ID && env().EBAY_CLIENT_SECRET),
  vinauditMarket: () => Boolean(env().VINAUDIT_API_KEY),
  inngest: () => Boolean(env().INNGEST_EVENT_KEY || env().INNGEST_DEV),
  stripe: () => Boolean(env().STRIPE_SECRET_KEY),
  email: () => Boolean(env().RESEND_API_KEY),
};

/** Summary for the settings/admin "integrations" panel (no secrets). */
export function integrationStatus(): { key: string; label: string; enabled: boolean; note: string }[] {
  return [
    { key: "demo", label: "Demo mode", enabled: features.demoMode(), note: "Sample lots and fixture data" },
    { key: "auth", label: "Supabase Auth", enabled: features.supabaseAuth(), note: "Email sign-in link; Google when AUTH_GOOGLE=true" },
    {
      key: "storage",
      label: "Supabase Storage",
      enabled: features.supabaseStorage(),
      note: "Otherwise photos are stored in the database (or on local disk when self-hosting)",
    },
    { key: "ai", label: `AI (${env().AI_PROVIDER})`, enabled: features.ai(), note: "Vision damage audit, text extraction, narrative" },
    { key: "scraping", label: "Listing fetcher", enabled: features.scraping(), note: "ScrapingBee or Apify — paste-text works without it" },
    { key: "history", label: "VinAudit history", enabled: features.history(), note: "NMVTIS title & odometer history" },
    { key: "market", label: "Market comps", enabled: features.marketcheck() || features.vinauditMarket(), note: "Marketcheck or VinAudit market value" },
    {
      key: "parts",
      label: "Part prices (eBay)",
      enabled: features.partsMarket(),
      note: "Live new and used part prices; otherwise reference table + AI estimates",
    },
    { key: "jobs", label: "Inngest", enabled: features.inngest(), note: "Otherwise analyses run in-process" },
    { key: "stripe", label: "Stripe billing", enabled: features.stripe(), note: "Subscriptions and credit packs" },
    { key: "email", label: "Resend email", enabled: features.email(), note: "Watchlist reminders" },
  ];
}
