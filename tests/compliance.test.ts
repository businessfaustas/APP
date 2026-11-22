import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { analyticsAllowed, consentCookieValue, parseConsent, readCookie } from "@/lib/privacy/consent";
import { ANALYTICS_EVENTS } from "@/lib/privacy/events";

/**
 * Guards for the legal and privacy promises the app makes, so a later change can't quietly
 * break them: no Google-hosted fonts, no session replay, no third-party tracker, consent
 * before analytics.
 */
const ROOT = process.cwd();
function sources(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(join(ROOT, dir))) {
    if (["node_modules", ".next", "generated", "dist"].includes(e)) continue;
    const p = join(dir, e);
    if (statSync(join(ROOT, p)).isDirectory()) sources(p, out);
    else if (/\.(tsx?|css|mjs|json)$/.test(e)) out.push(p);
  }
  return out;
}
const appFiles = ["app", "components", "lib", "proxy.ts", "next.config.ts"].flatMap((d) => (statSync(join(ROOT, d)).isDirectory() ? sources(d) : [d]));
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };

describe("privacy promises", () => {
  it("self-hosts fonts: nothing loads from Google Fonts", () => {
    const offenders = appFiles.filter((f) => /fonts\.(googleapis|gstatic)\.com|next\/font\/google/.test(readFileSync(join(ROOT, f), "utf8")));
    expect(offenders).toEqual([]);
  });

  it("ships no session-replay or ad-tracking library", () => {
    const banned =
      /logrocket|fullstory|hotjar|smartlook|mouseflow|clarity|posthog|@sentry\/replay|rrweb|openreplay|mixpanel|segment|amplitude|google-analytics|gtag|fbq|facebook-pixel|@vercel\/analytics/i;
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.filter((d) => banned.test(d))).toEqual([]);
    // In source, look for the trackers' hosts and import names rather than ordinary words like "segment".
    const hosts =
      /clarity\.ms|hotjar\.com|fullstory\.com|logrocket|posthog|mouseflow|smartlook|googletagmanager|google-analytics|connect\.facebook\.net|segment\.(com|io)|mixpanel\.com|amplitude\.com|rrweb|@sentry\/replay/i;
    const code = appFiles.filter((f) => /\.(tsx?|mjs)$/.test(f) && hosts.test(readFileSync(join(ROOT, f), "utf8")) && !f.endsWith("compliance.test.ts"));
    expect(code).toEqual([]);
  });

  it("only allows scripts from our own origin and Stripe in the content security policy", () => {
    const csp = readFileSync(join(ROOT, "next.config.ts"), "utf8");
    const script = csp.match(/script-src ([^`]*)`/)?.[1] ?? "";
    const hosts = [...script.matchAll(/https?:\/\/[\w.*-]+/g)].map((m) => m[0]);
    expect(hosts).toEqual(["https://js.stripe.com"]);
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("masks text inputs for any recording tool by default", () => {
    expect(readFileSync(join(ROOT, "components/ui/input.tsx"), "utf8").match(/data-private="true"/g)).toHaveLength(2);
  });
});

describe("cookie consent", () => {
  it("analytics stays off until the visitor opts in", () => {
    expect(analyticsAllowed(undefined)).toBe(false);
    expect(analyticsAllowed("theme=dark")).toBe(false);
    expect(analyticsAllowed(`fb_consent=${encodeURIComponent(consentCookieValue("essential"))}`)).toBe(false);
    expect(analyticsAllowed(`a=1; fb_consent=${encodeURIComponent(consentCookieValue("analytics"))}`)).toBe(true);
  });

  it("rejects malformed or tampered consent values", () => {
    expect(parseConsent("v1:analytics")).toBe("analytics");
    expect(parseConsent("v1:essential")).toBe("essential");
    for (const bad of ["", "analytics", "v2:analytics", "v1:analytics;x", "v1:everything", null, undefined]) expect(parseConsent(bad as string)).toBeNull();
    expect(readCookie("a=1; fb_consent=v1%3Aanalytics", "fb_consent")).toBe("v1:analytics");
  });

  it("records only a fixed list of anonymous events", () => {
    expect(ANALYTICS_EVENTS).toContain("page_view");
    expect(ANALYTICS_EVENTS.every((e) => /^[a-z_]+$/.test(e))).toBe(true);
  });
});
