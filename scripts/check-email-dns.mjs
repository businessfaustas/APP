/**
 * Checks that a domain is set up so your email lands in the inbox instead of spam: SPF (who may
 * send), DKIM (a signature receivers can verify) and DMARC (what to do with mail that fails).
 *
 *   node scripts/check-email-dns.mjs yourdomain.com [dkim-selector ...]
 *
 * Resend shows your DKIM selector when you add the domain (usually "resend"). Run this after
 * adding the DNS records and waiting a few minutes; changes can take up to an hour to spread.
 */
import { promises as dns } from "node:dns";

const [domain, ...selectors] = process.argv.slice(2);
if (!domain) {
  console.error("usage: node scripts/check-email-dns.mjs yourdomain.com [dkim-selector ...]");
  process.exit(2);
}

const txt = async (name) => {
  try {
    return (await dns.resolveTxt(name)).map((parts) => parts.join(""));
  } catch {
    return [];
  }
};

const results = [];
const add = (ok, name, detail) => results.push({ ok, name, detail });

const spf = (await txt(domain)).filter((r) => r.toLowerCase().startsWith("v=spf1"));
if (spf.length === 0) add(false, "SPF", `No SPF record on ${domain}. Add a TXT record: v=spf1 include:amazonses.com ~all (use the value Resend shows).`);
else if (spf.length > 1) add(false, "SPF", `${spf.length} SPF records found; there must be exactly one. Merge them into one.`);
else {
  const strict = /[-~]all\b/.test(spf[0]);
  add(strict, "SPF", strict ? `OK: ${spf[0]}` : `Found "${spf[0]}" but it doesn't end in ~all or -all, so anyone is allowed to send as you.`);
}

const dmarcRecords = (await txt(`_dmarc.${domain}`)).filter((r) => r.toLowerCase().startsWith("v=dmarc1"));
if (dmarcRecords.length === 0)
  add(
    false,
    "DMARC",
    `No DMARC record. Add a TXT record on _dmarc.${domain}: v=DMARC1; p=none; rua=mailto:dmarc@${domain}; then tighten to p=quarantine once reports look clean.`,
  );
else {
  const policy = dmarcRecords[0].match(/\bp=(\w+)/i)?.[1]?.toLowerCase();
  add(
    true,
    "DMARC",
    `OK (policy ${policy ?? "unknown"}): ${dmarcRecords[0]}${policy === "none" ? "  ← monitoring only; move to quarantine or reject after a few weeks of clean reports" : ""}`,
  );
}

const tried = selectors.length ? selectors : ["resend", "resend2", "default", "google", "selector1", "selector2", "k1"];
const found = [];
for (const s of tried) {
  const recs = (await txt(`${s}._domainkey.${domain}`)).filter((r) => /v=DKIM1|p=/i.test(r));
  let cname = [];
  try {
    cname = await dns.resolveCname(`${s}._domainkey.${domain}`);
  } catch {
    // not a CNAME
  }
  if (recs.length || cname.length) found.push(s);
}
if (found.length === 0)
  add(false, "DKIM", `No DKIM record found for selector(s): ${tried.join(", ")}. Copy the DKIM record from your email provider's domain page.`);
else add(true, "DKIM", `OK: selector ${found.join(", ")} is published.`);

let bad = false;
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}: ${r.detail}`);
  if (!r.ok) bad = true;
}
process.exit(bad ? 1 : 0);
