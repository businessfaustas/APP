import { appUrl } from "@/lib/config/deployment";
import { legalConfig } from "@/lib/config/legal";

export const revalidate = 86_400;

/** RFC 9116: where security researchers should send vulnerability reports. */
export function GET() {
  const { supportEmail } = legalConfig();
  const expires = new Date(Date.now() + 365 * 86_400_000).toISOString();
  const body = [
    `Contact: mailto:${supportEmail}`,
    `Expires: ${expires}`,
    "Preferred-Languages: en, lt",
    `Canonical: ${appUrl()}/.well-known/security.txt`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" } });
}
