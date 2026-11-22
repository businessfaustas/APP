/**
 * schema.org structured data (JSON-LD) for search engines and AI answer engines. Pure builders,
 * so the output can be validated in tests. Only facts that are on the page go in here: no
 * invented ratings or review counts.
 */
export type JsonLd = Record<string, unknown>;

export function organizationSchema(o: { name: string; url: string; logo: string; email?: string }): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${o.url}/#organization`,
    name: o.name,
    url: o.url,
    logo: o.logo,
    ...(o.email ? { contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: o.email } } : {}),
  };
}

export function websiteSchema(o: { name: string; url: string; description: string }): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${o.url}/#website`,
    name: o.name,
    url: o.url,
    description: o.description,
    publisher: { "@id": `${o.url}/#organization` },
    inLanguage: ["en", "lt"],
  };
}

export interface OfferInput {
  name: string;
  /** Whole euros. */
  price: number;
  description?: string;
}

export function softwareApplicationSchema(o: { name: string; url: string; description: string; offers: OfferInput[] }): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: o.name,
    url: o.url,
    description: o.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: o.offers.map((f) => ({
      "@type": "Offer",
      name: f.name,
      price: String(f.price),
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${o.url}/pricing`,
      ...(f.description ? { description: f.description } : {}),
    })),
  };
}

export function faqSchema(items: { q: string; a: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

/** Serialises for a <script> tag: "<" is escaped so a value can never close the tag early. */
export function jsonLdString(data: JsonLd | JsonLd[]): string {
  const lineSep = String.fromCharCode(0x2028);
  const paraSep = String.fromCharCode(0x2029);
  return JSON.stringify(data).replaceAll("<", "\\u003c").replaceAll(lineSep, "\\u2028").replaceAll(paraSep, "\\u2029");
}
