import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed, non-expiring tokens for one-click links in emails (unsubscribe). The key is APP_SECRET
 * when set; otherwise it is derived from the database URL, which only this deployment knows, so
 * links work with zero configuration. Set APP_SECRET in production so rotating the database
 * password does not invalidate links already sent.
 */
function secret(): string {
  return (
    process.env.APP_SECRET?.trim() ||
    createHash("sha256")
      .update(`flagbid-links:${process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "dev"}`)
      .digest("hex")
  );
}

function mac(purpose: string, subject: string): string {
  return createHmac("sha256", secret()).update(`${purpose}:${subject}`).digest("base64url");
}

export function signToken(purpose: string, subject: string): string {
  return `${Buffer.from(subject).toString("base64url")}.${mac(purpose, subject)}`;
}

/** The subject the token was issued for, or null when it is malformed or forged. */
export function verifyToken(purpose: string, token: string | null | undefined): string | null {
  if (!token) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const subject = Buffer.from(encoded, "base64url").toString();
  const expected = mac(purpose, subject);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? subject : null;
}
