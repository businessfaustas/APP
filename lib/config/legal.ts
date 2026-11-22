/**
 * Who operates this deployment, for the legal pages, emails and the DMCA notice. Set these in the
 * environment before launch: the defaults are placeholders and the app says so (isPlaceholder).
 * Pure (no server-only) so the emails, pages and tests can all read it.
 */
type EnvLike = Record<string, string | undefined>;

export interface LegalConfig {
  entity: string;
  address: string;
  supportEmail: string;
  dmcaAgentName: string;
  dmcaAgentEmail: string;
  dmcaAgentAddress: string;
  dmcaRegistrationNumber: string | null;
  /** Version stamp stored with each acceptance; bump when the Terms or Privacy Policy change materially. */
  termsVersion: string;
  /** True until a real company name and postal address are configured. */
  isPlaceholder: boolean;
}

export const TERMS_VERSION = "2026-11-22";

export function legalConfig(e: EnvLike = process.env): LegalConfig {
  const entity = e.LEGAL_ENTITY?.trim();
  const address = e.LEGAL_ADDRESS?.trim();
  const supportEmail = e.SUPPORT_EMAIL?.trim() || "support@example.com";
  return {
    entity: entity || "FlagBid (operator to be named)",
    address: address || "Postal address to be added before launch",
    supportEmail,
    dmcaAgentName: e.DMCA_AGENT_NAME?.trim() || entity || "Designated Agent",
    dmcaAgentEmail: e.DMCA_AGENT_EMAIL?.trim() || supportEmail,
    dmcaAgentAddress: e.DMCA_AGENT_ADDRESS?.trim() || address || "Postal address to be added before launch",
    dmcaRegistrationNumber: e.DMCA_REGISTRATION_NUMBER?.trim() || null,
    termsVersion: TERMS_VERSION,
    isPlaceholder: !(entity && address),
  };
}
