import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 1, 2026">
      <p>This policy explains what AuctionPulse AI collects, why, who we share it with and the choices you have.</p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong className="text-foreground">Account data</strong> — your email address, name if you give one, plan and credit balance.
        </li>
        <li>
          <strong className="text-foreground">What you analyze</strong> — auction links, VINs, pasted listing text, photos you upload, data sent by the browser
          extension, your settings (labor rate, ZIP code, fees, targets) and your notes, watchlist and deal journal.
        </li>
        <li>
          <strong className="text-foreground">Reports</strong> — the listing data, vehicle and history data, damage and repair estimates, market comparables and
          calculations we produce for you.
        </li>
        <li>
          <strong className="text-foreground">Usage and technical data</strong> — request logs, rate-limit counters and error logs used to keep the Service
          running and secure.
        </li>
        <li>
          <strong className="text-foreground">Billing</strong> — handled by Stripe. We store your Stripe customer ID and plan, never your card number.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To produce your reports, run reminders and save your settings.</li>
        <li>To bill you, prevent abuse and enforce usage limits.</li>
        <li>To fix problems and improve estimates. We don&apos;t sell your data or use it for advertising.</li>
      </ul>

      <h2>Service providers</h2>
      <p>Depending on how this deployment is configured, we share the minimum data needed with:</p>
      <ul>
        <li>Supabase (authentication and photo storage) and our database and hosting providers.</li>
        <li>AI providers (Anthropic or OpenAI) — listing text and vehicle photos, to extract details and assess damage. Your email is not sent.</li>
        <li>
          Vehicle data providers — VIN decoding (NHTSA vPIC), history and market data (for example VinAudit and Marketcheck) — the VIN, ZIP code and vehicle
          details.
        </li>
        <li>Page-fetching services (for example ScrapingBee or Apify) — the auction link.</li>
        <li>Stripe (payments), Resend (email reminders) and Inngest (background jobs).</li>
      </ul>

      <h2>Retention</h2>
      <ul>
        <li>Reports stay in your account until you delete them or your account.</li>
        <li>Stored copies of auction photos are deleted automatically after 90 days; the report keeps its numbers.</li>
        <li>Cached third-party responses expire on their own schedule; rate-limit records are kept for one day.</li>
      </ul>

      <h2>Sharing</h2>
      <p>Reports are private to you. If you create a share link, anyone with the link can view that report until you revoke it.</p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>Download a copy of your data or permanently delete your account and everything in it from Settings.</li>
        <li>Revoke share links and extension tokens at any time.</li>
        <li>
          Depending on where you live (for example under the GDPR or CCPA) you may have rights to access, correct, delete or port your data and to object to
          processing. Contact us to use them.
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        We use encrypted connections, hashed API tokens, access controls and least-privilege keys. No system is perfectly secure; tell us right away if you
        believe your account has been compromised.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We&apos;ll post changes here and notify you of material ones. For privacy questions, contact the operator of this AuctionPulse AI deployment through the
        support address listed in the app.
      </p>
    </LegalPage>
  );
}
