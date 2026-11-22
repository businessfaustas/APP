import { describe, expect, it } from "vitest";

import { legalConfig } from "@/lib/config/legal";
import { signToken, verifyToken } from "@/lib/security/tokens";

import { buildFooter } from "../footer";

const legal = legalConfig({ LEGAL_ENTITY: "Acme Autos LLC", LEGAL_ADDRESS: "1 Main St, Houston, TX 77002, USA", SUPPORT_EMAIL: "help@acme.test" });

describe("email footer", () => {
  it("puts the sender's name, postal address and an unsubscribe link in optional mail", () => {
    const f = buildFooter({ kind: "optional", appUrl: "https://app.test", unsubscribeToken: "tok", legal });
    expect(f.text).toContain("Acme Autos LLC");
    expect(f.text).toContain("1 Main St, Houston, TX 77002, USA");
    expect(f.text).toContain("https://app.test/unsubscribe?t=tok");
    expect(f.headers["List-Unsubscribe"]).toContain("https://app.test/api/unsubscribe?t=tok");
    expect(f.headers["List-Unsubscribe"]).toContain("mailto:help@acme.test");
    expect(f.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("still carries the address in essential mail, which cannot be unsubscribed from", () => {
    const f = buildFooter({ kind: "essential", appUrl: "https://app.test", unsubscribeToken: "tok", legal });
    expect(f.text).toContain("1 Main St, Houston, TX 77002, USA");
    expect(f.text).not.toContain("/unsubscribe");
    expect(f.headers["List-Unsubscribe"]).toBeUndefined();
  });

  it("says so while the operator details are still placeholders", () => {
    expect(legalConfig({}).isPlaceholder).toBe(true);
    expect(legal.isPlaceholder).toBe(false);
  });
});

describe("signed links", () => {
  it("round-trips, and rejects forged or tampered tokens", () => {
    const t = signToken("unsubscribe", "user-1");
    expect(verifyToken("unsubscribe", t)).toBe("user-1");
    expect(verifyToken("other-purpose", t)).toBeNull();
    expect(verifyToken("unsubscribe", `${Buffer.from("user-2").toString("base64url")}.${t.split(".")[1]}`)).toBeNull();
    expect(verifyToken("unsubscribe", "garbage")).toBeNull();
    expect(verifyToken("unsubscribe", null)).toBeNull();
  });
});
