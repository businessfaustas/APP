import { jsonLdString, type JsonLd } from "@/lib/seo/schema";

/** Emits structured data as a JSON-LD script. */
export function JsonLd({ data }: { data: JsonLd | JsonLd[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}
