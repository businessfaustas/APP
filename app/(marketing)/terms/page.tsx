import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="October 1, 2026">
      <p>
        These terms govern your use of AuctionPulse AI (&ldquo;the Service&rdquo;). By creating an account or using the Service you agree to them. If you use
        the Service for a company, you accept these terms on its behalf.
      </p>

      <h2>1. What the Service does</h2>
      <p>
        The Service analyzes vehicle auction listings and produces estimates: repair cost, market value, auction and transport fees, profit scenarios, a
        suggested maximum bid and a verdict. It combines data you provide, data from the listing, third-party data sources and automated (including AI)
        analysis.
      </p>

      <h2>2. Estimates, not advice</h2>
      <ul>
        <li>
          Reports are estimates only. They are not an appraisal, a body-shop quote, an insurance estimate, a vehicle inspection, or financial, legal or tax
          advice.
        </li>
        <li>
          Photos and listings can be incomplete or wrong. Hidden damage, title and registration rules, auction fees and market prices change and differ by state
          and country.
        </li>
        <li>
          You are solely responsible for your bids, purchases, repairs, compliance with title, registration, import and export rules, and resale. Verify
          everything before you bid.
        </li>
      </ul>

      <h2>3. Accounts</h2>
      <p>
        Keep your login and API tokens secure; you are responsible for activity on your account. You must be old enough to enter a binding contract where you
        live. We may suspend accounts that break these terms or put the Service or others at risk.
      </p>

      <h2>4. Acceptable use</h2>
      <ul>
        <li>Don&apos;t use the Service to break the law or any auction&apos;s terms, or to infringe others&apos; rights.</li>
        <li>Don&apos;t resell, scrape or bulk-download the Service or reports, or try to get around usage limits, credits or security controls.</li>
        <li>Only upload photos and information you have the right to use.</li>
      </ul>

      <h2>5. Plans, credits and billing</h2>
      <p>
        Paid plans renew monthly until cancelled and are billed in advance through our payment processor. Each analyzed lot uses one report credit; credits for
        analyses that fail are returned automatically. Except where the law requires otherwise, payments are non-refundable. We may change prices with at least
        30 days&apos; notice before your next renewal.
      </p>

      <h2>6. Your content</h2>
      <p>
        You keep ownership of what you upload and of your reports. You give us a license to store and process it to run the Service for you, including sending
        it to the service providers listed in the Privacy Policy. Share links make a report readable to anyone who has the link until you revoke it.
      </p>

      <h2>7. Third-party sites</h2>
      <p>
        The Service is not affiliated with or endorsed by Copart, IAAI, Bid.cars or any other auction. Listing data and photos belong to their owners. We are
        not responsible for third-party sites or data.
      </p>

      <h2>8. Disclaimers and limitation of liability</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; without warranties of any kind, including accuracy, fitness for a particular purpose and non-infringement.
        To the maximum extent permitted by law, we are not liable for indirect, incidental or consequential damages, or for losses from purchases, bids or
        repairs, and our total liability is limited to the amount you paid us in the 12 months before the claim.
      </p>

      <h2>9. Changes and termination</h2>
      <p>
        We may update these terms; we&apos;ll notify you of material changes before they take effect. You can stop using the Service and delete your account at
        any time from Settings.
      </p>

      <h2>10. Contact</h2>
      <p>Questions about these terms: contact the operator of this AuctionPulse AI deployment through the support address listed in the app.</p>
    </LegalPage>
  );
}
