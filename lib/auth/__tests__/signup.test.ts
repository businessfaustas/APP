import { describe, expect, it } from "vitest";

import {
  authFailure,
  cleanName,
  consentFromMetadata,
  normalizePhone,
  profileFromMetadata,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
  validateSignUp,
} from "../signup";

describe("normalizePhone", () => {
  it("turns typed formats into E.164", () => {
    expect(normalizePhone("+370 600 12345")).toBe("+37060012345");
    expect(normalizePhone("0037060012345")).toBe("+37060012345");
    expect(normalizePhone("(+1) 555-123-4567")).toBe("+15551234567");
    expect(normalizePhone("  +44 20 7946 0958 ")).toBe("+442079460958");
  });

  it("refuses numbers without a country code, and things that are not numbers", () => {
    expect(normalizePhone("8 600 12345")).toBeNull();
    expect(normalizePhone("600 12345")).toBeNull();
    expect(normalizePhone("+0123456789")).toBeNull();
    expect(normalizePhone("+37060")).toBeNull();
    expect(normalizePhone("+3706001234567890")).toBeNull();
    expect(normalizePhone("call me")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone(37060012345)).toBeNull();
  });
});

describe("validators", () => {
  it("names", () => {
    expect(validateName("Jonas Jonaitis")).toBeNull();
    expect(validateName("   ")).toBe("nameRequired");
    expect(validateName("x".repeat(81))).toBe("nameTooLong");
    expect(cleanName("  Jonas \n\t  Jonaitis ")).toBe("Jonas Jonaitis");
    expect(cleanName(42)).toBe("");
  });

  it("email", () => {
    expect(validateEmail("a@b.co")).toBeNull();
    expect(validateEmail(" a@b.co ")).toBeNull();
    expect(validateEmail("a@b")).toBe("emailInvalid");
    expect(validateEmail("a b@c.com")).toBe("emailInvalid");
    expect(validateEmail("")).toBe("emailInvalid");
  });

  it("phone", () => {
    expect(validatePhone("+37060012345")).toBeNull();
    expect(validatePhone("60012345")).toBe("phoneInvalid");
  });

  it("password: 8 to 72 bytes, not the email", () => {
    expect(validatePassword("1234567")).toBe("passwordShort");
    expect(validatePassword("12345678")).toBeNull();
    expect(validatePassword("a".repeat(72))).toBeNull();
    expect(validatePassword("a".repeat(73))).toBe("passwordLong");
    // multi-byte characters count by bytes, as bcrypt does
    expect(validatePassword("š".repeat(37))).toBe("passwordLong");
    expect(validatePassword("jonas@example.com", "Jonas@Example.com")).toBe("passwordSameAsEmail");
  });

  it("reports every problem in a sign-up form at once", () => {
    expect(validateSignUp({ name: "", email: "nope", phone: "123", country: "", password: "short" })).toEqual({
      name: "nameRequired",
      email: "emailInvalid",
      phone: "phoneInvalid",
      country: "countryRequired",
      password: "passwordShort",
    });
    expect(validateSignUp({ name: "Jonas", email: "j@example.com", phone: "+37060012345", country: "LT", password: "correct horse" })).toEqual({});
    expect(validateSignUp({ name: "Jonas", email: "j@example.com", phone: "+37060012345", country: "XX", password: "correct horse" }).country).toBe(
      "countryRequired",
    );
  });
});

describe("profileFromMetadata", () => {
  it("keeps a clean name and a normalized phone", () => {
    expect(profileFromMetadata({ full_name: "  Jonas   Jonaitis ", phone_number: "+370 600 12345", country: " lt " })).toEqual({
      name: "Jonas Jonaitis",
      phone: "+37060012345",
      country: "LT",
    });
  });

  it("drops anything unusable instead of storing it", () => {
    expect(profileFromMetadata({ full_name: "x".repeat(500), phone_number: "<script>" }).phone).toBeNull();
    expect(profileFromMetadata({ full_name: "x".repeat(500) }).name).toHaveLength(80);
    expect(profileFromMetadata({ country: "Lithuania" }).country).toBeNull();
    expect(profileFromMetadata({ country: 7 }).country).toBeNull();
    expect(profileFromMetadata(null)).toEqual({ name: null, phone: null, country: null });
    expect(profileFromMetadata({ full_name: 7, phone_number: {} })).toEqual({ name: null, phone: null, country: null });
  });
});

describe("consentFromMetadata", () => {
  const now = new Date("2026-11-24T12:00:00Z");

  it("needs an explicit tick", () => {
    expect(consentFromMetadata({}, now)).toBeNull();
    expect(consentFromMetadata({ age_confirmed: "yes" }, now)).toBeNull();
    expect(consentFromMetadata(null, now)).toBeNull();
  });

  it("uses the moment they ticked, unless it is missing, unreadable or in the future", () => {
    expect(consentFromMetadata({ age_confirmed: true, consent_at: "2026-11-23T08:00:00Z" }, now)?.toISOString()).toBe("2026-11-23T08:00:00.000Z");
    expect(consentFromMetadata({ age_confirmed: true }, now)).toEqual(now);
    expect(consentFromMetadata({ age_confirmed: true, consent_at: "not a date" }, now)).toEqual(now);
    expect(consentFromMetadata({ age_confirmed: true, consent_at: "2030-01-01T00:00:00Z" }, now)).toEqual(now);
  });
});

describe("authFailure", () => {
  it("recognises Supabase's errors by code or by message", () => {
    expect(authFailure({ code: "invalid_credentials" })).toBe("wrongCredentials");
    expect(authFailure({ message: "Invalid login credentials" })).toBe("wrongCredentials");
    expect(authFailure({ code: "email_not_confirmed" })).toBe("unconfirmed");
    expect(authFailure({ message: "Email not confirmed" })).toBe("unconfirmed");
    expect(authFailure({ code: "over_email_send_rate_limit" })).toBe("rateLimited");
    expect(authFailure({ status: 429 })).toBe("rateLimited");
    expect(authFailure({ code: "weak_password" })).toBe("weakPassword");
    expect(authFailure({ code: "user_already_exists" })).toBe("alreadyRegistered");
    expect(authFailure({ message: "something odd" })).toBe("generic");
  });
});
