import { legalConfig, type LegalConfig } from "@/lib/config/legal";

export type EmailKind = "essential" | "optional";

export interface EmailFooter {
  text: string;
  /** Headers that let Gmail/Apple Mail show their own one-click unsubscribe button (RFC 8058). */
  headers: Record<string, string>;
}

/**
 * The footer every email carries: who sent it and where they are (a physical address is
 * required by CAN-SPAM and similar laws), and for anything optional a working unsubscribe link.
 * `essential` mail (receipts, payment problems, security) states why you get it instead.
 */
export function buildFooter(opts: { kind: EmailKind; appUrl: string; unsubscribeToken?: string; legal?: LegalConfig }): EmailFooter {
  const legal = opts.legal ?? legalConfig();
  const lines = ["", "—", `${legal.entity}`, legal.address];
  const headers: Record<string, string> = {};
  if (opts.kind === "optional" && opts.unsubscribeToken) {
    const link = `${opts.appUrl}/unsubscribe?t=${encodeURIComponent(opts.unsubscribeToken)}`;
    lines.push("", `Don't want these emails? Unsubscribe: ${link}`);
    headers["List-Unsubscribe"] =
      `<${opts.appUrl}/api/unsubscribe?t=${encodeURIComponent(opts.unsubscribeToken)}>, <mailto:${legal.supportEmail}?subject=unsubscribe>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  } else {
    lines.push("", "You're receiving this because you have a FlagBid account. It's about your account or billing, so it can't be switched off.");
  }
  return { text: lines.join("\n"), headers };
}
