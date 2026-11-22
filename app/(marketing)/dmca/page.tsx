import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";
import { legalConfig } from "@/lib/config/legal";

export const metadata: Metadata = { title: "Copyright and DMCA", alternates: { canonical: "/dmca" } };

export default function DmcaPage() {
  const legal = legalConfig();
  return (
    <LegalPage title="Copyright and DMCA" updated="November 22, 2026">
      <p>
        FlagBid respects intellectual property. Reports and shared links can contain text and photos that users uploaded or that came from public auction
        listings. If you believe content on FlagBid infringes your copyright, send us a notice and we&apos;ll act on it promptly.
      </p>

      <h2>Designated agent for notices</h2>
      <ul>
        <li>Name: {legal.dmcaAgentName}</li>
        <li>Email: {legal.dmcaAgentEmail}</li>
        <li>Postal address: {legal.dmcaAgentAddress}</li>
        {legal.dmcaRegistrationNumber && <li>U.S. Copyright Office registration: {legal.dmcaRegistrationNumber}</li>}
      </ul>

      <h2>What to include in a takedown notice</h2>
      <ul>
        <li>Your name, address, phone number and email, and your physical or electronic signature.</li>
        <li>The copyrighted work you say was infringed.</li>
        <li>The exact FlagBid address (URL) of the content, so we can find it — for a shared report, the full share link.</li>
        <li>A statement that you have a good-faith belief the use is not authorized by the copyright owner, its agent or the law.</li>
        <li>
          A statement, under penalty of perjury, that the information in the notice is accurate and that you are the owner or authorized to act for the owner.
        </li>
      </ul>

      <h2>What we do</h2>
      <ul>
        <li>We remove or disable access to content that is the subject of a valid notice, and tell the user who posted it.</li>
        <li>That user can send a counter-notice. If they do, and you don&apos;t file a court action within 10 business days, we may restore the content.</li>
        <li>We end the accounts of users who repeatedly infringe.</li>
      </ul>

      <p>Misrepresenting that content is infringing, or that it was removed by mistake, can make you liable for damages.</p>
    </LegalPage>
  );
}
