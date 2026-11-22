/**
 * Looks for secrets that should never be in the repository: API keys, tokens, private keys and
 * database URLs with real passwords. Scans every tracked file, and with --history every line
 * ever committed (a key deleted in a later commit is still in git history and still leaked).
 *
 *   node scripts/secret-scan.mjs             tracked files
 *   node scripts/secret-scan.mjs --history   plus the whole git history
 *
 * Exit code 1 means something was found: rotate that key first, then clean up.
 * Placeholders such as sk_test_x, postgres:postgres@localhost and your-key-here are ignored.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const RULES = [
  ["Stripe live secret key", /\b(sk|rk)_live_[A-Za-z0-9]{16,}/],
  ["Stripe test secret key", /\b(sk|rk)_test_[A-Za-z0-9]{20,}/],
  ["Stripe webhook secret", /\bwhsec_[A-Za-z0-9]{24,}/],
  ["Anthropic API key", /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ["OpenAI API key", /\bsk-(proj-)?[A-Za-z0-9_-]{40,}/],
  ["Resend API key", /\bre_[A-Za-z0-9]{24,}/],
  ["AWS access key id", /\bAKIA[0-9A-Z]{16}\b/],
  ["GitHub token", /\b(ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{30,}/],
  ["Slack webhook", /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/],
  ["Discord webhook", /https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]{30,}/],
  ["Private key block", /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/],
  ["Supabase service-role JWT", /\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/],
  ["Sentry DSN with key", /https:\/\/[a-f0-9]{32}@[\w.-]+\.ingest\.[\w.]*sentry\.io\/\d+/],
  ["ScrapingBee-style key assignment", /SCRAPINGBEE_API_KEY\s*[=:]\s*["']?[A-Z0-9]{60,}/],
  [
    "Database URL with a password",
    /postgres(?:ql)?:\/\/[^:\s/@]+:(?!postgres@|password@|pass@|\[|<|\$|\{|your|changeme|x@)[^@\s/]{6,}@(?!localhost|127\.0\.0\.1|host\b|example)/,
  ],
];
const IGNORE_LINE = /(your[-_ ]?(key|token|secret)|placeholder|example|xxxx|<[^>]+>|\.\.\.|test-key|unit)/i;
const SKIP_FILES = /(^|\/)(pnpm-lock\.yaml|.*\.(png|jpe?g|webp|ico|gif|woff2?|ttf|pdf|dump|gpg))$/i;

const findings = [];
function scan(text, where) {
  text.split("\n").forEach((line, i) => {
    if (line.length > 2000 || IGNORE_LINE.test(line)) return;
    for (const [name, re] of RULES) if (re.test(line)) findings.push(`${where}:${i + 1}  ${name}`);
  });
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });

for (const f of git("ls-files").split("\n").filter(Boolean)) {
  if (SKIP_FILES.test(f)) continue;
  try {
    scan(readFileSync(f, "utf8"), f);
  } catch {
    // binary or unreadable
  }
}

// A committed .env file is a finding by itself, whatever it contains.
for (const f of git("ls-files").split("\n"))
  if (/(^|\/)\.env(\.[\w-]+)?$/.test(f) && !/\.example$/.test(f)) findings.push(`${f}  environment file is tracked by git`);

if (process.argv.includes("--history")) {
  const log = git("log", "--all", "-p", "--no-color", "--unified=0", "--format=commit %h");
  let commit = "?";
  let file = "?";
  for (const line of log.split("\n")) {
    if (line.startsWith("commit ")) commit = line.slice(7);
    else if (line.startsWith("+++ b/")) file = line.slice(6);
    else if (line.startsWith("+") && !line.startsWith("+++") && !SKIP_FILES.test(file) && line.length < 2000 && !IGNORE_LINE.test(line)) {
      for (const [name, re] of RULES) if (re.test(line)) findings.push(`history ${commit}:${file}  ${name}`);
    }
  }
}

if (findings.length) {
  console.error(
    `secret-scan: ${findings.length} possible secret(s):\n  ${[...new Set(findings)].join("\n  ")}\nRotate the key at its provider first, then remove it from the code (and history if needed).`,
  );
  process.exit(1);
}
console.log(`secret-scan: clean (${process.argv.includes("--history") ? "tracked files and full history" : "tracked files"}).`);
