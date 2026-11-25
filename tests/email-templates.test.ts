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

  it("is small enough for Gmail not to clip it (it cuts messages off at about 100 KB)", () => {
    expect(statSync(join(DIR, file)).size).toBeLessThan(60_000);
  });

  it("every picture is a file we host in public/email, with a size and an alt attribute", () => {
    const images = html.match(/<img\b[^>]*>/g) ?? [];
    expect(images.length).toBeGreaterThan(0);
    for (const img of images) {
      // A full address, not {{ .SiteURL }}: Supabase's own preview does not fill variables in, and the pictures would look broken there.
      const name = img.match(/src="https:\/\/[a-z0-9.-]+\/email\/([a-z0-9-]+\.(?:png|jpg))"/)?.[1];
      expect(name, img).toBeTruthy();
      expect(existsSync(join(process.cwd(), "public", "email", name!)), `public/email/${name} is missing`).toBe(true);
      expect(img).toMatch(/\balt="[^"]*"/); // empty is fine for a decorative icon, but the attribute must be there
      expect(img).toMatch(/\bwidth="\d+"/);
    }
  });

  it("every picture is stored at least twice as wide as it is shown, so it stays sharp on phones", async () => {
    for (const img of html.match(/<img\b[^>]*>/g) ?? []) {
      const name = img.match(/\/email\/([a-z0-9-]+\.(?:png|jpg))"/)![1]!;
      const shown = Number(img.match(/\bwidth="(\d+)"/)![1]);
      const stored = (await sharp(readFileSync(join(process.cwd(), "public", "email", name))).metadata()).width!;
      expect(stored, `${name} is ${stored}px wide but shown at ${shown}px`).toBeGreaterThanOrEqual(shown * 2);
    }
  });

  it("the main button is an ordinary link to the confirmation address, and every other link stays on our own site", () => {
    expect(html).toMatch(/<a\s+href="\{\{ \.ConfirmationURL \}\}"/);
    const links = [...html.matchAll(/\bhref="([^"]*)"/g)].map((m) => m[1]!);
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) expect(href === "{{ .ConfirmationURL }}" || href.startsWith("{{ .SiteURL }}"), `unexpected link: ${href}`).toBe(true);
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

describe("all the emails", () => {
  it("load their pictures from one address, so moving to a new domain is one find-and-replace", () => {
    const hosts = new Set(
      TEMPLATES.flatMap(({ file }) => [...readFileSync(join(DIR, file), "utf8").matchAll(/src="(https:\/\/[a-z0-9.-]+)\/email\//g)].map((m) => m[1]!)),
    );
    expect([...hosts]).toHaveLength(1);
  });
});

describe("email pictures", () => {
  it("the hero ends in a flat strip of the colour the button's cell uses, so the two join seamlessly", async () => {
    const { data, info } = await sharp(readFileSync(join(process.cwd(), "public", "email", "hero.jpg")))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const html = readFileSync(join(DIR, "confirm-signup.html"), "utf8");
    const cell = html.match(/<td[^>]*bgcolor="(#[0-9a-f]{6})"[^>]*>\s*<table[^>]*>\s*<tr>\s*<td[^>]*bgcolor="#13141c"/i)?.[1];
    expect(cell, "the button's cell colour").toBeTruthy();
    const want = [1, 3, 5].map((i) => parseInt(cell!.slice(i, i + 2), 16));
    const y = info.height - 4;
    for (let x = 0; x < info.width; x += 97) {
      const at = (y * info.width + x) * info.channels;
      for (let c = 0; c < 3; c++) expect(Math.abs(data[at + c]! - want[c]!), `pixel ${x},${y} channel ${c}`).toBeLessThanOrEqual(3);
    }
  });

  it("the logo exists as a transparent PNG at 2x of the size the templates display it", async () => {
    const file = join(process.cwd(), "public", "email", "flagbid-logo.png");
    expect(existsSync(file)).toBe(true);
    const meta = await sharp(readFileSync(file)).metadata();
    expect(meta.format).toBe("png");
    expect(meta.hasAlpha).toBe(true);
    expect(meta.width).toBeGreaterThanOrEqual(280); // the templates show it 140 wide
    expect(meta.width! / meta.height!).toBeCloseTo(3.145, 1);
  });
});
