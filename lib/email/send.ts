import "server-only";

import { env, features } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { log } from "@/lib/observability/log";
import { signToken } from "@/lib/security/tokens";

import { buildFooter, type EmailKind } from "./footer";

/**
 * Sends one email through Resend with the compliance footer. `optional` mail (reminders,
 * product news) is skipped for people who unsubscribed. Returns whether it was sent.
 */
export async function sendEmail(opts: { userId: string; to: string; subject: string; text: string; kind: EmailKind }): Promise<boolean> {
  if (!features.email()) return false;
  if (opts.kind === "optional") {
    const u = await prisma.user.findUnique({ where: { id: opts.userId }, select: { emailOptOut: true } });
    if (!u || u.emailOptOut) return false;
  }
  const footer = buildFooter({ kind: opts.kind, appUrl: env().NEXT_PUBLIC_APP_URL, unsubscribeToken: signToken("unsubscribe", opts.userId) });
  try {
    const { Resend } = await import("resend");
    const { error } = await new Resend(env().RESEND_API_KEY).emails.send({
      from: env().EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      text: `${opts.text}\n${footer.text}`,
      headers: footer.headers,
    });
    if (error) throw new Error(error.message);
    return true;
  } catch (err) {
    log.error("email.failed", { subject: opts.subject, err });
    throw err;
  }
}
