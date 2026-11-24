import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";
import { legalConfig } from "@/lib/config/legal";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  const legal = legalConfig();
  return (
    <LegalPage title="Privacy Policy" updated="November 22, 2026">
      <p>
        This policy explains what FlagBid collects, why, who we share it with and the choices you have. The controller of your personal data is {legal.entity},{" "}
        {legal.address}. Contact: {legal.supportEmail}.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong className="text-foreground">Account data</strong> — your name, email address and phone number, plan and credit balance, the date you confirmed
          you are 18 or older and accepted these terms, and whether you unsubscribed from email.
        </li>
        <li>
          <strong className="text-foreground">What you analyze</strong> — auction links, VINs, pasted listing text, photos you upload, data sent by the browser
          extension, your settings (labor rate, ZIP code, fees, targets) and your notes, watchlist and deal journal. A VIN identifies a vehicle, and can be
          linked to its owner, so we treat it with care.
        </li>
        <li>
          <strong className="text-foreground">Reports</strong> — the listing data, vehicle and history data, damage and repair estimates, market comparables and
          calculations we produce for you.
        </li>
        <li>
          <strong className="text-foreground">Billing</strong> — handled by Stripe. We store your Stripe customer ID and plan, never your card number.
        </li>
        <li>
          <strong className="text-foreground">Technical and security data</strong> — request logs (time, path, status, request id), rate-limit counters, and
          error reports (which page failed and the technical error). IP addresses are used to limit abuse and are not stored with analytics.
        </li>
        <li>
          <strong className="text-foreground">Analytics (only if you allow it)</strong> — which pages are viewed, a few product events (for example
          &ldquo;analysis started&rdquo;) and page-speed measurements. These are anonymous: no user id, IP address or cookie identifier is attached, and we
          never record sessions, screens or keystrokes.
        </li>
      </ul>

      <h2>Cookies</h2>
      <ul>
        <li>
          <strong className="text-foreground">Essential (always on):</strong> the sign-in session, your theme and language, your cookie choice (
          <code>fb_consent</code>) and a short-lived age confirmation during sign-up. The app cannot work without them, so they need no consent.
        </li>
        <li>
          <strong className="text-foreground">Analytics (off until you choose &ldquo;Allow analytics&rdquo;):</strong> no extra cookie is set; the choice is
          what switches the measurements above on. You can change your mind any time with &ldquo;Cookie settings&rdquo; in the footer.
        </li>
        <li>We don&apos;t use advertising or cross-site tracking cookies, and we load no third-party analytics scripts.</li>
      </ul>

      <h2>Why we use it, and the legal basis</h2>
      <ul>
        <li>To produce your reports, run reminders and save your settings — to perform our contract with you.</li>
        <li>To bill you, prevent abuse, keep the Service secure and fix errors — our legitimate interests, and legal obligations (tax records).</li>
        <li>Analytics and page-speed measurement — your consent, which you can withdraw at any time.</li>
        <li>Reminder and product emails — your consent or our legitimate interest, with an unsubscribe link in every one.</li>
        <li>We don&apos;t sell your data, use it for advertising, or make decisions about you that have legal effects.</li>
      </ul>

      <h2>Service providers (processors)</h2>
      <p>Depending on how this deployment is configured, we share the minimum data needed with:</p>
      <ul>
        <li>Supabase (authentication and photo storage) and our database and hosting providers (for example Vercel and Neon).</li>
        <li>AI providers (Anthropic or OpenAI) — listing text and vehicle photos, to extract details and assess damage. Your email is not sent.</li>
        <li>
          Vehicle data providers — VIN decoding (NHTSA vPIC), history and market data (for example VinAudit and Marketcheck) and part prices (eBay) — the VIN,
          ZIP code and vehicle details.
        </li>
        <li>Page-fetching services (for example ScrapingBee or Apify) — the auction link.</li>
        <li>Stripe (payments), Resend (email), Inngest (background jobs) and, if configured, Sentry (error reports).</li>
      </ul>
      <p>
        Some of these providers are in the United States. Where personal data leaves the EU/EEA or UK we rely on the provider&apos;s Data Processing Agreement
        and Standard Contractual Clauses or an adequacy decision.
      </p>

      <h2>Retention</h2>
      <ul>
        <li>Reports stay in your account until you delete them or your account.</li>
        <li>Stored copies of auction photos are deleted automatically after 90 days; the report keeps its numbers.</li>
        <li>Cached third-party responses expire on their own schedule; rate-limit records are kept for one day.</li>
        <li>Error reports and anonymous analytics are kept for up to 12 months.</li>
        <li>Invoices and payment records are kept by Stripe and by us for as long as tax law requires, even after you delete your account.</li>
      </ul>

      <h2>Sharing</h2>
      <p>
        Reports are private to you. If you create a share link, anyone with the link can view that report until you revoke it. A shared report does not include
        your pasted text, home ZIP code or what the analysis cost us.
      </p>

      <h2>Children</h2>
      <p>
        FlagBid is for adults. You must be 18 or older to create an account, and we ask you to confirm this before we collect your email address. We don&apos;t
        knowingly collect personal data from children. If you believe a child has given us data, contact {legal.supportEmail} and we will delete it.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>
          Download a copy of your data (Settings → Export my data) or permanently delete your account and everything in it, including your uploaded photos and
          your sign-in identity (Settings → Delete my account). Deleting the account also cancels your subscription.
        </li>
        <li>Revoke share links and extension tokens at any time, and unsubscribe from emails with the link in any of them.</li>
        <li>
          Depending on where you live (for example under the GDPR, UK GDPR or CCPA/CPRA) you may have rights to access, correct, delete or port your data, to
          object to or restrict processing, to withdraw consent, and to complain to your data-protection authority. Contact us at {legal.supportEmail} to use
          them. We will not discriminate against you for exercising them.
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        We use encrypted connections, row-level database security, hashed API tokens, per-user access checks on every request, rate limiting and least-privilege
        keys. No system is perfectly secure; tell us right away if you believe your account has been compromised. If a breach affects your data we will notify
        you and the authorities as the law requires.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We&apos;ll post changes here and notify you of material ones. Questions: {legal.entity}, {legal.address}, {legal.supportEmail}.
      </p>
    </LegalPage>
  );
}
