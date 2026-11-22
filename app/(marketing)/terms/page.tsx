import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/marketing/legal-page";
import { legalConfig } from "@/lib/config/legal";

export const metadata: Metadata = { title: "Terms of Service", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  const legal = legalConfig();
  return (
    <LegalPage title="Terms of Service" updated="November 22, 2026">
      <p>
        These terms govern your use of FlagBid (&ldquo;the Service&rdquo;), operated by {legal.entity}, {legal.address} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By
        creating an account or using the Service you agree to them. If you use the Service for a company, you accept these terms on its behalf.
      </p>

      <h2>1. What the Service does</h2>
      <p>
        The Service analyzes vehicle auction listings and produces estimates: repair cost, market value, auction and transport fees, profit scenarios, a
        suggested maximum bid and a verdict. It combines data you provide, data from the listing, third-party data sources and automated (including AI)
        analysis.
      </p>

      <h2>2. Estimates, not advice — you bid at your own risk</h2>
      <ul>
        <li>
          Reports are estimates only. They are not an appraisal, a body-shop quote, an insurance estimate, a vehicle inspection, or financial, legal or tax
          advice. A &ldquo;GO&rdquo; verdict is not a promise of profit.
        </li>
        <li>
          Photos and listings can be incomplete or wrong, and AI analysis can misread them. Hidden damage, title and registration rules, auction fees and market
          prices change and differ by state and country.
        </li>
        <li>
          Buying vehicles at auction carries a real risk of financial loss. You are solely responsible for your bids, purchases, repairs, compliance with title,
          registration, import and export rules, and resale. Inspect the vehicle where you can, and verify everything before you bid.
        </li>
        <li>We don&apos;t take part in any auction, hold any vehicle or money for you, or guarantee any price, repair cost or outcome.</li>
      </ul>

      <h2>3. Who can use the Service</h2>
      <p>
        <strong className="text-foreground">You must be at least 18 years old.</strong> The Service is not directed to children and we don&apos;t knowingly
        collect personal data from anyone under 18; if we learn that we have, we delete it. You confirm your age when you sign up. Keep your login and API
        tokens secure; you are responsible for activity on your account. We may suspend accounts that break these terms or put the Service or others at risk.
      </p>

      <h2>4. Acceptable use</h2>
      <ul>
        <li>Don&apos;t use the Service to break the law or any auction&apos;s terms, or to infringe others&apos; rights.</li>
        <li>Don&apos;t resell, scrape or bulk-download the Service or reports, or try to get around usage limits, credits or security controls.</li>
        <li>Don&apos;t try to read other users&apos; data, probe the Service for weaknesses without our written permission, or overload it.</li>
        <li>Only upload photos and information you have the right to use.</li>
      </ul>

      <h2>5. Plans, credits, renewal and refunds</h2>
      <ul>
        <li>
          <strong className="text-foreground">Subscriptions</strong> renew automatically every month at the price shown at checkout until you cancel, and are
          billed in advance through our payment processor (Stripe). Cancel any time in Billing → Manage subscription; the plan stays active until the end of the
          period you paid for. We don&apos;t refund partial months unless the law requires it.
        </li>
        <li>
          <strong className="text-foreground">Credit packs</strong> are one-time payments with no renewal. Credits don&apos;t expire. Each analyzed lot uses one
          report credit; credits for analyses that fail are returned automatically.
        </li>
        <li>
          <strong className="text-foreground">Refunds:</strong> unused credits from a pack can be refunded within 14 days of purchase on request. Credits
          already used for reports are not refundable. If you are a consumer in the EU or UK, your statutory rights are not affected; by starting to use paid
          credits you ask us to begin supplying the digital service immediately.
        </li>
        <li>
          Prices are in euros and may include or exclude tax as shown at checkout. We&apos;ll give at least 30 days&apos; notice of a price change before your
          next renewal.
        </li>
      </ul>

      <h2>6. Your content and sharing</h2>
      <p>
        You keep ownership of what you upload and of your reports. You give us a license to store and process it to run the Service for you, including sending
        it to the service providers listed in the Privacy Policy. Share links make a report readable to anyone who has the link until you revoke it; shared
        reports don&apos;t include your pasted text or home ZIP code.
      </p>

      <h2>7. Third-party sites and content</h2>
      <p>
        The Service is not affiliated with or endorsed by Copart, IAAI, Bid.cars or any other auction. Listing data, photos and trademarks belong to their
        owners. We are not responsible for third-party sites or data. If you believe content in the Service infringes your copyright, see our{" "}
        <Link href="/dmca" className="underline">
          copyright (DMCA) policy
        </Link>
        .
      </p>

      <h2>8. Disclaimers and limitation of liability</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; without warranties of any kind, including accuracy, availability, fitness for a particular purpose and
        non-infringement. To the maximum extent permitted by law, we are not liable for indirect, incidental or consequential damages, lost profits, or losses
        from purchases, bids or repairs, and our total liability is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms
        limits liability that cannot be limited by law, including for death or personal injury caused by negligence, fraud, or your statutory consumer rights.
      </p>

      <h2>9. Changes, termination and deleting your data</h2>
      <p>
        We may update these terms; we&apos;ll notify you of material changes before they take effect and ask you to accept them again. You can stop using the
        Service and permanently delete your account and data at any time from Settings; deleting the account also cancels any subscription.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These terms are governed by the laws of the country where {legal.entity} is established, without regard to conflict-of-law rules, and the courts there
        have jurisdiction, except that consumers keep any mandatory right to use the courts and laws of the place where they live.
      </p>

      <h2>11. Contact</h2>
      <p>
        {legal.entity}, {legal.address}. Email: {legal.supportEmail}.
      </p>
    </LegalPage>
  );
}
