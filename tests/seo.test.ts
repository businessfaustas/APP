import { afterEach, describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { breadcrumbSchema, faqSchema, jsonLdString, organizationSchema, softwareApplicationSchema, websiteSchema } from "@/lib/seo/schema";

const ENV_KEYS = ["VERCEL_ENV", "APP_ENV", "NEXT_PUBLIC_APP_URL"] as const;
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("robots.txt", () => {
  it("lets crawlers and AI answer engines read public pages but not private ones", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://flagbid.example";
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const everyone = rules.find((x) => x.userAgent === "*")!;
    expect(everyone.allow).toBe("/");
    for (const p of ["/app/", "/admin/", "/api/", "/r/"]) expect(everyone.disallow).toContain(p);
    const agents = rules.flatMap((x) => (Array.isArray(x.userAgent) ? x.userAgent : [x.userAgent]));
    expect(agents).toEqual(expect.arrayContaining(["GPTBot", "ClaudeBot", "PerplexityBot"]));
    expect(r.sitemap).toBe("https://flagbid.example/sitemap.xml");
  });

  it("keeps staging and preview deployments out of search entirely", () => {
    process.env.VERCEL_ENV = "preview";
    const r = robots();
    expect(r.rules).toEqual({ userAgent: "*", disallow: "/" });
    expect(r.sitemap).toBeUndefined();
  });
});

describe("sitemap.xml", () => {
  it("lists only public pages, as absolute URLs, and none that robots.txt blocks", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://flagbid.example";
    const entries = sitemap();
    expect(entries.map((e) => e.url)).toEqual(
      expect.arrayContaining(["https://flagbid.example", "https://flagbid.example/pricing", "https://flagbid.example/privacy"]),
    );
    const rules = robots().rules as { userAgent: string; disallow: string[] }[];
    const blocked = rules.find((r) => r.userAgent === "*")!.disallow;
    for (const e of entries) {
      const path = new URL(e.url).pathname;
      expect(
        blocked.some((b) => path.startsWith(b)),
        path,
      ).toBe(false);
      expect(e.lastModified).toBeInstanceOf(Date);
    }
    expect(new Set(entries.map((e) => e.url)).size).toBe(entries.length);
  });
});

describe("structured data", () => {
  const url = "https://flagbid.example";

  it("builds valid Organization, WebSite and SoftwareApplication data", () => {
    const org = organizationSchema({ name: "FlagBid", url, logo: `${url}/logo.png`, email: "help@flagbid.example" });
    expect(org["@type"]).toBe("Organization");
    expect(org).toMatchObject({ name: "FlagBid", url, contactPoint: { email: "help@flagbid.example" } });
    const site = websiteSchema({ name: "FlagBid", url, description: "d" });
    expect(site["@type"]).toBe("WebSite");
    const app = softwareApplicationSchema({ name: "FlagBid", url, description: "d", offers: [{ name: "10 reports", price: 29 }] });
    expect((app.offers as { price: string; priceCurrency: string }[])[0]).toMatchObject({ price: "29", priceCurrency: "EUR", "@type": "Offer" });
  });

  it("builds FAQ and breadcrumb data with the right shape", () => {
    const faq = faqSchema([{ q: "Q1?", a: "A1" }]) as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    expect(faq.mainEntity[0]).toMatchObject({ name: "Q1?", acceptedAnswer: { text: "A1" } });
    const crumbs = breadcrumbSchema([
      { name: "Home", url },
      { name: "Pricing", url: `${url}/pricing` },
    ]) as { itemListElement: { position: number }[] };
    expect(crumbs.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });

  it("can never close the script tag early or carry a raw line separator", () => {
    const out = jsonLdString(faqSchema([{ q: "x</script><script>alert(1)</script>", a: `line${String.fromCharCode(0x2028)}break` }]));
    expect(out).not.toContain("</script>");
    expect(out).not.toContain(String.fromCharCode(0x2028));
    expect(JSON.parse(out).mainEntity[0].name).toContain("script");
  });
});
