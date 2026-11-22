/**
 * Dependency audit gate for CI. Fails on any known vulnerability of high or critical severity in
 * production dependencies, except advisories listed in scripts/audit-allowlist.json. Every
 * allowlist entry needs a reason and a review-by date, so an accepted risk can't be forgotten:
 * once the date passes, the build fails again until someone looks.
 *
 *   node scripts/audit-gate.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const allow = JSON.parse(readFileSync(new URL("./audit-allowlist.json", import.meta.url), "utf8"));
let raw;
try {
  raw = execFileSync("pnpm", ["audit", "--prod", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
} catch (err) {
  raw = err.stdout?.toString() ?? ""; // pnpm audit exits non-zero when it finds something
}
let report;
try {
  report = JSON.parse(raw);
} catch {
  console.error("audit-gate: could not read the audit report (is the registry reachable?).");
  process.exit(2);
}

const today = new Date().toISOString().slice(0, 10);
const blocking = [];
const accepted = [];
for (const a of Object.values(report.advisories ?? {})) {
  if (a.severity !== "high" && a.severity !== "critical") continue;
  const entry = allow.find((x) => x.ghsa === a.github_advisory_id);
  if (entry && entry.reviewBy >= today)
    accepted.push(`${a.severity} ${a.module_name} (${a.github_advisory_id}), accepted until ${entry.reviewBy}: ${entry.reason}`);
  else
    blocking.push(
      `${a.severity} ${a.module_name} ${a.vulnerable_versions} → fix ${a.patched_versions}: ${a.title}${entry ? ` (allowlist entry expired ${entry.reviewBy})` : ""}\n    ${a.url}`,
    );
}
const counts = report.metadata?.vulnerabilities ?? {};
console.log(`audit-gate: ${JSON.stringify(counts)}`);
for (const line of accepted) console.log(`  accepted: ${line}`);
if (blocking.length) {
  console.error(`audit-gate: ${blocking.length} blocking advisory(ies):\n  ${blocking.join("\n  ")}`);
  process.exit(1);
}
console.log("audit-gate: passed (no unaccepted high or critical advisories).");
