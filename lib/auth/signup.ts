/**
 * Checks for the sign-up and sign-in forms. Pure (no I/O) so the browser form and the server use the same rules.
 * They return an i18n key suffix (under `auth.err.*`) instead of a sentence, so each side can translate it.
 */
import { normalizeCountry } from "@/lib/geo/countries";

export type FieldError =
  "nameRequired" | "nameTooLong" | "emailInvalid" | "phoneInvalid" | "countryRequired" | "passwordShort" | "passwordLong" | "passwordSameAsEmail";

export const NAME_MAX = 80;
export const PASSWORD_MIN = 8;
/** bcrypt, which Supabase uses, ignores everything after 72 bytes, so a longer password would be silently cut. */
export const PASSWORD_MAX = 72;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Collapses whitespace and drops control characters. Returns "" for anything that is not a usable name. */
export function cleanName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateName(raw: string): FieldError | null {
  const name = cleanName(raw);
  if (!name) return "nameRequired";
  if (name.length > NAME_MAX) return "nameTooLong";
  return null;
}

export function validateEmail(raw: string): FieldError | null {
  return EMAIL_RE.test(raw.trim()) ? null : "emailInvalid";
}

/**
 * Turns what people type ("+370 600 12345", "0037060012345", "(+1) 555-123-4567") into E.164 ("+37060012345"),
 * or returns null when it can't be a phone number. The country code is required — we don't guess one.
 */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.trim().replace(/[\s().-]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

export function validatePhone(raw: string): FieldError | null {
  return normalizePhone(raw) ? null : "phoneInvalid";
}

export function validateCountry(raw: string): FieldError | null {
  return normalizeCountry(raw) ? null : "countryRequired";
}

export function validatePassword(password: string, email = ""): FieldError | null {
  if (password.length < PASSWORD_MIN) return "passwordShort";
  if (new TextEncoder().encode(password).length > PASSWORD_MAX) return "passwordLong";
  if (email && password.trim().toLowerCase() === email.trim().toLowerCase()) return "passwordSameAsEmail";
  return null;
}

export interface SignUpInput {
  name: string;
  email: string;
  phone: string;
  country: string;
  password: string;
}

/** Every problem with a sign-up form at once, keyed by field. Empty object = good to send. */
export function validateSignUp(input: SignUpInput): Partial<Record<keyof SignUpInput, FieldError>> {
  const errors: Partial<Record<keyof SignUpInput, FieldError>> = {};
  const name = validateName(input.name);
  if (name) errors.name = name;
  const email = validateEmail(input.email);
  if (email) errors.email = email;
  const phone = validatePhone(input.phone);
  if (phone) errors.phone = phone;
  const country = validateCountry(input.country);
  if (country) errors.country = country;
  const password = validatePassword(input.password, input.email);
  if (password) errors.password = password;
  return errors;
}

/** What to keep from the profile Supabase hands back at sign-in: a clean name, a normalized phone and an ISO country, or null for each. */
export function profileFromMetadata(meta: Record<string, unknown> | null | undefined): {
  name: string | null;
  phone: string | null;
  country: string | null;
} {
  const name = cleanName(meta?.full_name).slice(0, NAME_MAX);
  return { name: name || null, phone: normalizePhone(meta?.phone_number), country: normalizeCountry(meta?.country) };
}

/**
 * When they ticked "I am 18 or older and accept the Terms" on the sign-up form, kept with the account so it still
 * counts when the confirmation link is opened on another device (the browser cookie would be missing there).
 * Returns that moment, or null if there is no usable tick.
 */
export function consentFromMetadata(meta: Record<string, unknown> | null | undefined, now: Date = new Date()): Date | null {
  if (meta?.age_confirmed !== true) return null;
  const at = typeof meta.consent_at === "string" ? new Date(meta.consent_at) : null;
  return at && !Number.isNaN(at.getTime()) && at <= now ? at : now;
}

/** Maps a Supabase auth error to one of our messages (`auth.err.*`); anything unfamiliar becomes "generic". */
export type AuthFailure = "wrongCredentials" | "unconfirmed" | "rateLimited" | "weakPassword" | "alreadyRegistered" | "generic";

export function authFailure(error: { code?: string; message?: string; status?: number }): AuthFailure {
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) return "wrongCredentials";
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) return "unconfirmed";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || error.status === 429 || msg.includes("rate limit")) return "rateLimited";
  if (code === "weak_password" || msg.includes("password should")) return "weakPassword";
  if (code === "user_already_exists" || code === "email_exists" || msg.includes("already registered")) return "alreadyRegistered";
  return "generic";
}
