import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

/**
 * The account emails Supabase sends (confirm sign-up, reset password) use the HTML in docs/email-templates, pasted into
 * Supabase's dashboard. Supabase fails to send an email whose template uses a variable it does not know, and Gmail clips
 * messages over about 100 KB and strips anything that is not plain inline HTML, so these are checked here.
 */
const DIR = join(process.cwd(), "docs", "email-templates");
const TEMPLATES = [
  { file: "confirm-signup.html", needs: ["{{ .ConfirmationURL }}", "{{ .Email }}"] },
  { file: "reset-password.html", needs: ["{{ .ConfirmationURL }}", "{{ .Email }}"] },
] as const;
const KNOWN_VARIABLES = new Set(["{{ .ConfirmationURL }}", "{{ .SiteURL }}", "{{ .Email }}"]);

describe.each(TEMPLATES)("email template $file", ({ file, needs }) => {
  const html = readFileSync(join(DIR, file), "utf8");

  it("only uses variables Supabase provides, written the way it expects", () => {
    const used = html.match(/\{\{[^}]*\}\}/g) ?? [];
    expect(used.length).toBeGreaterThan(0);
    for (const v of used) expect(KNOWN_VARIABLES.has(v), `${v} in ${file}`).toBe(true);
    for (const v of needs) expect(html, `${v} missing`).toContain(v);
    expect(html).not.toMatch(/\{\{\s*(if|range|with|template|define)\b/); // no logic: a missing value would stop the email being sent
  });

  it("is plain inline HTML that mail apps keep: no scripts, forms, external CSS, web fonts or background images", () => {
    expect(html).not.toMatch(/<script|<form|<iframe|<link|<style|@import|@font-face|url\(/i);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i); // no inline event handlers
  });

  it("is small enough for Gmail not to clip it", () => {
    expect(statSync(join(DIR, file)).size).toBeLessThan(40_000);
  });

  it("every image is on our own site, has a size and alt text, and the button is an ordinary link", () => {
    const images = html.match(/<img\b[^>]*>/g) ?? [];
    expect(images.length).toBe(1);
    for (const img of images) {
      expect(img).toMatch(/src="\{\{ \.SiteURL \}\}\/email\/[a-z-]+\.png"/);
      expect(img).toMatch(/\balt="[^"]+"/);
      expect(img).toMatch(/\bwidth="\d+"/);
    }
    expect(html).toMatch(/<a\s+href="\{\{ \.ConfirmationURL \}\}"/);
  });

  it("has the preview text, a page title, and both languages", () => {
    expect(html).toMatch(/display:\s*none[^>]*>\s*\S/);
    expect(html).toMatch(/<title>[^<]*FlagBid/);
    expect(html).toMatch(/lang="en"/);
    expect(html).toMatch(/[ąčęėįšųūž]/i); // the Lithuanian half
  });

  it("links the page's own legal pages through the site address", () => {
    expect(html).toContain('href="{{ .SiteURL }}/privacy"');
    expect(html).toContain('href="{{ .SiteURL }}/terms"');
  });
});

describe("email logo", () => {
  it("exists as a transparent PNG at 2x of the size the templates display it", async () => {
    const file = join(process.cwd(), "public", "email", "flagbid-logo.png");
    expect(existsSync(file)).toBe(true);
    const meta = await sharp(readFileSync(file)).metadata();
    expect(meta.format).toBe("png");
    expect(meta.hasAlpha).toBe(true);
    expect(meta.width).toBeGreaterThanOrEqual(280); // the templates show it 140 wide
    expect(meta.width! / meta.height!).toBeCloseTo(3.145, 1);
  });
});
